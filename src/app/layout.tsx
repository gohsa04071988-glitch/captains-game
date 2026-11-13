import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/game/SwRegister";

/* Шрифт Nunito (вариативный, 200–1000) лежит локально в /fonts —
   сборка больше не зависит от fonts.gstatic.com и не падает без сети.
   Файлы извлечены из кэша прошлой успешной сборки next/font. */

export const metadata: Metadata = {
  title: "Мир по кусочкам — детские пазлы",
  description:
    "Детские пазлы: 8 миров, 24 картинки, 4 уровня сложности. Собирай, слушай истории, наполняй альбом наклеек!",
  keywords: ["пазлы", "детские пазлы", "игра для детей", "джигсо", "мультики"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Пазлы",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7dd3a8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
