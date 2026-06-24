#!/usr/bin/env bash
# 使用 PostgreSQL 容器内的 pg_dump 生成自定义格式备份。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
BACKUP_DIR="${1:-$ROOT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
DUMP_FILE="$BACKUP_DIR/xm-$TIMESTAMP.dump"

cd "$ROOT_DIR"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -eu -c \
  'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$DUMP_FILE"
test -s "$DUMP_FILE"
echo "Backup saved: $DUMP_FILE"
