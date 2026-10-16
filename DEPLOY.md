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

Базовая защита сервера. Вход только по ключу включайте, когда ключ уже
установлен (`ssh-copy-id`) и вход по нему проверен, иначе доступ пропадёт:

```bash
sudo apt install -y ufw fail2ban unattended-upgrades
sudo ufw allow OpenSSH && sudo ufw allow "Nginx Full" && sudo ufw --force enable
printf "PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n" \
  | sudo tee /etc/ssh/sshd_config.d/00-mytax.conf
sudo sshd -t && sudo systemctl reload ssh
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

# Админка на отдельном поддомене (необязательно, см. раздел 7)
# ADMIN_HOST="in.mytax.uz"

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
| `ADMIN_HOST` | нет | поддомен админки, например `in.mytax.uz`; без него админка на `/admin` основного домена |
| `PORT` | нет | порт приложения, по умолчанию 3000 |
| `BLOB_READ_WRITE_TOKEN` | нет | только для хранения медиа в Vercel Blob |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | разово | логин и пароль администратора для первого запуска `db:seed` |

## 5. Первая сборка и наполнение

> База должна быть запущена и доступна **во время сборки**: часть страниц
> Next.js готовит заранее и обращается к ней. Если база недоступна, сборка
> падает с `ECONNREFUSED`.

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

### Если на сервере 1 ГБ памяти

Сборке Next.js нужно около гигабайта, и на тарифах с 1 ГБ она падает с
`JavaScript heap out of memory` или убивается системой. Два рабочих пути.

**Путь 1 — swap на сервере** (проще, сборка идёт медленнее):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo -u mytax NODE_OPTIONS="--max-old-space-size=768" npm run build
```

**Путь 2 — сборка на своём компьютере** (сервер вообще не нагружается):

```bash
# локально, в папке проекта
npm ci && npm run build
rsync -az --delete .next/ mytax.uz:/var/www/mytax/.next/
ssh mytax.uz "sudo systemctl restart mytax"
```

При втором пути на сервере всё равно нужны `npm ci` (зависимости для запуска)
и `npm run db:push`, но не `npm run build`.

## 6. Автозапуск

```bash
sudo cp /var/www/mytax/deploy/mytax.service /etc/systemd/system/mytax.service
sudo systemctl daemon-reload
sudo systemctl enable --now mytax
sudo systemctl status mytax
```

## 7. nginx и HTTPS

Сначала временный конфиг только с HTTP: основной ссылается на файлы
сертификата, которых ещё нет, и с ним `nginx -t` не пройдёт.

```bash
sudo mkdir -p /var/www/certbot
sudo cp /var/www/mytax/deploy/nginx-bootstrap.conf.example /etc/nginx/sites-available/mytax.uz
sudo ln -s /etc/nginx/sites-available/mytax.uz /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Когда домен указывает на сервер, выпустите сертификат и поставьте основной
конфиг:

```bash
sudo apt install -y certbot
sudo certbot certonly --webroot -w /var/www/certbot -d mytax.uz -d www.mytax.uz
sudo cp /var/www/mytax/deploy/nginx.conf.example /etc/nginx/sites-available/mytax.uz
echo "deploy-hook = systemctl reload nginx" | sudo tee -a /etc/letsencrypt/cli.ini
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run   # проверка автопродления
```

Сертификат продлевается сам (`certbot.timer`), после продления nginx
перечитывает его через `deploy-hook`.

Два параметра в конфиге принципиальны:

- `client_max_body_size 200m;` — без него nginx отбивает загрузку видео;
- `proxy_set_header X-Real-IP $remote_addr;` и
  `proxy_set_header X-Forwarded-For $remote_addr;` — по ним работает
  ограничение частоты запросов. Без них лимит станет общим для всех
  посетителей, и один спамер заблокирует форму вопросов всему сайту.
  Значение именно `$remote_addr`, а не `$proxy_add_x_forwarded_for`: иначе
  к адресу добавляется то, что прислал сам клиент, и лимиты можно обойти.
  Приложение берёт `X-Real-IP`, а без него — последний адрес из
  `X-Forwarded-For`. Node должен слушать только 127.0.0.1, чтобы запросы
  с поддельными заголовками не приходили в обход nginx.

### Если сайт за Cloudflare

С включённым проксированием (оранжевое облако) все запросы приходят с адресов
Cloudflare, и `$remote_addr` без доработки станет адресом Cloudflare: лимит
снова окажется общим для всех. Скрипт `deploy/cloudflare-realip.sh` создаёт
`/etc/nginx/conf.d/cloudflare-realip.conf`: nginx доверяет заголовку
`CF-Connecting-IP` только с адресов Cloudflare и подставляет из него
настоящий IP в `$remote_addr`. Остальной конфиг менять не нужно.

```bash
sudo install -m 755 /var/www/mytax/deploy/cloudflare-realip.sh /usr/local/bin/
sudo /usr/local/bin/cloudflare-realip.sh
# Cloudflare изредка меняет свои диапазоны — обновляем список раз в неделю
echo "17 4 * * 1 root /usr/local/bin/cloudflare-realip.sh" | sudo tee /etc/cron.d/cloudflare-realip
```

В панели Cloudflare:

- **DNS:** записи `A` для `@` и `www` на IP сервера, статус **Proxied**.
  Почтовые записи (`mail`, `MX`, SPF/DKIM/DMARC) оставьте **DNS only**: через
  прокси Cloudflare почта не ходит. Если почта живёт на другом хостинге,
  `mail` должна быть записью `A` на его IP, а не `CNAME` на основной домен,
  иначе почта уйдёт на сервер сайта.
- **SSL/TLS:** режим **Full (strict)**. Сертификат Let's Encrypt на сервере
  выпускается и продлевается через прокси, отдельный Origin-сертификат не нужен.
- **Bot Fight Mode** не включайте: он может блокировать запросы service worker
  и чата консультанта.

Ограничение тарифа Free: запрос не больше **100 МБ**. Видео крупнее этого через
Cloudflare не загрузится, такие ролики выкладывайте на YouTube и вставляйте
ссылкой.

Проверить, что nginx видит настоящий IP: откройте сайт и сравните свой адрес
с первым полем в `sudo tail -1 /var/log/nginx/access.log`.

### Админка на отдельном поддомене

Админку можно вынести на поддомен (у нас `in.mytax.uz`): тогда на основном
сайте `/admin` отдаёт обычную 404 и вход посетителям не виден. Работает тот же
процесс Node, раздел выбирается по заголовку `Host`.

1. В DNS (Cloudflare) — запись `A` для поддомена на IP сервера, **Proxied**.
2. Когда поддомен начал открываться, выпустите для него сертификат и включите
   конфиг (HTTP на порту 80 уже обслуживает `default_server` основного конфига):

   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d in.mytax.uz
   sudo cp /var/www/mytax/deploy/nginx-admin.conf.example /etc/nginx/sites-available/in.mytax.uz
   sudo ln -s /etc/nginx/sites-available/in.mytax.uz /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Только после этого** добавьте в `.env` строку `ADMIN_HOST="in.mytax.uz"` и
   перезапустите `sudo systemctl restart mytax`. Если включить переменную раньше,
   чем заработает поддомен, админка станет недоступна: на основном домене её уже
   не будет.

Что меняется для редакции:

- вход — только на `https://in.mytax.uz`, старые сессии на основном домене не
  действуют (cookie привязана к адресу);
- push о новых вопросах нужно один раз заново включить в админке на новом
  адресе — подписка браузера привязана к домену;
- ссылки в уведомлениях администраторам сами ведут на поддомен.

Отключить: удалить `ADMIN_HOST` из `.env` и перезапустить службу — админка
вернётся на `/admin` основного домена.

## 8. Проверка

```bash
curl -I https://mytax.uz/ru                  # 200 и заголовки безопасности
curl -I https://mytax.uz/admin               # без ADMIN_HOST: 307 на /admin/login
                                             # с ADMIN_HOST: 307 на /uz/admin → 404
curl -I https://in.mytax.uz/admin/login      # с ADMIN_HOST: 200
sudo journalctl -u mytax -n 50 --no-pager    # логи приложения
```

## Обновление сайта

```bash
cd /var/www/mytax && ./deploy/update.sh
```

Скрипт забирает код, ставит зависимости, применяет схему, собирает и
перезапускает службу. Запускать можно от root: git, npm и сборка выполняются
от пользователя `mytax`, чтобы файлы проекта не сменили владельца.

## Мониторинг доступности

В репозитории есть workflow `.github/workflows/uptime.yml`: GitHub Actions каждые
10 минут проверяет сайт, админку и срок действия сертификатов.

- Сайт недоступен (после трёх попыток подряд) — создаётся issue с меткой
  `uptime`, GitHub присылает письмо владельцу репозитория.
- Пока сбой продолжается, новых issue не создаётся: в открытую добавляется
  комментарий не чаще раза в час.
- Сайт снова работает — issue закрывается с комментарием о длительности простоя.
- Сертификат истекает меньше чем через 14 дней — отдельное предупреждение.

Адреса проверки задаются в начале workflow (`env`).

Уведомления в Telegram (необязательно): создайте бота у @BotFather, напишите ему
любое сообщение, узнайте свой chat id (например, у @userinfobot) и добавьте в
репозитории **Settings → Secrets and variables → Actions** два секрета:
`TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. Без них workflow просто не шлёт
сообщения в Telegram.

GitHub Actions по расписанию иногда запускается с задержкой в несколько минут и
отключает расписание, если в репозитории 60 дней не было коммитов — тогда
GitHub пришлёт письмо, и расписание включается одной кнопкой во вкладке
**Actions**.

## Вариант для виртуального хостинга (cPanel)

На тарифах ahost.uz с cPanel есть PostgreSQL 16 и Node.js до 24 — сайт
запускается, но иначе, чем на VPS: команду запуска задать нельзя, приложение
поднимает Passenger. Для этого в проекте лежит `server.js`.

1. **База:** cPanel → *PostgreSQL Databases* → создать базу и пользователя,
   выдать все права. Строку подключения собрать из выданных логина и пароля.
2. **Код:** cPanel → *Git Version Control* → клонировать
   `https://github.com/kamol-it/mytax-news.git` (или загрузить архивом).
3. **Приложение:** cPanel → *Setup Node.js App*:
   - Node.js version — 20 или новее;
   - Application root — папка проекта;
   - Application startup file — `server.js`;
   - в разделе *Environment variables* задать те же переменные, что и выше.
4. **Установка и сборка** — в терминале cPanel, войдя в окружение приложения
   (кнопка *Enter to the virtual environment* копирует нужную команду):
   ```bash
   npm ci
   npm run db:push
   npm run db:seed        # только при первом запуске
   npm run build
   ```
5. Перезапустить приложение кнопкой *Restart*.

Что учесть на виртуальном хостинге:

- **Сборке нужно около 1 ГБ памяти.** Если тариф режет процессы, соберите
  проект локально и загрузите каталог `.next` вместе с исходниками.
- **Место на диске:** `node_modules` и `.next` занимают около 1,5 ГБ, плюс
  загруженные фото и видео. Тарифы на 500 МБ – 2 ГБ не подойдут.
- **Лимит размера загрузки** задаётся хостером; если видео не проходит,
  просите поднять `client_max_body_size` или используйте ссылки на YouTube.
- Файлы пишутся в `public/uploads` внутри проекта — при переустановке
  приложения не удаляйте этот каталог.

## Резервные копии

Копировать нужно и базу, и файлы — по отдельности они бесполезны.
Скрипт `deploy/mytax-backup.sh` делает обе копии в `/var/backups/mytax`
и хранит последние 14 дней:

```bash
sudo install -m 755 /var/www/mytax/deploy/mytax-backup.sh /usr/local/bin/
echo "30 3 * * * root /usr/local/bin/mytax-backup.sh" | sudo tee /etc/cron.d/mytax-backup
sudo /usr/local/bin/mytax-backup.sh && ls -l /var/backups/mytax
```

Копии лежат на том же сервере, поэтому от потери самого сервера не спасают:
включите бэкапы или снапшоты у провайдера либо периодически забирайте каталог
к себе (`rsync`/`scp`).

Восстановление базы из копии:

```bash
gunzip -c /var/backups/mytax/db-ДАТА.sql.gz | sudo -u postgres psql -d mytax
```

## Возможные проблемы

| Симптом | Причина и решение |
| --- | --- |
| `413 Request Entity Too Large` при загрузке | не поднят `client_max_body_size` в nginx |
| Ограничение частоты срабатывает на всех сразу | nginx не передаёт `X-Real-IP` / `X-Forwarded-For` |
| «Не задана строка подключения к базе» при сборке | нет `DATABASE_URL` в `.env` или файл недоступен пользователю `mytax` |
| Вход в админку не сохраняется | сайт открыт по http: cookie сессии выставляется с флагом `Secure` |
| Сборка падает по памяти | добавьте swap: 2 ГБ достаточно |
| `unknown directive "http2"` при `nginx -t` | nginx старше 1.25.1: используйте `listen 443 ssl http2;` вместо `http2 on;` |
| `nginx -t` ругается на отсутствующий сертификат | основной конфиг поставлен до выпуска сертификата — сначала `nginx-bootstrap.conf.example` |
| Ошибка 521/525 от Cloudflare | на сервере не слушается 443 или нет сертификата, а в Cloudflare стоит Full (strict) |
| За Cloudflare лимит срабатывает на всех сразу | не подключён `cloudflare-realip.conf`, nginx видит адреса Cloudflare |
| `mytax.uz/admin` отдаёт 404 | так и задумано при `ADMIN_HOST`: админка на поддомене |
| Поддомен админки не открывается, вход недоступен | `ADMIN_HOST` включён раньше, чем поддомен и сертификат: уберите переменную, перезапустите службу, настройте поддомен |
| Домен «не найден» сразу после настройки DNS | кеш DNS на компьютере или в браузере: `sudo dscacheutil -flushcache` (macOS), перезапуск браузера |
