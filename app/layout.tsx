import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/providers/app-providers";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";

export const metadata: Metadata = {
  title: "My Budget Mate",
  description:
    "Personalised envelope budgeting with Supabase persistence and Akahu-powered bank connections.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-background" suppressHydrationWarning>
      <body className="h-full font-sans" suppressHydrationWarning>
        <AppProviders>
          {children}
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
