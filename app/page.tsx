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
