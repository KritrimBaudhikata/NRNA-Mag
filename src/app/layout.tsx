import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Everest Day Hong Kong 2026 | Magazine",
  description:
    "Read the Everest Day Hong Kong 2026 magazine online. Momo, Mountains & Community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${notoSans.variable} ${notoDevanagari.variable} ${playfair.variable} flex min-h-full flex-col bg-[#FAFAF8] text-gray-900 antialiased`}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
