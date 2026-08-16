/**
 * Точка входа для хостингов с Passenger (cPanel → «Setup Node.js App»).
 *
 * Там нельзя задать команду запуска: панель сама загружает указанный файл и
 * передаёт порт через PORT. Обычный `next start` в такой схеме не работает,
 * поэтому поднимаем сервер Next вручную.
 *
 * На своём VPS этот файл не нужен — там запускается `npm start`.
 */
const http = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => {
        handle(req, res).catch((error) => {
          console.error("Ошибка обработки запроса:", error);
          res.statusCode = 500;
          res.end("Internal Server Error");
        });
      })
      .listen(port, hostname, () => {
        console.log(`MYTAX запущен на http://${hostname}:${port}`);
      });
  })
  .catch((error) => {
    console.error("Не удалось запустить приложение:", error);
    process.exit(1);
  });
