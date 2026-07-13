from __future__ import annotations

import json
import sys
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


def run(command: str, label: str, timeout: int = 1800, show_output: bool = True) -> str:
    print(f"[remote] {label}")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    output = stdout.read().decode("utf-8", errors="replace").strip()
    error = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    if output and show_output:
        print(output)
    if status != 0:
        if error:
            print(error[-8000:])
        raise RuntimeError(f"{label} 失败 ({status})")
    return output


version = "0.72.0"
archive = f"trivy_{version}_Linux-64bit.tar.gz"
base_url = f"https://github.com/aquasecurity/trivy/releases/download/v{version}"
images = (
    "xinmaowei-design-in-api:latest",
    "xinmaowei-design-in-web:latest",
    "xinmaowei-design-in-mysql:9.7",
    "redis:8.2.7-alpine",
    "xinmaowei-design-in-storage:4.29-sec1",
)

try:
    run(
        f"cd /tmp && if /tmp/trivy --version 2>/dev/null | grep -q 'Version: {version}'; then "
        f"/tmp/trivy --version | head -1; else "
        f"curl --fail --silent --show-error --location -o {archive} {base_url}/{archive} "
        f"&& curl --fail --silent --show-error --location -o trivy_checksums.txt {base_url}/trivy_{version}_checksums.txt "
        f"&& grep ' {archive}$' trivy_checksums.txt | sha256sum --check - "
        f"&& tar -xzf {archive} trivy && chmod 700 /tmp/trivy && /tmp/trivy --version | head -1; fi",
        "下载并校验 Trivy 官方二进制",
    )
    failed = False
    for image in images:
        raw_report = run(
            f"/tmp/trivy image --db-repository ghcr.io/aquasecurity/trivy-db:2 "
            f"--scanners vuln --severity CRITICAL,HIGH --ignore-unfixed "
            f"--exit-code 0 --format json {image}",
            f"扫描镜像 {image}",
            2400,
            False,
        )
        report = json.loads(raw_report)
        findings = [
            vulnerability
            for result in report.get("Results", [])
            for vulnerability in result.get("Vulnerabilities") or []
        ]
        print(f"{image}: HIGH/CRITICAL={len(findings)}")
        for finding in findings[:20]:
            print(
                "  "
                f"{finding.get('Severity')} {finding.get('VulnerabilityID')} "
                f"{finding.get('PkgName')} {finding.get('InstalledVersion')} -> "
                f"{finding.get('FixedVersion')}"
            )
        failed = failed or bool(findings)
    if failed:
        raise RuntimeError("正式镜像仍存在可修复的 HIGH/CRITICAL 漏洞")
    print("FORMAL_IMAGE_SCAN=PASSED")
finally:
    client.close()
