# Установка MYTAX.uz на свой сервер

Инструкция для VPS с Ubuntu 22.04/24.04 и root-доступом. Файлы для копирования
лежат в каталоге `deploy/`.

## Что должно быть на сервере

| Компонент | Версия | Зачем |
| --- | --- | --- |
| Node.js | 20 или новее (проверено на 22) | сам сайт |
| PostgreSQL | 14 или новее | новости, вопросы, пользователи |
| nginx | любая актуальная | HTTPS и раздача статики |
| Диск | от 10 ГБ | база и загруженные фото/видео |
| ОЗУ | от 1 ГБ (сборке нужно ~1 ГБ) | сборка и работа |

## 1. Пакеты

```bash
sudo apt update
sudo apt install -y nginx postgresql git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # должно быть v22.x
```

## 2. База данных

```bash
sudo -u postgres psql -c "CREATE USER mytax WITH PASSWORD 'ПРИДУМАЙТЕ_ПАРОЛЬ';"
sudo -u postgres psql -c "CREATE DATABASE mytax OWNER mytax;"
```

## 3. Пользователь и код

```bash
sudo adduser --system --group --home /var/www/mytax mytax
sudo git clone https://github.com/kamol-it/mytax-news.git /var/www/mytax
sudo chown -R mytax:mytax /var/www/mytax
```

## 4. Переменные окружения

```bash
sudo -u mytax nano /var/www/mytax/.env
sudo chmod 600 /var/www/mytax/.env
```

Содержимое:

```bash
DATABASE_URL="postgresql://mytax:ПАРОЛЬ_БАЗЫ@localhost:5432/mytax?schema=public"
AUTH_SECRET="вставьте вывод openssl rand -hex 32"
NEXT_PUBLIC_SITE_URL="https://mytax.uz"

# Push-уведомления (npx web-push generate-vapid-keys --json)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:info@mytax.uz"

# BLOB_READ_WRITE_TOKEN задавать НЕ нужно:
# без него файлы сохраняются в public/uploads на диске сервера.
```

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `DATABASE_URL` | да | строка подключения к PostgreSQL (подходит и `POSTGRES_URL`) |
| `AUTH_SECRET` | да | секрет подписи сессий, минимум 16 символов |
| `NEXT_PUBLIC_SITE_URL` | да | адрес сайта: используется в sitemap, OG-тегах и ссылках из уведомлений |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | для push | публичный ключ VAPID |
| `VAPID_PRIVATE_KEY` | для push | приватный ключ VAPID |
| `VAPID_SUBJECT` | для push | контакт вида `mailto:` |
| `PORT` | нет | порт приложения, по умолчанию 3000 |
| `BLOB_READ_WRITE_TOKEN` | нет | только для хранения медиа в Vercel Blob |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | разово | логин и пароль администратора для первого запуска `db:seed` |

## 5. Первая сборка и наполнение

```bash
cd /var/www/mytax
sudo -u mytax npm ci
sudo -u mytax npm run db:push          # создать таблицы
sudo -u mytax SEED_ADMIN_EMAIL="admin@mytax.uz" SEED_ADMIN_PASSWORD="надёжный-пароль" npm run db:seed
sudo -u mytax npm run build
```

`db:seed` создаёт администратора, рубрики и демо-новости. Демо-новости потом
удалите в админке. **После первого входа смените пароль в разделе
«Пользователи» и уберите `SEED_ADMIN_PASSWORD` из окружения.**

## 6. Автозапуск

```bash
sudo cp /var/www/mytax/deploy/mytax.service /etc/systemd/system/mytax.service
sudo systemctl daemon-reload
sudo systemctl enable --now mytax
sudo systemctl status mytax
```

## 7. nginx и HTTPS

```bash
sudo cp /var/www/mytax/deploy/nginx.conf.example /etc/nginx/sites-available/mytax.uz
sudo ln -s /etc/nginx/sites-available/mytax.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mytax.uz -d www.mytax.uz
```

Два параметра в конфиге принципиальны:

- `client_max_body_size 200m;` — без него nginx отбивает загрузку видео;
- `proxy_set_header X-Forwarded-For …;` — по этому заголовку работает
  ограничение частоты запросов. Без него лимит станет общим для всех
  посетителей, и один спамер заблокирует форму вопросов всему сайту.

## 8. Проверка

```bash
curl -I https://mytax.uz/ru                  # 200 и заголовки безопасности
curl -I https://mytax.uz/admin               # 307 на /admin/login
sudo journalctl -u mytax -n 50 --no-pager    # логи приложения
```

## Обновление сайта

```bash
cd /var/www/mytax && ./deploy/update.sh
```

Скрипт забирает код, ставит зависимости, применяет схему, собирает и
перезапускает службу.

## Резервные копии

Копировать нужно и базу, и файлы — по отдельности они бесполезны:

```bash
pg_dump -U mytax mytax | gzip > /backup/mytax-$(date +%F).sql.gz
tar czf /backup/uploads-$(date +%F).tar.gz -C /var/www/mytax/public uploads
```

## Возможные проблемы

| Симптом | Причина и решение |
| --- | --- |
| `413 Request Entity Too Large` при загрузке | не поднят `client_max_body_size` в nginx |
| Ограничение частоты срабатывает на всех сразу | nginx не передаёт `X-Forwarded-For` |
| «Не задана строка подключения к базе» при сборке | нет `DATABASE_URL` в `.env` или файл недоступен пользователю `mytax` |
| Вход в админку не сохраняется | сайт открыт по http: cookie сессии выставляется с флагом `Secure` |
| Сборка падает по памяти | добавьте swap: 2 ГБ достаточно |
