import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/db-url";

// Prisma 7: адрес БД для CLI (migrate / db push / studio / seed) живёт здесь,
// а не в schema.prisma. Клиент подключается через адаптер в src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl(),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
