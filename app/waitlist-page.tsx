import { WaitlistHero } from "@/components/landing/waitlist-hero";
import { SocialProofBar } from "@/components/landing/social-proof-bar";
import { WaitlistFeatures } from "@/components/landing/waitlist-features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MyBudgetWay } from "@/components/landing/my-budget-way";
import { WaitlistCTA } from "@/components/landing/waitlist-cta";
import { WaitlistFooter } from "@/components/landing/waitlist-footer";
import { StructuredData } from "@/components/landing/structured-data";
import { createClient } from "@/lib/supabase/server";

async function getWaitlistCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });
    return count || 0;
  } catch {
    return 0;
  }
}

export async function WaitlistPage() {
  const waitlistCount = await getWaitlistCount();

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data for SEO */}
      <StructuredData />

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-silver-light sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-text-dark">My Budget Mate</span>
          <nav className="flex items-center gap-4 text-sm" aria-label="Main navigation">
            <a
              href="#features"
              className="text-text-medium hover:text-sage transition-colors hidden sm:inline"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-text-medium hover:text-sage transition-colors hidden sm:inline"
            >
              How It Works
            </a>
            <a
              href="#roadmap"
              className="text-text-medium hover:text-sage transition-colors hidden md:inline"
            >
              The Way
            </a>
            <a
              href="#faq"
              className="text-text-medium hover:text-sage transition-colors hidden sm:inline"
            >
              FAQ
            </a>
            <a
              href="#waitlist"
              className="text-sage hover:text-sage-dark font-medium transition-colors"
            >
              Join the Waitlist
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main>
        <WaitlistHero waitlistCount={waitlistCount} />
        <SocialProofBar waitlistCount={waitlistCount} />
        <div id="features">
          <WaitlistFeatures />
        </div>
        <HowItWorks />
        <MyBudgetWay />
        <WaitlistCTA />
      </main>

      {/* Footer */}
      <WaitlistFooter />
    </div>
  );
}
