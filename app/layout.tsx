import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Day Planner — Ніжний та зручний планер",
  description: "AI-планер дня у стилі Apple Notes / Notion з рожевими акцентами.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFF5F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FFF5F7] text-[#2D2235] font-sans selection:bg-[#F2A3BF] selection:text-white">
        {children}
      </body>
    </html>
  );
}
