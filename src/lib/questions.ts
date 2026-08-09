import { randomBytes } from "node:crypto";

/** Код ветки в ссылке: короткий, но неугадываемый. */
export function newToken(): string {
  return randomBytes(12).toString("base64url");
}

export type ThreadMessage = {
  id: string;
  author: "visitor" | "consultant";
  body: string;
  authorName: string;
  createdAt: Date;
};

/**
 * Сообщения ветки. У обращений из старой формы текст лежит в Question.body —
 * показываем его первым сообщением, чтобы ничего не потерялось.
 */
export function threadMessages(question: {
  body: string;
  name: string;
  createdAt: Date;
  messages: {
    id: string;
    author: string;
    body: string;
    authorName: string;
    createdAt: Date;
  }[];
}): ThreadMessage[] {
  const messages: ThreadMessage[] = question.messages.map((m) => ({
    id: m.id,
    author: m.author === "consultant" ? "consultant" : "visitor",
    body: m.body,
    authorName: m.authorName,
    createdAt: m.createdAt,
  }));

  if (question.body.trim() !== "") {
    messages.unshift({
      id: `legacy-${question.createdAt.getTime()}`,
      author: "visitor",
      body: question.body,
      authorName: question.name,
      createdAt: question.createdAt,
    });
  }

  return messages;
}
