#!/usr/bin/env node
/**
 * Применяет схему к базе перед сборкой.
 *
 * `prisma db push` отказывается работать, когда изменение может задеть данные
 * (удаление колонки, новый уникальный индекс). Молча передавать
 * --accept-data-loss в сборке опасно: однажды это удалит нужную колонку.
 * Поэтому флаг включается только явной переменной ALLOW_SCHEMA_DATA_LOSS=1
 * и предупреждения выводятся в лог сборки.
 */
import { spawnSync } from "node:child_process";

function push(extraArgs = []) {
  return spawnSync("npx", ["prisma", "db", "push", ...extraArgs], {
    encoding: "utf8",
    env: process.env,
  });
}

const first = push();
process.stdout.write(first.stdout ?? "");
process.stderr.write(first.stderr ?? "");

if (first.status === 0) process.exit(0);

const output = `${first.stdout ?? ""}${first.stderr ?? ""}`;
const needsFlag = output.includes("--accept-data-loss");

if (!needsFlag) {
  console.error("prisma db push завершился ошибкой (см. вывод выше).");
  process.exit(first.status ?? 1);
}

if (process.env.ALLOW_SCHEMA_DATA_LOSS !== "1") {
  console.error(
    "\nСхема требует изменения, которое Prisma считает рискованным (см. предупреждения выше).\n" +
      "Проверьте их и, если данные не пострадают, задайте ALLOW_SCHEMA_DATA_LOSS=1 для этого деплоя.",
  );
  process.exit(first.status ?? 1);
}

console.warn("\nALLOW_SCHEMA_DATA_LOSS=1 — повторяю с --accept-data-loss.");
const second = push(["--accept-data-loss"]);
process.stdout.write(second.stdout ?? "");
process.stderr.write(second.stderr ?? "");
process.exit(second.status ?? 1);
