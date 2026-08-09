import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Браузер присылает свою подписку после разрешения уведомлений. */
export async function POST(request: Request) {
  const limit = await rateLimit(`push-sub:${clientIp(request)}`, 10, 600);
  if (!limit.allowed) {
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

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Некорректная подписка" }, { status: 400 });
  }

  // Подписку сотрудника оформляем только при действующей сессии админки
  const admin = data?.admin === true ? Boolean(await getSession()) : false;
  const questionToken = String(data?.questionToken ?? "").slice(0, 64);

  const fields = {
    p256dh,
    auth,
    locale: data?.locale ?? "uz",
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
  if (!data?.endpoint) {
    return NextResponse.json({ error: "Нет endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription
    .delete({ where: { endpoint: data.endpoint } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
