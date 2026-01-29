import type { Metadata } from "next";
import { MarketingPage } from "./marketing-page";
import { WaitlistPage } from "./waitlist-page";

// Toggle this to switch between waitlist mode and full marketing mode
// Set to true during beta/waitlist phase, false when ready for public launch
const WAITLIST_MODE = true;

export const metadata: Metadata = WAITLIST_MODE
  ? {
      title: "My Budget Mate | NZ Budgeting App for Kiwi Pay Cycles",
      description:
        "Free NZ budgeting app with Akahu bank sync, envelope budgeting, and fortnightly pay support. Finally, a money app built for how Kiwis actually get paid.",
      keywords: [
        "NZ budgeting app",
        "New Zealand budget app",
        "envelope budgeting NZ",
        "Akahu bank sync",
        "fortnightly budget NZ",
        "Kiwi budget app",
        "money management NZ",
        "NZ bank connection app",
        "budget mate",
        "ANZ budget app",
        "ASB budget app",
        "Westpac budget app",
        "BNZ budget app",
        "Kiwibank budget app",
        "YNAB alternative NZ",
        "best budgeting app New Zealand",
      ],
      alternates: {
        canonical: "https://www.mybudgetmate.co.nz",
      },
      openGraph: {
        title: "My Budget Mate | Budgeting Built for Kiwis",
        description:
          "Envelope budgeting with NZ bank sync. Built for fortnightly pay, Akahu-powered, guided by Remy your financial coach.",
        url: "https://www.mybudgetmate.co.nz",
        siteName: "My Budget Mate",
        locale: "en_NZ",
        type: "website",
        images: [
          {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: "My Budget Mate - Budgeting built for Kiwis",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "My Budget Mate | NZ Budgeting App",
        description:
          "Envelope budgeting with NZ bank sync. Built for Kiwi pay cycles.",
        images: ["/og-image.png"],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
        },
      },
    }
  : {
      title: "My Budget Mate",
      description:
        "Personalised envelope budgeting with Supabase persistence and Akahu-powered bank connections.",
    };

export default function HomePage() {
  if (WAITLIST_MODE) {
    return <WaitlistPage />;
  }

  return <MarketingPage />;
}
