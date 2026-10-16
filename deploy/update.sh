#!/usr/bin/env bash
# Обновление сайта на сервере: забрать код, поставить зависимости,
# применить схему, собрать и перезапустить.
#
#   cd /var/www/mytax && ./deploy/update.sh
#
# Можно запускать от root: всё, что пишет в каталог проекта, выполняется от
# пользователя mytax, иначе файлы сменят владельца и служба не сможет их писать.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_USER=mytax
as_app() {
  if [ "$(id -u)" = 0 ]; then sudo -u "$APP_USER" -- "$@"; else "$@"; fi
}

echo "→ Забираем изменения"
as_app git pull --ff-only

echo "→ Зависимости"
as_app npm ci --no-audit --no-fund

echo "→ Схема базы"
as_app npm run db:push

echo "→ Сборка"
as_app npm run build

echo "→ Перезапуск"
sudo systemctl restart mytax

echo "Готово. Логи: sudo journalctl -u mytax -f"
