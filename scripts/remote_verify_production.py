from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_env_text(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


workspace = Path(__file__).resolve().parents[1]
config = load_env_text((workspace / ".env.local").read_text(encoding="utf-8"))
required = ("DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PASSWORD", "DEPLOY_PORT")
missing = [key for key in required if not config.get(key)]
if missing:
    raise RuntimeError(f"缺少部署配置键: {', '.join(missing)}")

root = "/opt/xinmaowei"
compose = "docker compose --env-file .env -f compose.yaml -f compose.prod.yaml"
prefix = f"cd {root} &&"

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


def run(command: str, label: str, timeout: int = 1200) -> str:
    print(f"[remote] {label}")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    output = stdout.read().decode("utf-8", errors="replace").strip()
    error = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    if output:
        print(output)
    if status != 0:
        raise RuntimeError(f"{label} 失败 ({status}): {error[-4000:]}")
    return output


try:
    sftp = client.open_sftp()
    try:
        with sftp.file(f"{root}/admin-bootstrap.secret", "r") as secret_file:
            bootstrap = load_env_text(secret_file.read().decode("utf-8"))
    finally:
        sftp.close()
    if not bootstrap.get("ADMIN_EMAIL") or not bootstrap.get("ADMIN_PASSWORD"):
        raise RuntimeError("管理员引导凭据文件不完整")

    run(f"{prefix} {compose} ps", "确认生产容器健康")
    counts = run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -Nse "SELECT (SELECT COUNT(*) FROM Product), (SELECT COUNT(*) FROM Solution), (SELECT COUNT(*) FROM Document);"\'',
        "确认生产无演示业务数据",
    )
    if counts.split() != ["0", "0", "0"]:
        raise RuntimeError(f"生产初始化数据不为空: {counts}")
    storage = run(
        f"{prefix} {compose} run --rm --no-deps storage-init node dist/storage-empty-check.js",
        "确认生产 S3 业务对象为空",
    )
    if "S3_BUSINESS_OBJECTS=0" not in storage:
        raise RuntimeError("生产 S3 非空")

    base_url = f"http://{config['DEPLOY_HOST']}:8082"
    with urllib.request.urlopen(f"{base_url}/api/v1/health", timeout=10) as response:
        health = json.loads(response.read().decode("utf-8"))
    if health.get("code") != 0:
        raise RuntimeError("生产外部健康检查失败")
    login_request = urllib.request.Request(
        f"{base_url}/api/v1/iam/login",
        data=json.dumps(
            {"email": bootstrap["ADMIN_EMAIL"], "password": bootstrap["ADMIN_PASSWORD"]}
        ).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login_request, timeout=10) as response:
        login = json.loads(response.read().decode("utf-8"))
    if login.get("code") != 0 or not login.get("data", {}).get("accessToken"):
        raise RuntimeError("生产管理员登录验证失败")

    restored = run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xinmaowei_restore_verify -Nse "SELECT (SELECT COUNT(*) FROM Subject), (SELECT COUNT(*) FROM Role), (SELECT COUNT(*) FROM ConfigurationVersion), (SELECT COUNT(*) FROM Product), (SELECT COUNT(*) FROM Solution), (SELECT COUNT(*) FROM Document);"\'',
        "核对生产恢复结果",
    ).split()
    if len(restored) != 6 or min(map(int, restored[:3])) < 1 or restored[3:] != ["0", "0", "0"]:
        raise RuntimeError(f"生产恢复核对失败: {restored}")

    run(
        "docker image rm xinmaowei-nginx xinmaowei-worker xinmaowei-api xinmaowei-init-admin "
        "xinmaowei-migrate minio/minio:latest pgvector/pgvector:pg16 "
        "xinmaowei-stage0-runner:poc-v1 xinmaowei-stage0-runner:local "
        "quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z >/dev/null 2>&1 || true",
        "清理旧生产和 POC 镜像",
    )
    legacy = run(
        "test ! -e /opt/xinmaowei-rebuild-validation && "
        "test ! -e /opt/xinmaowei-stage0-poc && "
        "test -z \"$(docker ps -a --format '{{.Names}}' | grep -E '^(xm-|xinmaowei-stage0-poc-|xinmaowei-design-in-validation)' || true)\" && "
        "test -z \"$(ss -ltnH | awk '{print $4}' | grep -E ':(18082|4180|3307|9000|3001)$' || true)\" && "
        "echo LEGACY_RUNTIME=ABSENT",
        "确认旧部署目录、容器和端口均已清理",
    )
    if "LEGACY_RUNTIME=ABSENT" not in legacy:
        raise RuntimeError("旧部署资产仍然存在")

    print("PRODUCTION_DEPLOYMENT=PASSED")
    print("PRODUCTION_EMPTY_INITIALIZATION=PASSED")
    print("PRODUCTION_ADMIN_LOGIN=PASSED")
    print("PRODUCTION_BACKUP_RESTORE=PASSED")
    print("PRODUCTION_OLD_ASSETS_CLEANED=PASSED")
    print("ADMIN_BOOTSTRAP_FILE=/opt/xinmaowei/admin-bootstrap.secret")
finally:
    client.close()
