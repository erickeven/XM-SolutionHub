from __future__ import annotations

import json
import secrets
import stat
import sys
import time
import urllib.request
from pathlib import Path, PurePosixPath

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
required = ("DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PASSWORD", "DEPLOY_PORT")
missing = [key for key in required if not config.get(key)]
if missing:
    raise RuntimeError(f"缺少部署配置键: {', '.join(missing)}")

production_root = PurePosixPath("/opt/xinmaowei")
staging_root = PurePosixPath("/opt/xinmaowei-rebuild-staging")
validation_root = PurePosixPath("/opt/xinmaowei-rebuild-validation")
poc_root = PurePosixPath("/opt/xinmaowei-stage0-poc")
mysql_root_password = secrets.token_hex(24)
mysql_password = secrets.token_hex(24)
s3_access_key = f"production-{secrets.token_hex(8)}"
s3_secret_key = secrets.token_hex(24)
access_token_secret = secrets.token_hex(32)
file_token_secret = secrets.token_hex(32)
admin_email = "admin@xinmaowei.local"
admin_password = secrets.token_urlsafe(32)
remote_env = "\n".join(
    (
        "NODE_ENV=production",
        "APP_PORT=8082",
        "MYSQL_DATABASE=xinmaowei",
        "MYSQL_USER=xinmaowei",
        f"MYSQL_PASSWORD={mysql_password}",
        f"MYSQL_ROOT_PASSWORD={mysql_root_password}",
        f"DATABASE_URL=mysql://xinmaowei:{mysql_password}@mysql:3306/xinmaowei",
        f"S3_ACCESS_KEY={s3_access_key}",
        f"S3_SECRET_KEY={s3_secret_key}",
        "S3_BUCKET=xinmaowei-files",
        f"ACCESS_TOKEN_SECRET={access_token_secret}",
        f"FILE_TOKEN_SECRET={file_token_secret}",
        f"ADMIN_EMAIL={admin_email}",
        f"ADMIN_PASSWORD={admin_password}",
        "",
    )
)
bootstrap_secret = f"ADMIN_EMAIL={admin_email}\nADMIN_PASSWORD={admin_password}\n"

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


def should_upload(path: Path) -> bool:
    relative = path.relative_to(workspace)
    excluded_parts = {".git", ".codex", ".playwright-cli", "node_modules", "dist", "coverage", "output"}
    return not any(part in excluded_parts for part in relative.parts) and path.name != ".env.local"


try:
    run(
        f"test \"$(readlink -m {staging_root})\" = \"{staging_root}\" && "
        f"rm -rf {staging_root} && install -d -m 700 {staging_root}",
        "创建已校验的生产暂存目录",
    )
    sftp = client.open_sftp()
    try:
        for local_path in workspace.rglob("*"):
            if not local_path.is_file() or not should_upload(local_path):
                continue
            relative = local_path.relative_to(workspace)
            remote_path = staging_root.joinpath(*relative.parts)
            current = staging_root
            for part in relative.parts[:-1]:
                current /= part
                try:
                    sftp.stat(str(current))
                except FileNotFoundError:
                    sftp.mkdir(str(current), mode=0o700)
            sftp.put(str(local_path), str(remote_path))
        with sftp.file(str(staging_root / ".env"), "w") as env_file:
            env_file.write(remote_env)
        sftp.chmod(str(staging_root / ".env"), stat.S_IRUSR | stat.S_IWUSR)
        with sftp.file(str(staging_root / "admin-bootstrap.secret"), "w") as secret_file:
            secret_file.write(bootstrap_secret)
        sftp.chmod(str(staging_root / "admin-bootstrap.secret"), stat.S_IRUSR | stat.S_IWUSR)
    finally:
        sftp.close()

    run(
        f"cd {staging_root} && docker compose --env-file .env -f compose.yaml -f compose.prod.yaml config --quiet",
        "校验生产 Compose",
    )
    run(
        f"if [ -f {validation_root}/compose.yaml ]; then cd {validation_root} && "
        "docker compose --env-file .env -f compose.yaml -f compose.prod.yaml down -v --remove-orphans || true; fi; "
        f"if [ -f {poc_root}/compose.yaml ]; then cd {poc_root} && "
        "docker compose --env-file .env down -v --remove-orphans || true; fi; "
        f"if [ -f {production_root}/docker-compose.yml ]; then cd {production_root} && "
        "docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml down -v --remove-orphans || true; fi; "
        "docker rm -f xm-nginx xm-worker xm-api xm-minio xm-postgres xm-redis "
        "xinmaowei-init-admin-1 xinmaowei-migrate-1 >/dev/null 2>&1 || true; "
        "docker ps -aq --filter 'name=^/xinmaowei-stage0-poc-' | xargs -r docker rm -f >/dev/null; "
        "docker ps -aq --filter 'name=^/xinmaowei-design-in-' | xargs -r docker rm -f >/dev/null",
        "停止并移除旧生产、验证和 POC 容器",
    )
    run(
        "for project in xinmaowei xinmaowei-stage0-poc xinmaowei-design-in; do "
        "docker volume ls -q --filter label=com.docker.compose.project=$project | xargs -r docker volume rm -f >/dev/null; "
        "done",
        "删除旧数据库与对象存储卷",
    )
    run(
        f"for path in {production_root} {validation_root} {poc_root}; do "
        "test \"$(readlink -m $path)\" = \"$path\" || exit 91; rm -rf \"$path\"; done; "
        f"test \"$(readlink -m {staging_root})\" = \"{staging_root}\" && mv {staging_root} {production_root}",
        "删除旧部署目录并切换全新代码",
    )

    prefix = f"cd {production_root} &&"
    compose = "docker compose --env-file .env -f compose.yaml -f compose.prod.yaml"
    run(f"{prefix} {compose} build", "构建生产镜像", 2400)
    run(f"{prefix} {compose} up -d --wait --wait-timeout 600", "迁移、管理员初始化并启动生产", 1200)
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
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"{base_url}/api/v1/health", timeout=5) as response:
                health = json.loads(response.read().decode("utf-8"))
            if health.get("code") == 0:
                break
        except Exception:
            time.sleep(2)
    else:
        raise RuntimeError("生产外部健康检查失败")
    login_request = urllib.request.Request(
        f"{base_url}/api/v1/iam/login",
        data=json.dumps({"email": admin_email, "password": admin_password}).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login_request, timeout=10) as response:
        login = json.loads(response.read().decode("utf-8"))
    if login.get("code") != 0 or not login.get("data", {}).get("accessToken"):
        raise RuntimeError("生产管理员登录验证失败")

    run(f"{prefix} install -d -m 700 backups", "创建生产备份目录")
    run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --set-gtid-purged=OFF "$MYSQL_DATABASE"\' > backups/post-deploy.sql && chmod 600 backups/post-deploy.sql',
        "创建生产全量备份",
    )
    run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS xinmaowei_restore_verify; CREATE DATABASE xinmaowei_restore_verify CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"\' && '
        f'{compose} exec -T mysql sh -lc \'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xinmaowei_restore_verify\' < backups/post-deploy.sql',
        "恢复生产备份到隔离库",
    )
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
    print("PRODUCTION_DEPLOYMENT=PASSED")
    print("PRODUCTION_EMPTY_INITIALIZATION=PASSED")
    print("PRODUCTION_ADMIN_LOGIN=PASSED")
    print("PRODUCTION_BACKUP_RESTORE=PASSED")
    print("ADMIN_BOOTSTRAP_FILE=/opt/xinmaowei/admin-bootstrap.secret")
finally:
    client.close()
