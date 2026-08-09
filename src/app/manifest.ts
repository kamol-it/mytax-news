import type { MetadataRoute } from "next";

/**
 * Манифест нужен не только для «установки» сайта на телефон:
 * в iOS/Safari push-уведомления работают только после добавления
 * сайта на домашний экран, и без манифеста такой вариант недоступен.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MYTAX — soliq yangiliklari",
    short_name: "MYTAX",
    description:
      "Новости налогового законодательства, отчётности и бизнеса в Узбекистане.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f7fc",
    theme_color: "#0c4278",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
