import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { threadMessages } from "@/lib/questions";
import { sendPushToAdmins } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_BODY = 4000;

async function loadThread(token: string) {
  return prisma.question.findUnique({
    where: { token },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

function serialize(question: NonNullable<Awaited<ReturnType<typeof loadThread>>>) {
  // Контакт посетителя наружу не отдаём: виджету он не нужен,
  // а ссылка с кодом ветки может попасть в чужие руки
  return {
    token: question.token,
    name: question.name,
    topic: question.topic,
    answered: question.answered,
    closed: question.closed,
    messages: threadMessages(question).map((m) => ({
      id: m.id,
      author: m.author,
      body: m.body,
      authorName: m.authorName,
      createdAt: m.createdAt,
    })),
  };
}

/** Чтение ветки: виджет опрашивает её, пока открыт. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const question = await loadThread(token);
  if (!question) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(serialize(question));
}

/** Сообщение посетителя в ветке. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const limit = await rateLimit(`ask-msg:${clientIp(request)}`, 30, 600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком часто. Подождите немного." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const data = (await request.json().catch(() => null)) as { body?: string } | null;
  const body = (data?.body ?? "").trim().slice(0, MAX_BODY);

  if (body.length < 2) {
    return NextResponse.json({ error: "Напишите сообщение." }, { status: 400 });
  }

  const question = await loadThread(token);
  if (!question) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (question.closed) {
    return NextResponse.json({ error: "Обращение закрыто." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.questionMessage.create({
      data: { questionId: question.id, author: "visitor", body, authorName: question.name },
    }),
    prisma.question.update({
      where: { id: question.id },
      data: { answered: false, lastMessageAt: new Date() },
    }),
  ]);

  await sendPushToAdmins({
    title: "Ответ посетителя в обращении",
    body: `${question.name}: ${body.slice(0, 120)}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/questions`,
    tag: "mytax-question",
  });

  const updated = await loadThread(token);
  return NextResponse.json(serialize(updated!));
}
