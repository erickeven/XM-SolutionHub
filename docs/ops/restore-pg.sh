#!/usr/bin/env bash
# 将自定义格式备份恢复到指定数据库；第二参数省略时目标为生产库。
set -euo pipefail
DUMP_FILE="${1:?Usage: $0 <dump-file> [target-database]}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
TARGET_DB="${2:-${PGDATABASE:-xinmaowei}}"

test -f "$DUMP_FILE"
DUMP_FILE="$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")"
[[ "$TARGET_DB" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Invalid database name" >&2; exit 1; }

cd "$ROOT_DIR"
PRODUCTION_DB=$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'printf %s "$POSTGRES_DB"')
if [[ "$TARGET_DB" == "$PRODUCTION_DB" && "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "WARNING: This will DROP and recreate production database $TARGET_DB!"
  read -r -p "Continue? [y/N] " REPLY
  [[ "$REPLY" =~ ^[Yy]$ ]] || exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres sh -eu -c '
  target="$1"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='\''$target'\'' AND pid <> pg_backend_pid();"
  dropdb --if-exists -U "$POSTGRES_USER" "$target"
  createdb -U "$POSTGRES_USER" "$target"
' sh "$TARGET_DB"

cat "$DUMP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres sh -eu -c \
  'pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"' sh "$TARGET_DB"
echo "Restore complete: $DUMP_FILE -> $TARGET_DB"
