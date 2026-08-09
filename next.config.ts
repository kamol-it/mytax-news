import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // корень проекта задан явно: иначе Turbopack подхватывает lock-файл из ~/
  turbopack: { root: import.meta.dirname },
  // better-sqlite3 — нативный модуль, его нельзя бандлить
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  experimental: {
    serverActions: {
      // формы админки передают только текст; файлы идут через /api/admin/upload
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
