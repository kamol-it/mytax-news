"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

/** Root layout не знает локаль, поэтому выставляем <html lang> на клиенте. */
export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
