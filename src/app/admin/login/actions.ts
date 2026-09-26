"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sessionTokenFor, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/client-ip";
import {
  hasMark,
  isRateLimited,
  rateLimit,
  resetRateLimit,
  setMark,
} from "@/lib/rate-limit";

export type LoginState = { error?: string };

/** Адрес запроса из заголовков прокси — для лимита попыток входа. */
async function requestIp(): Promise<string> {
  return clientIpFromHeaders(await headers());
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Введите email и пароль." };
  }

  // Подбор пароля ограничиваем так, чтобы посторонний не мог заблокировать
  // вход владельцу учётной записи:
  // - с одного адреса — не больше 10 попыток за 15 минут;
  // - для пары «email + адрес» — не больше 5 попыток за 15 минут;
  // - если на учётную запись пришло больше 20 неудачных попыток за час
  //   (подбор с многих адресов), вход открыт только с адресов, откуда
  //   этот пользователь уже успешно входил за последние 30 дней.
  const ip = await requestIp();
  const account = email.slice(0, 254);
  const pairKey = `login-pair:${account}|${ip}`;
  const byIp = await rateLimit(`login-ip:${ip}`, 10, 900);
  const byPair = await rateLimit(pairKey, 5, 900);

  if (!byIp.allowed || !byPair.allowed) {
    const minutes = Math.ceil(Math.max(byIp.retryAfter, byPair.retryAfter) / 60);
    return {
      error: `Слишком много попыток входа. Повторите через ${minutes} мин.`,
    };
  }

  const failuresKey = `login-email:${account}`;
  const knownKey = `login-known:${account}|${ip}`;
  if ((await isRateLimited(failuresKey, 20)) && !(await hasMark(knownKey))) {
    return {
      error: "Слишком много попыток входа в эту учётную запись. Повторите позже.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Сравниваем всегда, чтобы не отличать «нет пользователя» от «неверный пароль».
  const hash = user?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    await rateLimit(failuresKey, 20, 3600);
    return { error: "Неверный email или пароль." };
  }

  await Promise.all([
    resetRateLimit(`login-ip:${ip}`),
    resetRateLimit(pairKey),
    setMark(knownKey, 30 * 86_400),
  ]);

  await setSessionCookie(await sessionTokenFor(user));

  redirect(next.startsWith("/admin") ? next : "/admin");
}
