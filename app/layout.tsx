import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/app-providers";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "My Budget Mate | NZ Budgeting App for Kiwi Pay Cycles",
    template: "%s | My Budget Mate",
  },
  description:
    "Free NZ budgeting app with Akahu bank sync, envelope budgeting, and fortnightly pay support. Finally, a money app built for how Kiwis actually get paid.",
  metadataBase: new URL("https://www.mybudgetmate.co.nz"),
  icons: {
    icon: "/favicon.svg",
  },
  authors: [{ name: "My Budget Mate" }],
  creator: "My Budget Mate",
  publisher: "My Budget Mate",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ" className={`h-full bg-background ${inter.variable}`} suppressHydrationWarning>
      <body className="h-full font-sans" suppressHydrationWarning>
        <AppProviders>
          {children}
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
