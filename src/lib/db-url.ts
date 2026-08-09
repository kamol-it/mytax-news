/**
 * Разные хостинги называют строку подключения по-своему:
 * Neon и свой сервер — DATABASE_URL, Supabase и старый Vercel Postgres — POSTGRES_URL.
 * Берём первую заполненную, чтобы деплой не падал из-за имени переменной.
 */
const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

/** Строка подключения или undefined. Годится там, где база может быть не нужна. */
export function findDatabaseUrl(): string | undefined {
  for (const name of CANDIDATES) {
    const value = process.env[name];
    if (value && value.trim() !== "") return value;
  }
  return undefined;
}

export function databaseUrl(): string {
  const url = findDatabaseUrl();
  if (!url) {
    throw new Error(
      `Не задана строка подключения к базе. Ожидается одна из переменных: ${CANDIDATES.join(", ")}`,
    );
  }
  return url;
}
