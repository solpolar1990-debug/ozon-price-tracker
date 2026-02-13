import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ozon Price Tracker - Telegram Bot",
  description: "Telegram-бот для отслеживания цен на товары Ozon",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛒</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
