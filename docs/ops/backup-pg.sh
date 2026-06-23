#!/bin/bash
# PostgreSQL backup: pg_dump custom format (-Fc) for compressed + parallel restore
# Usage: ./backup-pg.sh [output-dir]
set -euo pipefail
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_NAME="${PGDATABASE:-xinmaowei}"
mkdir -p "$BACKUP_DIR"
pg_dump -Fc -v -h localhost -U postgres -d "$DB_NAME" -f "$BACKUP_DIR/xm-$TIMESTAMP.dump"
echo "Backup saved: $BACKUP_DIR/xm-$TIMESTAMP.dump"
