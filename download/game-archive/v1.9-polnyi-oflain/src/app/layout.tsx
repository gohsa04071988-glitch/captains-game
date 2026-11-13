import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/game/SwRegister";

const nunito = Nunito({
  variable: "--font-kid",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800", "900"],
});

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
      <body className={`${nunito.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
