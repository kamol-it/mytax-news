import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import {
  MAX_ENDPOINT_LENGTH,
  isValidPushEndpoint,
  isValidPushKeys,
} from "@/lib/push-endpoint";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Предел числа подписок в базе: защищает от заполнения таблицы мусором
 * даже при обходе лимита по IP. Для новостного сайта с запасом.
 */
const MAX_SUBSCRIPTIONS = 50_000;

/** Браузер присылает свою подписку после разрешения уведомлений. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`push-sub:${ip}`, 10, 600);
  const daily = limit.allowed
    ? await rateLimit(`push-sub-day:${ip}`, 50, 86_400)
    : limit;
  if (!limit.allowed || !daily.allowed) {
    return NextResponse.json({ error: "Слишком часто" }, { status: 429 });
  }

  const data = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
        locale?: string;
        questionToken?: string;
        admin?: boolean;
      }
    | null;

  const endpoint = data?.endpoint;
  const p256dh = data?.keys?.p256dh;
  const auth = data?.keys?.auth;

  // Сервер будет сам отправлять запросы на endpoint — принимаем только
  // адреса push-сервисов браузеров, иначе это SSRF.
  if (!isValidPushEndpoint(endpoint) || !isValidPushKeys(p256dh, auth)) {
    return NextResponse.json({ error: "Некорректная подписка" }, { status: 400 });
  }

  const known = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: { id: true },
  });
  if (!known && (await prisma.pushSubscription.count()) >= MAX_SUBSCRIPTIONS) {
    return NextResponse.json({ error: "Подписка временно недоступна" }, { status: 503 });
  }

  // Подписку сотрудника оформляем только при действующей сессии админки
  const admin = data?.admin === true ? Boolean(await getSession()) : false;
  const questionToken = String(data?.questionToken ?? "").slice(0, 64);

  const locale = String(data?.locale ?? "");

  const fields = {
    p256dh: p256dh as string,
    auth: auth as string,
    locale: isLocale(locale) ? locale : "uz",
    admin,
    questionToken,
  };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: fields,
    create: {
      endpoint,
      ...fields,
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Отписка: браузер сообщает, что уведомления больше не нужны. */
export async function DELETE(request: Request) {
  const data = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (typeof data?.endpoint !== "string" || data.endpoint.length > MAX_ENDPOINT_LENGTH) {
    return NextResponse.json({ error: "Нет endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription
    .delete({ where: { endpoint: data.endpoint } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
