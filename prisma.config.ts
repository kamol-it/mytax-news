import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: адрес БД для CLI (migrate / db push / studio / seed) живёт здесь,
// а не в schema.prisma. Клиент подключается через адаптер в src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
