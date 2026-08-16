#!/usr/bin/env bash
# Обновление сайта на сервере: забрать код, поставить зависимости,
# применить схему, собрать и перезапустить.
#
#   cd /var/www/mytax && ./deploy/update.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Забираем изменения"
git pull --ff-only

echo "→ Зависимости"
npm ci

echo "→ Схема базы"
npm run db:push

echo "→ Сборка"
npm run build

echo "→ Перезапуск"
sudo systemctl restart mytax

echo "Готово. Логи: sudo journalctl -u mytax -f"
