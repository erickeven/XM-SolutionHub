#!/bin/bash
# PostgreSQL restore from custom format dump
# Usage: ./restore-pg.sh <dump-file>
set -euo pipefail
DUMP_FILE="${1:?Usage: $0 <dump-file>}"
DB_NAME="${PGDATABASE:-xinmaowei}"
echo "WARNING: This will DROP and recreate database $DB_NAME!"
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();"
dropdb -h localhost -U postgres "$DB_NAME"
createdb -h localhost -U postgres "$DB_NAME"
psql -h localhost -U postgres -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -h localhost -U postgres -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
pg_restore -v -h localhost -U postgres -d "$DB_NAME" "$DUMP_FILE"
echo "Restore complete: $DUMP_FILE"
