#!/usr/bin/env bash
# Ежедневная копия базы и загруженных файлов MYTAX.uz. Хранятся последние 14 дней.
set -euo pipefail
dir=/var/backups/mytax
mkdir -p "$dir"; chmod 700 "$dir"
day=$(date +%F)
sudo -u postgres pg_dump mytax | gzip > "$dir/db-$day.sql.gz"
tar czf "$dir/uploads-$day.tar.gz" -C /var/www/mytax/public uploads
find "$dir" -type f -mtime +14 -delete
