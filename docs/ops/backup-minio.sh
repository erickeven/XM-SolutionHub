#!/usr/bin/env bash
# 使用一次性 mc 容器镜像 MinIO Bucket 到宿主机目录。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
MC_IMAGE="${MC_IMAGE:-minio/mc:latest}"
BACKUP_DIR="${1:-$ROOT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
BACKUP_NAME="minio-$TIMESTAMP"
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

cd "$ROOT_DIR"
NETWORK=$(docker inspect xm-minio --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}')
docker run --rm --network "$NETWORK" --env-file "$ENV_FILE" \
  -e BACKUP_NAME="$BACKUP_NAME" -v "$BACKUP_DIR:/backup" \
  --entrypoint /bin/sh "$MC_IMAGE" -eu -c '
    mc alias set local http://minio:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
    mc mirror --overwrite "local/$MINIO_BUCKET" "/backup/$BACKUP_NAME"
  '
test -d "$BACKUP_DIR/$BACKUP_NAME"
echo "MinIO backup saved: $BACKUP_DIR/$BACKUP_NAME/"
