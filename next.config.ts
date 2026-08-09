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

export default nextConfig;
