#!/usr/bin/env bash
# Проверка доступности для .github/workflows/uptime.yml.
# Состояние «сайт лежит» хранится открытым issue с меткой uptime: так письмо
# приходит один раз при сбое и один раз при восстановлении, а не каждые 10 минут.
set -uo pipefail

UPTIME_LABEL=uptime
CERT_LABEL=cert

# ---------- уведомления ----------

telegram() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -fsS -m 15 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=$1" \
    -d disable_web_page_preview=true >/dev/null || echo "::warning::Telegram не принял сообщение"
}

ensure_label() {
  gh label create "$1" --color "$2" --description "$3" --force >/dev/null 2>&1 || true
}

open_issue() { # $1 — метка; печатает номер открытого issue или пусто
  gh issue list --label "$1" --state open --limit 1 --json number --jq '.[0].number // empty'
}

minutes_since() { # ISO-дата → минуты до текущего момента
  echo $(( ($(date -u +%s) - $(date -u -d "$1" +%s)) / 60 ))
}

# ---------- проверки ----------

# Три попытки с паузой: короткий сбой сети или перезапуск службы — не авария
check_url() { # $1 — адрес, $2 — текст, который должен быть на странице (необязательно)
  local url=$1 text=${2:-} code body
  for attempt in 1 2 3; do
    body=$(mktemp)
    code=$(curl -sS -o "$body" -w '%{http_code}' -m 20 -A "mytax-uptime" "$url" 2>/dev/null || echo 000)
    if [ "$code" = 200 ] && { [ -z "$text" ] || grep -q "$text" "$body"; }; then
      rm -f "$body"; return 0
    fi
    rm -f "$body"
    LAST_ERROR="$url → HTTP $code"
    [ "$attempt" -lt 3 ] && sleep 20
  done
  return 1
}

cert_days_left() { # $1 — домен: дни до окончания сертификата на сервере (минуя Cloudflare)
  local end
  end=$(echo | timeout 15 openssl s_client -connect "${ORIGIN_IP}:443" -servername "$1" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  [ -n "$end" ] || { echo -1; return; }
  echo $(( ($(date -u -d "$end" +%s) - $(date -u +%s)) / 86400 ))
}

# ---------- доступность ----------

problems=()
LAST_ERROR=""
check_url "$SITE_URL" "$SITE_TEXT" || problems+=("Сайт: $LAST_ERROR")
check_url "$ADMIN_URL" || problems+=("Админка: $LAST_ERROR")

ensure_label "$UPTIME_LABEL" B60205 "Мониторинг: сайт недоступен"
issue=$(open_issue "$UPTIME_LABEL")
now=$(date -u '+%Y-%m-%d %H:%M UTC')

if [ ${#problems[@]} -gt 0 ]; then
  details=$(printf -- '- %s\n' "${problems[@]}")
  echo "::error::Недоступно:"; echo "$details"
  if [ -z "$issue" ]; then
    read -r -d '' body <<EOF || true
Мониторинг обнаружил сбой в $now (три попытки подряд).

$details

Проверка: $RUN_URL

Что посмотреть на сервере:
\`\`\`bash
systemctl status mytax nginx postgresql
journalctl -u mytax -n 50 --no-pager
\`\`\`
Issue закроется сам, когда сайт снова начнёт отвечать.
EOF
    gh issue create --label "$UPTIME_LABEL" --title "🔴 mytax.uz недоступен" --body "$body" >/dev/null
    telegram "🔴 mytax.uz недоступен ($now)
$details"
  else
    # Напоминание не чаще раза в час, чтобы не засыпать почту
    updated=$(gh issue view "$issue" --json updatedAt --jq .updatedAt)
    if [ "$(minutes_since "$updated")" -ge 60 ]; then
      gh issue comment "$issue" --body "Всё ещё недоступно ($now):
$details" >/dev/null
    fi
  fi
else
  echo "Сайт и админка отвечают."
  if [ -n "$issue" ]; then
    created=$(gh issue view "$issue" --json createdAt --jq .createdAt)
    gh issue close "$issue" --comment "🟢 Снова работает ($now). Простой около $(minutes_since "$created") мин." >/dev/null
    telegram "🟢 mytax.uz снова работает ($now). Простой около $(minutes_since "$created") мин."
  fi
fi

# ---------- сертификаты на сервере ----------

ensure_label "$CERT_LABEL" FBCA04 "Мониторинг: сертификат скоро истечёт"
cert_issue=$(open_issue "$CERT_LABEL")
expiring=()
for host in $CERT_HOSTS; do
  days=$(cert_days_left "$host")
  echo "Сертификат $host: осталось $days дн."
  if [ "$days" -lt 0 ]; then
    expiring+=("$host: не удалось получить сертификат с сервера")
  elif [ "$days" -lt "$CERT_WARN_DAYS" ]; then
    expiring+=("$host: осталось $days дн.")
  fi
done

if [ ${#expiring[@]} -gt 0 ] && [ -z "$cert_issue" ]; then
  details=$(printf -- '- %s\n' "${expiring[@]}")
  read -r -d '' body <<EOF || true
Автопродление Let's Encrypt, похоже, не сработало:

$details

Проверьте на сервере:
\`\`\`bash
sudo certbot renew --dry-run
systemctl list-timers certbot.timer
\`\`\`
EOF
  gh issue create --label "$CERT_LABEL" --title "🟡 Сертификат на сервере скоро истечёт" --body "$body" >/dev/null
  telegram "🟡 Сертификат mytax.uz скоро истечёт:
$details"
elif [ ${#expiring[@]} -eq 0 ] && [ -n "$cert_issue" ]; then
  gh issue close "$cert_issue" --comment "✅ Сертификаты обновлены." >/dev/null
fi

exit 0
