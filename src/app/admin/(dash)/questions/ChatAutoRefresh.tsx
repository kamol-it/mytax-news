"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Подтягивает новые сообщения, пока раздел открыт. */
export function ChatAutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
