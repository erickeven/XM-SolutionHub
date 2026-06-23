#!/bin/bash
# Full system backup — calls both pg and minio backups
# Usage: ./backup-full.sh [output-dir]
set -euo pipefail
BACKUP_DIR="${1:-./backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$BACKUP_DIR"
echo "=== PostgreSQL Backup ==="
./backup-pg.sh "$BACKUP_DIR"
echo "=== MinIO Backup ==="
./backup-minio.sh "$BACKUP_DIR"
echo "=== All backups saved to: $BACKUP_DIR ==="
ls -lh "$BACKUP_DIR"
