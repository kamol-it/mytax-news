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

// Заголовки безопасности. Строгий CSP не ставим: Next использует инлайновые
// скрипты для гидратации, и без nonce-инфраструктуры он ломает страницы.
const securityHeaders = [
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
