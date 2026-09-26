import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mytax_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 часов

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
  /**
   * Отпечаток пароля на момент входа (см. passwordVersion в auth.ts).
   * После смены пароля он перестаёт совпадать, и старые сессии недействительны.
   */
  pv?: string;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET не задан (нужна строка не короче 16 символов)");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "ADMIN" ? "ADMIN" : "EDITOR",
      pv: typeof payload.pv === "string" ? payload.pv : undefined,
    };
  } catch {
    return null;
  }
}
