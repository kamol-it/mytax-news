import { prisma } from "@/lib/prisma";

/** Ссылки на соцсети и прочие настройки, редактируемые в админке. */
export const SOCIAL_KEYS = [
  { key: "social_telegram", label: "Telegram", placeholder: "https://t.me/mytaxuz" },
  { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/mytax.uz" },
  { key: "social_facebook", label: "Facebook", placeholder: "https://facebook.com/mytaxuz" },
  { key: "social_youtube", label: "YouTube", placeholder: "https://youtube.com/@mytaxuz" },
  { key: "social_x", label: "X (Twitter)", placeholder: "https://x.com/mytaxuz" },
  { key: "contact_email", label: "Email редакции", placeholder: "info@mytax.uz" },
] as const;

export type SettingKey = (typeof SOCIAL_KEYS)[number]["key"];

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Только заполненные ссылки на соцсети, в порядке из SOCIAL_KEYS. */
export async function getSocialLinks(): Promise<
  { key: string; label: string; url: string }[]
> {
  const settings = await getSettings();
  return SOCIAL_KEYS.filter((s) => s.key.startsWith("social_"))
    .map((s) => ({ key: s.key, label: s.label, url: (settings[s.key] ?? "").trim() }))
    .filter((s) => s.url !== "");
}
