from __future__ import annotations

from pathlib import Path

import paramiko


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
try:
    commands = (
        "if [ -e /opt/xinmaowei ]; then readlink -f /opt/xinmaowei; du -sh /opt/xinmaowei; "
        "find /opt/xinmaowei -mindepth 1 -maxdepth 1 -printf '%f\\n' | sort; else echo PRODUCTION_PATH=ABSENT; fi",
        "docker ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}' | "
        "grep -E 'xinmaowei|solutionhub|xm-' || true",
        "ss -ltnp | grep -E '(:8082|:18082)' || true",
    )
    for command in commands:
        _, stdout, stderr = client.exec_command(command)
        output = stdout.read().decode("utf-8", errors="replace").strip()
        error = stderr.read().decode("utf-8", errors="replace").strip()
        status = stdout.channel.recv_exit_status()
        if status != 0:
            raise RuntimeError(error or f"远端检查失败: {status}")
        if output:
            print(output)
finally:
    client.close()
