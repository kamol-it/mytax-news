"use client";

import { useEffect, useRef } from "react";

/** Держит переписку прокрученной к последнему сообщению. */
export function ScrollToBottom({ trigger }: { trigger: string | number }) {
  const anchor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      anchor.current?.scrollIntoView({ block: "end" });
    }, 0);
    return () => clearTimeout(timer);
  }, [trigger]);

  return <div ref={anchor} />;
}
