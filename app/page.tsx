import { MarketingPage } from "./marketing-page";
import { WaitlistPage } from "./waitlist-page";

// Toggle this to switch between waitlist mode and full marketing mode
// Set to true during beta/waitlist phase, false when ready for public launch
const WAITLIST_MODE = true;

export default function HomePage() {
  if (WAITLIST_MODE) {
    return <WaitlistPage />;
  }

  return <MarketingPage />;
}
