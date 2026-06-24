#!/usr/bin/env bash
# 全量备份：依次备份 PostgreSQL 与 MinIO。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${1:-$ROOT_DIR/backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$BACKUP_DIR"
echo "=== PostgreSQL Backup ==="
bash "$SCRIPT_DIR/backup-pg.sh" "$BACKUP_DIR"
echo "=== MinIO Backup ==="
bash "$SCRIPT_DIR/backup-minio.sh" "$BACKUP_DIR"
echo "=== All backups saved to: $BACKUP_DIR ==="
ls -lh "$BACKUP_DIR"
