import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:info@mytax.uz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

type Filter = { admin?: boolean; questionToken?: string };

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  image?: string | null;
  tag?: string;
};

/** Уведомление сотрудникам: подписки, оформленные из админки. */
export async function sendPushToAdmins(payload: PushPayload) {
  return sendPush(payload, { admin: true });
}

/** Уведомление посетителю, подписавшемуся на ответ в своей ветке. */
export async function sendPushToQuestion(token: string, payload: PushPayload) {
  return sendPush(payload, { questionToken: token });
}

/** Рассылка читателям сайта: без подписок сотрудников и веток вопросов. */
export async function sendPushToAll(payload: PushPayload) {
  return sendPush(payload, { admin: false, questionToken: "" });
}

/** Отправка по выборке подписок с той же обработкой мёртвых endpoint-ов. */
async function sendPush(payload: PushPayload, filter: Filter) {
  if (!pushConfigured()) return { sent: 0, removed: 0, failed: 0 };
  configure();

  const subscriptions = await prisma.pushSubscription.findMany({ where: filter });
  const body = JSON.stringify(payload);

  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          removed += 1;
        } else {
          failed += 1;
        }
      }
    }),
  );

  return { sent, removed, failed };
}
