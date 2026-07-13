from __future__ import annotations

import io
import json
import secrets
import stat
import sys
import time
import urllib.error
import urllib.request
import urllib.parse
from pathlib import Path, PurePosixPath
from typing import Any

import paramiko
from pypdf import PdfReader, PdfWriter

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

remote_root = PurePosixPath("/opt/xinmaowei-rebuild-validation")
mysql_root_password = secrets.token_hex(24)
mysql_password = secrets.token_hex(24)
s3_access_key = f"validation-{secrets.token_hex(6)}"
s3_secret_key = secrets.token_hex(24)
access_token_secret = secrets.token_hex(32)
file_token_secret = secrets.token_hex(32)
admin_email = "validation-admin@xinmaowei.local"
admin_password = secrets.token_urlsafe(28)
remote_env = "\n".join(
    (
        "NODE_ENV=production",
        "APP_PORT=18082",
        "MYSQL_DATABASE=xinmaowei_validation",
        "MYSQL_USER=xinmaowei",
        f"MYSQL_PASSWORD={mysql_password}",
        f"MYSQL_ROOT_PASSWORD={mysql_root_password}",
        f"DATABASE_URL=mysql://xinmaowei:{mysql_password}@mysql:3306/xinmaowei_validation",
        f"S3_ACCESS_KEY={s3_access_key}",
        f"S3_SECRET_KEY={s3_secret_key}",
        "S3_BUCKET=xinmaowei-validation",
        f"ACCESS_TOKEN_SECRET={access_token_secret}",
        f"FILE_TOKEN_SECRET={file_token_secret}",
        f"ADMIN_EMAIL={admin_email}",
        f"ADMIN_PASSWORD={admin_password}",
        "",
    )
)

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


def run(command: str, label: str, timeout: int = 900) -> str:
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


def api_request(
    method: str,
    path: str,
    *,
    body: Any | None = None,
    token: str | None = None,
    content_type: str = "application/json",
    extra_headers: dict[str, str] | None = None,
) -> tuple[Any, bytes]:
    url = f"http://{config['DEPLOY_HOST']}:18082{path}"
    headers = {"content-type": content_type}
    if token:
        headers["authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
    if isinstance(body, bytes):
        encoded = body
    elif body is None:
        encoded = None
    else:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            if response.headers.get_content_type() == "application/json":
                payload = json.loads(raw.decode("utf-8"))
                if payload.get("code") != 0:
                    raise RuntimeError(f"API 业务失败: {payload.get('message')}")
                return payload.get("data"), raw
            return None, raw
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(raw).get("message", "HTTP_ERROR")
        except json.JSONDecodeError:
            message = "HTTP_ERROR"
        raise RuntimeError(f"API {method} {path} 失败: {error.code} {message}") from error


def five_page_pdf() -> bytes:
    writer = PdfWriter()
    for _ in range(5):
        writer.add_blank_page(width=595, height=842)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


try:
    run(f"install -d -m 700 {remote_root}", "创建隔离验证目录")
    run(
        f"if test -f {remote_root}/.env; then cd {remote_root} && docker compose --env-file .env -f compose.yaml -f compose.prod.yaml down --volumes --remove-orphans; fi",
        "重置隔离验证环境",
    )
    sftp = client.open_sftp()
    try:
        excluded = {
            ".git", ".runtime", ".env", ".env.local", "node_modules", "dist", "coverage",
            "poc", "output", "playwright-report", "test-results", ".agents", ".codex"
        }
        for local_path in workspace.rglob("*"):
            relative = local_path.relative_to(workspace)
            if any(part in excluded for part in relative.parts) or local_path.is_dir():
                continue
            remote_path = remote_root.joinpath(*relative.parts)
            current = PurePosixPath("/")
            for part in remote_path.parent.parts[1:]:
                current /= part
                try:
                    sftp.stat(str(current))
                except FileNotFoundError:
                    sftp.mkdir(str(current), mode=0o700)
            sftp.put(str(local_path), str(remote_path))
        with sftp.file(str(remote_root / ".env"), "w") as env_file:
            env_file.write(remote_env)
        sftp.chmod(str(remote_root / ".env"), stat.S_IRUSR | stat.S_IWUSR)
    finally:
        sftp.close()

    prefix = f"cd {remote_root} &&"
    compose = "docker compose --env-file .env -f compose.yaml -f compose.prod.yaml"
    run(f"{prefix} {compose} config --quiet", "校验正式 Compose 配置")
    run(f"{prefix} {compose} build", "构建正式 API/Worker/Web 镜像", 2400)
    run(
        f"{prefix} docker run --rm --memory 2g --env-file .env "
        f"-e NODE_ENV=test -e NODE_OPTIONS=--max-old-space-size=1536 "
        f"xinmaowei-design-in-migrate pnpm verify",
        "在 Node 24 镜像执行 lint、类型、单元/API/组件测试与构建",
        1200,
    )
    run(f"{prefix} {compose} up -d --wait --wait-timeout 600", "执行迁移、管理员初始化并启动正式栈", 1200)
    run(f"{prefix} {compose} ps", "检查容器健康状态")

    counts = run(
        f'{prefix} {compose} exec -T mysql sh -lc \'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -Nse "SELECT (SELECT COUNT(*) FROM Product), (SELECT COUNT(*) FROM Solution), (SELECT COUNT(*) FROM Document);"\'',
        "验证初始化不含演示产品/方案/资料",
    )
    if counts.split() != ["0", "0", "0"]:
        raise RuntimeError(f"初始化数据不为空: {counts}")

    health, _ = api_request("GET", "/api/v1/health")
    if health.get("status") != "ok":
        raise RuntimeError("API 健康响应异常")

    admin_session, _ = api_request(
        "POST", "/api/v1/iam/login", body={"email": admin_email, "password": admin_password}
    )
    admin_token = admin_session["accessToken"]
    evidence = {
        "reason": "隔离验证环境执行正式受控发布验证",
        "notificationTargets": ["validation-owner@xinmaowei.local"],
        "recoveryPoint": "validation-clean-volume",
    }

    api_request("POST", "/api/v1/admin/catalog/products", token=admin_token, body={
        "familyCode": "VALIDATION-PM",
        "familyName": "验证电源管理产品族",
        "productCode": "XMW-VALIDATION-001",
        "name": "验证电源控制器",
        "summary": "用于隔离验收的受控产品记录，验证完成后整体删除。",
        "skus": [{"orderCode": "XMW-VALIDATION-001-SOP8", "packageCode": "SOP8"}],
        "fields": {},
    })
    api_request("POST", "/api/v1/admin/catalog/products/XMW-VALIDATION-001/publish", token=admin_token, body=evidence)
    api_request("POST", "/api/v1/admin/catalog/solutions", token=admin_token, body={
        "solutionCode": "SOL-VALIDATION-001",
        "name": "验证应用方案",
        "summary": "用于验证产品到方案再到资料的完整受控链路。",
        "conditions": {"application": "validation"},
        "evidence": {"source": "integration-validation"},
        "resourceLevel": "PUBLIC",
        "productCodes": ["XMW-VALIDATION-001"],
    })
    api_request("POST", "/api/v1/admin/catalog/solutions/SOL-VALIDATION-001/versions/1/publish", token=admin_token, body=evidence)

    pdf = five_page_pdf()
    api_request(
        "PUT",
        "/api/v1/admin/catalog/documents/DOC-VALIDATION-001/versions/1/original",
        token=admin_token,
        body=pdf,
        content_type="application/pdf",
        extra_headers={
            "x-document-title": urllib.parse.quote("验证产品规格书"),
            "x-resource-level": "PUBLIC",
            "x-document-language": "zh-CN",
        },
    )
    published = False
    for _ in range(30):
        time.sleep(2)
        try:
            api_request(
                "POST",
                "/api/v1/admin/catalog/documents/DOC-VALIDATION-001/versions/1/publish",
                token=admin_token,
                body=evidence,
            )
            published = True
            break
        except RuntimeError as error:
            if "资料不可发布" not in str(error):
                raise
    if not published:
        run(f"{prefix} {compose} logs --no-color --tail=200 worker", "读取 Worker 失败日志")
        raise RuntimeError("PDF 预览派生物在 60 秒内未完成")

    api_request(
        "POST",
        "/api/v1/admin/catalog/products/XMW-VALIDATION-001/documents",
        token=admin_token,
        body={"documentCode": "DOC-VALIDATION-001", "relationType": "DATASHEET"},
    )
    api_request(
        "POST",
        "/api/v1/admin/catalog/solutions/SOL-VALIDATION-001/versions/1/documents",
        token=admin_token,
        body={"documentCode": "DOC-VALIDATION-001", "relationType": "APPLICATION_NOTE"},
    )

    products, _ = api_request("GET", "/api/v1/products?q=XMW-VALIDATION-001")
    product, _ = api_request("GET", "/api/v1/products/XMW-VALIDATION-001")
    solution, _ = api_request("GET", "/api/v1/solutions/SOL-VALIDATION-001")
    if len(products) != 1 or len(product["relatedSolutions"]) != 1 or len(product["documents"]) != 1:
        raise RuntimeError("产品→方案→资料链路验证失败")
    if len(solution["products"]) != 1 or len(solution["documents"]) != 1:
        raise RuntimeError("方案关联上架产品或方案资料验证失败")

    anonymous_access, _ = api_request(
        "POST", "/api/v1/documents/DOC-VALIDATION-001/access", body={"action": "PREVIEW"}
    )
    _, anonymous_pdf = api_request("GET", anonymous_access["accessPath"], content_type="application/pdf")
    if len(PdfReader(io.BytesIO(anonymous_pdf)).pages) != 3:
        raise RuntimeError("匿名预览不是前三页派生物")

    customer_email = f"validation-{secrets.token_hex(4)}@example.com"
    customer_session, _ = api_request("POST", "/api/v1/iam/register", body={
        "email": customer_email,
        "displayName": "验证客户",
        "password": secrets.token_urlsafe(18),
    })
    customer_token = customer_session["accessToken"]
    full_access, _ = api_request(
        "POST", "/api/v1/documents/DOC-VALIDATION-001/access",
        token=customer_token,
        body={"action": "PREVIEW"},
    )
    _, full_pdf = api_request("GET", full_access["accessPath"], content_type="application/pdf")
    if len(PdfReader(io.BytesIO(full_pdf)).pages) != 5:
        raise RuntimeError("注册用户完整预览页数不正确")
    download_access, _ = api_request(
        "POST", "/api/v1/documents/DOC-VALIDATION-001/access",
        token=customer_token,
        body={"action": "DOWNLOAD"},
    )
    _, downloaded = api_request("GET", download_access["accessPath"], content_type="application/pdf")
    if downloaded != pdf:
        raise RuntimeError("下载原件与上传内容不一致")

    config_draft, _ = api_request(
        "POST", "/api/v1/admin/configuration/versions", token=admin_token,
        body={"payload": {"navigation": ["products", "solutions", "documents", "selection"]}, "changeSummary": "隔离验证配置发布"},
    )
    api_request(
        "POST", f"/api/v1/admin/configuration/versions/{config_draft['version']}/publish",
        token=admin_token, body=evidence,
    )

    print("REMOTE_FORMAL_VALIDATION=PASSED")
    print("ANONYMOUS_PREVIEW_PAGES=3")
    print("REGISTERED_PREVIEW_PAGES=5")
    print("CONTROLLED_MAIN_FLOW=PASSED")
finally:
    client.close()
