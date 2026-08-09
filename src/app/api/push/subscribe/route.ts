import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Браузер присылает свою подписку после разрешения уведомлений. */
export async function POST(request: Request) {
  const data = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
        locale?: string;
      }
    | null;

  const endpoint = data?.endpoint;
  const p256dh = data?.keys?.p256dh;
  const auth = data?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Некорректная подписка" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, locale: data?.locale ?? "uz" },
    create: {
      endpoint,
      p256dh,
      auth,
      locale: data?.locale ?? "uz",
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
