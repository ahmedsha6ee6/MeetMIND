#!/usr/bin/env bash
# scripts/backup.sh – backup PostgreSQL DB and output files
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${BACKUP_DIR}"

echo "==> MeetMind Backup (${TIMESTAMP})"

# PostgreSQL dump
echo "[1/2] Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-meetmind}" \
  -d "${POSTGRES_DB:-meetmind}" \
  --no-password \
  | gzip > "${BACKUP_DIR}/meetmind_db_${TIMESTAMP}.sql.gz"
echo "    ✓ DB saved to ${BACKUP_DIR}/meetmind_db_${TIMESTAMP}.sql.gz"

# Output files (generated MOMs)
echo "[2/2] Backing up generated documents..."
tar -czf "${BACKUP_DIR}/meetmind_outputs_${TIMESTAMP}.tar.gz" -C ./volumes outputs/
echo "    ✓ Outputs saved to ${BACKUP_DIR}/meetmind_outputs_${TIMESTAMP}.tar.gz"

echo "==> Backup complete."
