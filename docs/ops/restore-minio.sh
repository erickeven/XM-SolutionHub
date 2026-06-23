#!/bin/bash
# MinIO bucket restore from local mirror
# Usage: ./restore-minio.sh <backup-dir>
set -euo pipefail
BACKUP_DIR="${1:?Usage: $0 <backup-dir>}"
BUCKET="${MINIO_BUCKET:-xm-files}"
echo "WARNING: This will OVERWRITE contents of bucket $BUCKET!"
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
mc mirror "$BACKUP_DIR" "$BUCKET"
echo "MinIO restore complete"
