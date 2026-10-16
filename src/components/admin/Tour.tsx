"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Driver } from "driver.js";
import { tours, type TourId, type TourStep } from "./tours";
import "driver.js/dist/driver.css";
import "./tour.css";

const doneKey = (id: TourId) => `mytax-tour:${id}`;

function readDone(id: TourId): boolean {
  try {
    return localStorage.getItem(doneKey(id)) === "done";
  } catch {
    return false;
  }
}

function markDone(id: TourId) {
  try {
    localStorage.setItem(doneKey(id), "done");
  } catch {
    // приватный режим: просто покажем тур ещё раз в следующий визит
  }
}

/** Первый видимый элемент: у меню и кнопки «Сохранить» есть мобильный и десктопный вариант. */
function visible(name: string): Element | undefined {
  return Array.from(document.querySelectorAll(`[data-tour="${name}"]`)).find(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Интерактивное обучение: затемнение, подсветка элемента, карточка с пояснением.
 * Запускается само при первом визите на страницу, по ?tour=<id> и кнопкой «Обучение».
 */
export function Tour({ id }: { id: TourId }) {
  const active = useRef<Driver | null>(null);

  const start = useCallback(async () => {
    active.current?.destroy();
    const { driver } = await import("driver.js");

    const list: TourStep[] = tours[id];
    const steps = list.flatMap((s) => {
      const popover = { title: s.title, description: s.text, side: s.side, align: "start" as const };
      if (!s.el) return [{ popover }];
      const element = visible(s.el);
      return element ? [{ element, popover }] : [];
    });
    if (steps.length === 0) return;

    const d = driver({
      steps,
      animate: true,
      smoothScroll: true,
      showProgress: steps.length > 1,
      progressText: "{{current}} из {{total}}",
      nextBtnText: "Далее →",
      prevBtnText: "← Назад",
      doneBtnText: "Понятно",
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: "mytax-tour",
      onDestroyed: () => {
        markDone(id);
        active.current = null;
      },
    });
    active.current = d;
    d.drive();
  }, [id]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tour") === id;
    if (!requested && readDone(id)) return;
    // Даём странице дорисоваться, чтобы подсветка встала на место
    const timer = window.setTimeout(start, requested ? 300 : 900);
    return () => {
      window.clearTimeout(timer);
      active.current?.destroy();
    };
  }, [id, start]);

  return (
    <button
      type="button"
      onClick={start}
      data-tour="tour-button"
      title="Обучение по этой странице"
      className="tour-fab fixed bottom-20 right-4 z-30 flex h-11 w-11 items-center justify-center gap-1.5 rounded-full bg-ink text-sm font-semibold text-white shadow-lg transition hover:bg-ink-dark sm:bottom-6 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
      aria-label="Пройти обучение по этой странице"
    >
      <span aria-hidden>✨</span>
      <span className="hidden sm:inline">Обучение</span>
    </button>
  );
}
