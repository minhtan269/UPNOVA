import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { LanguageProvider } from "@/lib/i18n/context";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACRM - AI Carbon-Resilience Management",
  description:
    "Chat with multiple LLMs while tracking real-time carbon emissions and energy consumption per message.",
  keywords: ["AI", "Carbon", "Sustainability", "LLM", "Green AI", "ACRM"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <ThemeScript />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

