import "dotenv/config";
import { defineConfig } from "prisma/config";
import { findDatabaseUrl } from "./src/lib/db-url";

// Prisma 7: адрес БД для CLI (migrate / db push / studio / seed) живёт здесь,
// а не в schema.prisma. Клиент подключается через адаптер в src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // Пустая строка вместо ошибки: prisma generate вызывается в postinstall,
  // когда переменных окружения с базой может ещё не быть.
  datasource: {
    url: findDatabaseUrl() ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
