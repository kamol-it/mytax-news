/**
 * Проверка push-подписок, присланных браузером.
 *
 * Сервер сам отправляет POST на endpoint подписки, поэтому без проверки
 * посетитель мог бы заставить его стучаться на любой адрес, включая
 * внутренние сервисы (SSRF). Разрешаем только https-адреса известных
 * push-сервисов браузеров.
 *
 * Модуль без зависимостей от Next и Prisma — его можно проверять тестами.
 */

export const MAX_ENDPOINT_LENGTH = 2048;

/** Точные имена хостов push-сервисов. */
const EXACT_HOSTS = new Set([
  "fcm.googleapis.com", // Chrome, Edge (Chromium), Opera, Samsung Internet
  "android.googleapis.com", // старые подписки Chrome/GCM
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari
]);

/** Суффиксы: у Mozilla, Microsoft и Apple бывают региональные поддомены. */
const HOST_SUFFIXES = [
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.apple.com",
];

export function isAllowedPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (EXACT_HOSTS.has(host)) return true;
  return HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}

/** endpoint допустим: https, стандартный порт, без логина, хост из белого списка. */
export function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string") return false;
  if (endpoint.length === 0 || endpoint.length > MAX_ENDPOINT_LENGTH) return false;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port !== "" && url.port !== "443") return false;
  return isAllowedPushHost(url.hostname);
}

const BASE64 = /^[A-Za-z0-9_\-+/]+={0,2}$/;

function decodedLength(value: unknown, maxChars: number): number | null {
  if (typeof value !== "string" || value.length > maxChars || !BASE64.test(value)) {
    return null;
  }
  // Буфер Node понимает и обычный base64, и base64url
  return Buffer.from(value, "base64").length;
}

/**
 * Ключи подписки: p256dh — несжатая точка P-256 (65 байт),
 * auth — секрет длиной 16 байт. Оба приходят в base64url.
 */
export function isValidPushKeys(p256dh: unknown, auth: unknown): boolean {
  if (decodedLength(p256dh, 100) !== 65) return false;
  if (decodedLength(auth, 32) !== 16) return false;
  return Buffer.from(p256dh as string, "base64")[0] === 0x04;
}
