# MYTAX.uz — новостной портал о налогах

Новостной сайт с админ-панелью: публикация новостей на трёх языках (uz / ru / en),
загрузка фотографий и видео, рубрики, поиск, SEO-разметка и sitemap.

Стек: **Next.js 16** (App Router, Server Actions) · **Prisma 7 + PostgreSQL** ·
**Tailwind CSS 4** · сессии на JWT в httpOnly-cookie (`jose` + `bcryptjs`).
Загруженные файлы хранятся в `public/uploads` локально и в Vercel Blob на хостинге.

## Быстрый старт

```bash
npm install
docker compose up -d   # локальный PostgreSQL на порту 5433
cp .env.example .env   # вписать DATABASE_URL и AUTH_SECRET
npm run db:push        # создать схему
npm run db:seed        # админ + рубрики + примеры новостей
npm run dev
```

Строка подключения для локальной базы из `docker-compose.yml`:
`postgresql://mytax:mytax@localhost:5433/mytax?schema=public`.
Секрет сессий: `openssl rand -hex 32`.

Сайт: http://localhost:3000 (редирект на язык браузера) · Админка: http://localhost:3000/admin

Демо-доступ после `db:seed`: `admin@mytax.uz` и пароль из `SEED_ADMIN_PASSWORD` (по умолчанию `mytax2026`) — **смените пароль перед публикацией сайта.**

## Переменные окружения

Файл `.env` (пример — в `.env.example`):

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | строка подключения к PostgreSQL; вместо неё подходит `POSTGRES_URL`, которую добавляют некоторые интеграции |
| `AUTH_SECRET` | секрет для подписи сессий, минимум 16 символов (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | публичный адрес сайта, используется в sitemap и OG-метатегах |
| `BLOB_READ_WRITE_TOKEN` | необязательно: если задан, загрузки идут в Vercel Blob вместо `public/uploads` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | необязательно: логин и пароль администратора для `db:seed` |

## Что умеет админка

`/admin` — обзор: счётчики новостей, черновиков, рубрик и файлов, последние изменения.

`/admin/articles` — список с поиском по заголовку, фильтром «опубликованные / черновики»,
переключением публикации в один клик и удалением.

`/admin/articles/new` и `/admin/articles/[id]` — редактор новости:

- вкладки **O‘zbekcha / Русский / English** — заголовок, анонс и текст для каждого языка;
  незаполненный язык автоматически подменяется имеющимся;
- панель форматирования (абзац, подзаголовок, жирный, курсив, список, цитата, ссылка) —
  текст хранится как HTML и очищается от `<script>`, `on*`-атрибутов и `javascript:`-ссылок;
- **обложка** — загрузка изображения (JPEG/PNG/WebP/GIF/AVIF, до 10 МБ);
- **видео** — либо загрузка файла (MP4/WebM/MOV, до 200 МБ), либо ссылка на YouTube
  (встраивается через `youtube-nocookie.com`);
- **фото в текст** — загрузка изображения и вставка `<figure>` в позицию курсора;
- рубрика, ручной slug, флаги «Опубликовать» и «Главная новость».

`/admin/categories` — рубрики (названия на трёх языках, порядок в меню).

`/admin/media` — все загруженные файлы с предпросмотром и удалением (файл удаляется с диска).

## Публичная часть

- `/{uz|ru|en}` — главная: главная новость, лента, топ по просмотрам, список рубрик;
- `/{locale}/news` — все новости с постраничной навигацией;
- `/{locale}/category/{slug}` — новости рубрики;
- `/{locale}/news/{slug}` — новость: обложка, видео, текст, галерея, похожие материалы, счётчик просмотров;
- `/{locale}/search?q=` — поиск по заголовкам, анонсам и тексту;
- `/robots.txt` и `/sitemap.xml` формируются автоматически.

Язык выбирается по префиксу пути; `/` перенаправляется на язык из `Accept-Language`
(по умолчанию `uz`). Переключатель языков в шапке сохраняет текущую страницу.

## Структура

```
docker-compose.yml     локальный PostgreSQL для разработки
prisma/schema.prisma   модели User, Category, Article, Media
prisma/seed.ts         админ, рубрики, демо-новости
prisma.config.ts       конфигурация Prisma 7 CLI (адрес БД, seed)
src/proxy.ts           префикс локали + защита /admin
src/lib/               prisma, session/auth, i18n, slug, sanitize, storage
src/components/        шапка, подвал, карточка новости, плеер, пагинация
src/app/[locale]/      публичные страницы
src/app/admin/         вход и панель управления
src/app/api/admin/     загрузка файлов
public/uploads/        загруженные фото и видео (не в git)
```

## Развёртывание на Vercel

1. На vercel.com войти через GitHub → **Add New → Project** → импортировать репозиторий `mytax-news`.
2. **Storage → Create Database → Postgres** и **Create → Blob**, оба подключить к проекту:
   Vercel сам добавит `DATABASE_URL` и `BLOB_READ_WRITE_TOKEN` в переменные окружения.
3. В **Settings → Environment Variables** добавить `AUTH_SECRET` (`openssl rand -hex 32`)
   и `NEXT_PUBLIC_SITE_URL` с адресом деплоя.
4. Deploy. Сборка идёт скриптом `vercel-build`, который перед `next build` применяет схему к базе.
5. Наполнить базу администратором и рубриками:
   ```bash
   npx vercel link && npx vercel env pull .env.production.local
   DATABASE_URL="$(grep '^DATABASE_URL' .env.production.local | cut -d= -f2- | tr -d '\"')" \
     SEED_ADMIN_PASSWORD="ваш-пароль" npm run db:seed
   ```

### Доступ к админке для клиента

Раздел `/admin/users` (только для роли ADMIN): создание учётных записей,
смена пароля любому пользователю, удаление. Клиенту заводится роль **Редактор**;
себя и последнего администратора удалить нельзя. Любой пользователь может
сменить свой пароль там же. Роль сейчас ограничивает только управление
пользователями — новости и рубрики доступны и редактору.

### Публичная ссылка на демо

Vercel включает защиту деплоя (Vercel Authentication) заново после каждого
деплоя, и сайт начинает редиректить на vercel.com/login. Поэтому деплой делается
командой `npm run deploy` — она разворачивает и сразу снимает защиту
(`scripts/unprotect.mjs`). На своём домене защита не действует.

## Развёртывание на своём сервере

1. `npm ci && npm run build`, запуск — `npm start` (порт задаётся `PORT`).
2. Задать `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, применить схему: `npm run db:push`.
3. Без `BLOB_READ_WRITE_TOKEN` файлы пишутся в `public/uploads` — каталог должен лежать
   на постоянном диске и попадать в бэкап вместе с базой.
4. Настроить HTTPS на реверс-прокси: cookie сессии выставляется с флагом `Secure` в production.
5. Поднять на прокси лимит размера тела запроса минимум до 200 МБ, иначе не пройдёт загрузка видео.

## Про GitHub Pages

Pages раздаёт только статические файлы, поэтому админ-панель там работать не может:
вход, сохранение новостей и загрузка медиа — это серверный код и запись в базу.
Для показа заказчику нужен хостинг с Node (Vercel выше или свой сервер).

## Полезные команды

```bash
npm run dev        # разработка
npm run build      # production-сборка
npm run db:studio  # Prisma Studio — просмотр и правка данных
npm run lint       # ESLint
npx tsc --noEmit   # проверка типов
```
