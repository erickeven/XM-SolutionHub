#!/bin/bash
# MinIO bucket backup using mc (MinIO Client)
# Usage: ./backup-minio.sh [output-dir]
set -euo pipefail
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUCKET="${MINIO_BUCKET:-xm-files}"
mkdir -p "$BACKUP_DIR"
mc mirror "$BUCKET" "$BACKUP_DIR/minio-$TIMESTAMP/"
echo "MinIO backup saved: $BACKUP_DIR/minio-$TIMESTAMP/"
