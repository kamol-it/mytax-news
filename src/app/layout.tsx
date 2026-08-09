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
