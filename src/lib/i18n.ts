export const locales = ["uz", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uz";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeNames: Record<Locale, string> = {
  uz: "O‘zbekcha",
  ru: "Русский",
  en: "English",
};

export type Dictionary = {
  siteName: string;
  tagline: string;
  nav: { home: string; all: string; search: string };
  latest: string;
  featured: string;
  readMore: string;
  views: string;
  searchPlaceholder: string;
  searchTitle: string;
  nothingFound: string;
  noArticles: string;
  categories: string;
  publishedOn: string;
  backToNews: string;
  relatedNews: string;
  page: string;
  prev: string;
  next: string;
  adminPanel: string;
  footerAbout: string;
  footerRights: string;
};

const dictionaries: Record<Locale, Dictionary> = {
  uz: {
    siteName: "MYTAX",
    tagline: "Soliq yangiliklari portali",
    nav: { home: "Bosh sahifa", all: "Barcha yangiliklar", search: "Qidiruv" },
    latest: "So‘nggi yangiliklar",
    featured: "Asosiy",
    readMore: "Batafsil",
    views: "ko‘rishlar",
    searchPlaceholder: "Yangiliklardan qidirish…",
    searchTitle: "Qidiruv natijalari",
    nothingFound: "Hech narsa topilmadi.",
    noArticles: "Hozircha yangiliklar yo‘q.",
    categories: "Ruknlar",
    publishedOn: "Nashr etilgan",
    backToNews: "Yangiliklarga qaytish",
    relatedNews: "O‘xshash yangiliklar",
    page: "Sahifa",
    prev: "Oldingi",
    next: "Keyingi",
    adminPanel: "Boshqaruv paneli",
    footerAbout:
      "MYTAX — O‘zbekistondagi soliq qonunchiligi, hisobot va biznes uchun yangiliklar portali.",
    footerRights: "Barcha huquqlar himoyalangan.",
  },
  ru: {
    siteName: "MYTAX",
    tagline: "Портал налоговых новостей",
    nav: { home: "Главная", all: "Все новости", search: "Поиск" },
    latest: "Последние новости",
    featured: "Главное",
    readMore: "Подробнее",
    views: "просмотров",
    searchPlaceholder: "Поиск по новостям…",
    searchTitle: "Результаты поиска",
    nothingFound: "Ничего не найдено.",
    noArticles: "Новостей пока нет.",
    categories: "Рубрики",
    publishedOn: "Опубликовано",
    backToNews: "Ко всем новостям",
    relatedNews: "Похожие новости",
    page: "Страница",
    prev: "Назад",
    next: "Вперёд",
    adminPanel: "Админ-панель",
    footerAbout:
      "MYTAX — новости налогового законодательства, отчётности и бизнеса в Узбекистане.",
    footerRights: "Все права защищены.",
  },
  en: {
    siteName: "MYTAX",
    tagline: "Tax news portal",
    nav: { home: "Home", all: "All news", search: "Search" },
    latest: "Latest news",
    featured: "Top story",
    readMore: "Read more",
    views: "views",
    searchPlaceholder: "Search the news…",
    searchTitle: "Search results",
    nothingFound: "Nothing found.",
    noArticles: "No news yet.",
    categories: "Categories",
    publishedOn: "Published",
    backToNews: "Back to all news",
    relatedNews: "Related news",
    page: "Page",
    prev: "Previous",
    next: "Next",
    adminPanel: "Admin panel",
    footerAbout:
      "MYTAX — news on tax law, reporting and business in Uzbekistan.",
    footerRights: "All rights reserved.",
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Достаёт локализованное поле вида titleUz / titleRu / titleEn с фолбэком. */
export function pickLocalized<T extends Record<string, unknown>>(
  row: T,
  base: string,
  locale: Locale,
): string {
  const order: Locale[] = [locale, ...locales.filter((l) => l !== locale)];
  for (const l of order) {
    const key = `${base}${l[0].toUpperCase()}${l.slice(1)}`;
    const value = row[key as keyof T];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

const dateLocales: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(d);
}
