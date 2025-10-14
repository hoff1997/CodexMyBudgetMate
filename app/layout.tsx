import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Budget Mate",
  description:
    "Personalised envelope budgeting with Supabase persistence and Akahu-powered bank connections.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-background">
      <body className={`${inter.className} h-full`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
