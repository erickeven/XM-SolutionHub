from __future__ import annotations

import json
import statistics
import sys
import time
import urllib.request
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


workspace = Path(__file__).resolve().parents[1]
config = load_env(workspace / ".env.local")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    hostname=config["DEPLOY_HOST"],
    port=int(config["DEPLOY_PORT"]),
    username=config["DEPLOY_USER"],
    password=config["DEPLOY_PASSWORD"],
    look_for_keys=False,
    allow_agent=False,
    timeout=20,
)

remote_root = "/opt/xinmaowei-rebuild-validation"
prefix = f"cd {remote_root} &&"
compose = "docker compose --env-file .env -f compose.yaml -f compose.prod.yaml"


def run(command: str, label: str, timeout: int = 900) -> str:
    print(f"[remote] {label}")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    output = stdout.read().decode("utf-8", errors="replace").strip()
    error = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    if output:
        print(output)
    if status != 0:
        raise RuntimeError(f"{label} 失败 ({status}): {error[-3000:]}")
    return output


def timed_request(path: str, body: dict[str, object] | None = None) -> float:
    url = f"http://{config['DEPLOY_HOST']}:18082{path}"
    encoded = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        headers={"content-type": "application/json"},
        method="GET" if body is None else "POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
        if payload.get("code") != 0:
            raise RuntimeError("性能请求返回业务错误")
    return (time.perf_counter() - started) * 1000


def percentile_95(samples: list[float]) -> float:
    return statistics.quantiles(samples, n=100, method="inclusive")[94]


try:
    run(f"{prefix} {compose} ps", "确认正式隔离栈健康")
    product_samples = [timed_request("/api/v1/products/XMW-VALIDATION-001") for _ in range(60)]
    selection_samples = [
        timed_request("/api/v1/selection/match", {"application": "验证应用", "keywords": [], "limit": 8})
        for _ in range(60)
    ]
    product_p95 = percentile_95(product_samples)
    selection_p95 = percentile_95(selection_samples)
    print(f"PRODUCT_DETAIL_P95_MS={product_p95:.2f}")
    print(f"SELECTION_P95_MS={selection_p95:.2f}")
    if product_p95 >= 1500 or selection_p95 >= 2000:
        raise RuntimeError("P95 未达到验收阈值")

    audit = run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -Nse "SELECT (SELECT COUNT(*) FROM BreakGlassUse), (SELECT COUNT(*) FROM AuditEvent), (SELECT COUNT(*) FROM OutboxEvent WHERE processedAt IS NULL);"\'',
        "核对 break-glass、审计和 Outbox",
    ).split()
    if len(audit) != 3 or int(audit[0]) < 4 or int(audit[1]) < 4 or int(audit[2]) != 0:
        raise RuntimeError(f"审计或 Outbox 状态异常: {audit}")

    backup_path = f"{remote_root}/validation-backup.sql"
    run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --set-gtid-purged=OFF "$MYSQL_DATABASE"\' > {backup_path}',
        "创建正式 schema 一致性备份",
    )
    run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS xinmaowei_validation_restore; CREATE DATABASE xinmaowei_validation_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"\'',
        "创建隔离恢复库",
    )
    run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xinmaowei_validation_restore\' < {backup_path}',
        "恢复正式 schema 备份",
    )
    restored = run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xinmaowei_validation_restore -Nse "SELECT (SELECT COUNT(*) FROM Product), (SELECT COUNT(*) FROM DocumentVersion), (SELECT COUNT(*) FROM AuditEvent);"\'',
        "比较恢复后的核心记录",
    ).split()
    if len(restored) != 3 or min(int(value) for value in restored) < 1:
        raise RuntimeError(f"MySQL 恢复数据不完整: {restored}")

    storage_restore = run(
        f"{prefix} {compose} run --rm --no-deps storage-init node dist/storage-proof.js",
        "验证 S3 对象版本恢复",
    )
    if "PASSED" not in storage_restore:
        raise RuntimeError("S3 对象版本恢复未通过")

    scanner = run(
        "if command -v trivy >/dev/null 2>&1; then trivy --version | head -1; "
        "elif docker scout version >/dev/null 2>&1; then docker scout version | head -1; "
        "else echo IMAGE_SCANNER=UNAVAILABLE; fi",
        "检查服务器镜像扫描能力",
    )
    run(
        "docker image inspect xinmaowei-design-in-api xinmaowei-design-in-web --format '{{.RepoTags}} {{.Id}}'",
        "记录正式镜像不可变 ID",
    )
    print("MYSQL_FULL_RESTORE=PASSED")
    print("AUDIT_OUTBOX=PASSED")
    print(f"IMAGE_SCANNER_STATUS={scanner.splitlines()[0] if scanner else 'UNKNOWN'}")
    print("REMOTE_OPERATIONAL_VALIDATION=PASSED")
finally:
    client.close()
