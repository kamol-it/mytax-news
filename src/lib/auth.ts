import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/session";

export { SESSION_COOKIE, signSession, verifySession } from "@/lib/session";
export type { SessionPayload } from "@/lib/session";

const MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * Версия пароля для сессии: HMAC от id и хеша пароля. Меняется при любой
 * смене пароля, поэтому сброс пароля администратором или самим пользователем
 * сразу завершает все его прежние сессии. Сам хеш в токен не попадает.
 */
export function passwordVersion(user: { id: string; password: string }): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret)
    .update(`${user.id}:${user.password}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Токен сессии для пользователя из базы. */
export async function sessionTokenFor(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  password: string;
}): Promise<string> {
  return signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "ADMIN" ? "ADMIN" : "EDITOR",
    pv: passwordVersion(user),
  });
}

/**
 * Текущая сессия из cookie (для server components, server actions и API).
 *
 * Подписи JWT недостаточно: токен живёт 12 часов. Поэтому пользователь
 * каждый раз читается из базы — удалённый пользователь теряет доступ сразу,
 * роль берётся из базы, а после смены пароля старые токены недействительны.
 * cache() — один запрос к базе на весь рендер.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!token) return null;

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { id: true, email: true, name: true, role: true, password: true },
  });
  if (!user || token.pv !== passwordVersion(user)) return null;

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "ADMIN" ? "ADMIN" : "EDITOR",
    pv: token.pv,
  };
});

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
