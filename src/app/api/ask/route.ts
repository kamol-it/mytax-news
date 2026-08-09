import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/questions";
import { sendPushToAdmins } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_BODY = 4000;

/** Создание обращения из чат-виджета. */
export async function POST(request: Request) {
  const limit = await rateLimit(`ask:${clientIp(request)}`, 5, 3600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много обращений. Попробуйте позже." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const data = (await request.json().catch(() => null)) as {
    name?: string;
    contact?: string;
    topic?: string;
    body?: string;
    locale?: string;
  } | null;

  const name = (data?.name ?? "").trim().slice(0, 120);
  const contact = (data?.contact ?? "").trim().slice(0, 160);
  const topic = (data?.topic ?? "").trim().slice(0, 160);
  const body = (data?.body ?? "").trim().slice(0, MAX_BODY);
  const locale = (data?.locale ?? "ru").slice(0, 5);

  if (!name || !contact) {
    return NextResponse.json({ error: "Укажите имя и контакт." }, { status: 400 });
  }
  if (body.length < 10) {
    return NextResponse.json(
      { error: "Опишите вопрос подробнее — минимум 10 символов." },
      { status: 400 },
    );
  }

  const token = newToken();
  const question = await prisma.question.create({
    data: {
      token,
      name,
      contact,
      topic,
      locale,
      lastMessageAt: new Date(),
      messages: { create: { author: "visitor", body, authorName: name } },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  await sendPushToAdmins({
    title: "Новый вопрос консультанту",
    body: `${name}: ${body.slice(0, 120)}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/questions`,
    tag: "mytax-question",
  });

  return NextResponse.json({
    token,
    answered: question.answered,
    closed: question.closed,
    messages: question.messages.map((m) => ({
      id: m.id,
      author: m.author,
      body: m.body,
      authorName: m.authorName,
      createdAt: m.createdAt,
    })),
  });
}
