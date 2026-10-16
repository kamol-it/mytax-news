#!/usr/bin/env bash
# Обновляет список адресов Cloudflare, которым nginx доверяет заголовок CF-Connecting-IP.
# Запускается по cron раз в неделю.
set -euo pipefail
out=/etc/nginx/conf.d/cloudflare-realip.conf
tmp=$(mktemp)
{
  echo "# Сгенерировано $(date +%F) скриптом /usr/local/bin/cloudflare-realip.sh"
  for f in ips-v4 ips-v6; do
    curl -fsS "https://www.cloudflare.com/$f" | while read -r net; do
      [ -n "$net" ] && echo "set_real_ip_from $net;"
    done
  done
  echo "real_ip_header CF-Connecting-IP;"
} > "$tmp"
# Пустой список означает сбой загрузки — старый файл не трогаем
grep -q set_real_ip_from "$tmp" || { rm -f "$tmp"; exit 1; }
install -m 644 "$tmp" "$out"; rm -f "$tmp"
nginx -t -q && systemctl reload nginx
