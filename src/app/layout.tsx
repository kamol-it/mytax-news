import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: {
    default: "MYTAX — soliq yangiliklari / налоговые новости",
    template: "%s — MYTAX",
  },
  description:
    "MYTAX.uz — новости налогового законодательства, отчётности и бизнеса в Узбекистане.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MYTAX", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#0c4278",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
