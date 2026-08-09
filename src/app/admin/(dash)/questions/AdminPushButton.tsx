"use client";

import { useState } from "react";

function base64ToBytes(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

/** Подписка сотрудника на уведомления о новых вопросах. */
export function AdminPushButton() {
  const [status, setStatus] = useState<"idle" | "on" | "error">("idle");

  async function enable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !("serviceWorker" in navigator)) {
      setStatus("error");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), admin: true, locale: "ru" }),
      });
      setStatus(res.ok ? "on" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "on") {
    return <span className="text-sm text-emerald-700">✓ Уведомления о вопросах включены</span>;
  }

  return (
    <button
      type="button"
      onClick={enable}
      className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
    >
      {status === "error" ? "Не удалось включить — повторить" : "🔔 Уведомлять о новых вопросах"}
    </button>
  );
}
