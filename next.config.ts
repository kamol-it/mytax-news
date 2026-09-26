import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // корень проекта задан явно: иначе Turbopack подхватывает lock-файл из ~/
  turbopack: { root: import.meta.dirname },
  images: {
    // изображения, загруженные админкой в Vercel Blob
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    serverActions: {
      // формы админки передают только текст; файлы идут через /api/admin/upload
      bodySizeLimit: "2mb",
    },
  },
};

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next вставляет инлайновые скрипты для гидратации,
// поэтому без nonce-инфраструктуры (middleware + динамический рендер всех
// страниц) обойтись без 'unsafe-inline' в script-src нельзя. Политика всё
// равно полезна: скрипты только со своего домена, запрет <object>/<embed>,
// подмены <base>, отправки форм на чужие адреса и встраивания сайта в чужие
// фреймы, фреймы — только YouTube для видео.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // обложки и фото из Vercel Blob, превью в редакторе (blob:, data:)
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

// Заголовки безопасности.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

nextConfig.headers = async () => [{ source: "/:path*", headers: securityHeaders }];

export default nextConfig;
