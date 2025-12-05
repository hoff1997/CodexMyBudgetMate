import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/providers/app-providers";

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
    <html lang="en" className="h-full bg-background">
      <body className="h-full font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
