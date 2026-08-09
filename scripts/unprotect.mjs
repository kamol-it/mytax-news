#!/usr/bin/env node
/**
 * Снимает Vercel Authentication с проекта.
 *
 * Vercel включает защиту деплоя заново после каждого нового деплоя, и тогда
 * сайт вместо страниц отдаёт редирект на vercel.com/login — клиент его не откроет.
 * Скрипт вызывается после `vercel deploy` (см. npm script "deploy").
 *
 * Когда сайт переедет на свой домен (mytax.uz), надобность пропадёт:
 * защита действует на *.vercel.app, но не на кастомные домены.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PROJECT = process.env.VERCEL_PROJECT ?? "mytax-news";

const body = path.join(mkdtempSync(path.join(tmpdir(), "unprotect-")), "body.json");
writeFileSync(body, JSON.stringify({ ssoProtection: null }));

const out = execFileSync(
  "npx",
  ["vercel", "api", "-X", "PATCH", `/v9/projects/${PROJECT}`, "--input", body],
  { encoding: "utf8" },
);

const json = JSON.parse(out.slice(out.indexOf("{")));
if (json.ssoProtection === null) {
  console.log("Защита деплоя снята — сайт открыт без входа в Vercel.");
} else {
  console.error("Не удалось снять защиту:", json.ssoProtection);
  process.exit(1);
}
