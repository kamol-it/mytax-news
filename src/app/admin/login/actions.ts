"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

/** Адрес запроса из заголовков прокси — для лимита попыток входа. */
async function requestIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return store.get("x-real-ip")?.slice(0, 64) ?? "unknown";
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

  // Подбор пароля: не больше 10 попыток за 15 минут с адреса
  // и не больше 5 попыток для одной учётной записи.
  const ip = await requestIp();
  const byIp = await rateLimit(`login-ip:${ip}`, 10, 900);
  const byEmail = await rateLimit(`login-email:${email}`, 5, 900);

  if (!byIp.allowed || !byEmail.allowed) {
    const minutes = Math.ceil(Math.max(byIp.retryAfter, byEmail.retryAfter) / 60);
    return {
      error: `Слишком много попыток входа. Повторите через ${minutes} мин.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Сравниваем всегда, чтобы не отличать «нет пользователя» от «неверный пароль».
  const hash = user?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return { error: "Неверный email или пароль." };
  }

  await Promise.all([
    resetRateLimit(`login-ip:${ip}`),
    resetRateLimit(`login-email:${email}`),
  ]);

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "ADMIN" ? "ADMIN" : "EDITOR",
  });
  await setSessionCookie(token);

  redirect(next.startsWith("/admin") ? next : "/admin");
}
