import { clientIpFromHeaders } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";

/**
 * Ограничение частоты запросов на базе БД.
 *
 * В памяти считать нельзя: на хостинге несколько инстансов, и счётчик в одном
 * не виден другому. Окно фиксированное — для защиты от спама и подбора пароля
 * этого достаточно, а точность скользящего окна здесь не нужна.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // Окно истекло или счётчика не было — начинаем заново
    if (!existing || existing.expiresAt <= now) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, expiresAt },
        create: { key, count: 1, expiresAt },
      });
      return { allowed: true, remaining: limit - 1, retryAfter: 0 };
    }

    if (existing.count >= limit) {
      const retryAfter = Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfter };
    }

    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, remaining: Math.max(0, limit - updated.count), retryAfter: 0 };
  } catch {
    // База недоступна — не блокируем работу сайта из-за счётчика
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Сбрасывает счётчик, например после удачного входа. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.delete({ where: { key } }).catch(() => undefined);
}

/** IP запроса — см. clientIpFromHeaders о том, каким заголовкам можно верить. */
export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
