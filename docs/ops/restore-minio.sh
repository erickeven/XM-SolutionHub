#!/usr/bin/env bash
# 将本地镜像恢复到指定 Bucket；第二参数省略时目标为生产 Bucket。
set -euo pipefail
BACKUP_DIR="${1:?Usage: $0 <backup-dir> [target-bucket]}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
MC_IMAGE="${MC_IMAGE:-minio/mc:latest}"
PRODUCTION_BUCKET=$(sed -n 's/^MINIO_BUCKET=//p' "$ENV_FILE" | tail -n 1 | tr -d '"' | tr -d "'")
PRODUCTION_BUCKET="${PRODUCTION_BUCKET:-xinmaowei}"
TARGET_BUCKET="${2:-$PRODUCTION_BUCKET}"

test -d "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
[[ "$TARGET_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || { echo "Invalid bucket name" >&2; exit 1; }

if [[ "$TARGET_BUCKET" == "$PRODUCTION_BUCKET" && "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "WARNING: This will overwrite production bucket $TARGET_BUCKET!"
  read -r -p "Continue? [y/N] " REPLY
  [[ "$REPLY" =~ ^[Yy]$ ]] || exit 1
fi

cd "$ROOT_DIR"
NETWORK=$(docker inspect xm-minio --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}')
docker run --rm --network "$NETWORK" --env-file "$ENV_FILE" \
  -e TARGET_BUCKET="$TARGET_BUCKET" -v "$BACKUP_DIR:/restore:ro" \
  --entrypoint /bin/sh "$MC_IMAGE" -eu -c '
    mc alias set local http://minio:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
    mc mb --ignore-existing "local/$TARGET_BUCKET" >/dev/null
    mc mirror --overwrite /restore "local/$TARGET_BUCKET"
  '
echo "MinIO restore complete: $BACKUP_DIR -> $TARGET_BUCKET"
