import { WaitlistHero } from "@/components/landing/waitlist-hero";
import { WaitlistFeatures } from "@/components/landing/waitlist-features";
import { WaitlistCTA } from "@/components/landing/waitlist-cta";
import { WaitlistFooter } from "@/components/landing/waitlist-footer";
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
      {/* Header */}
      <header className="bg-white border-b border-silver-light">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-text-dark">My Budget Mate</span>
          <div className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-text-medium hover:text-sage transition-colors">
              Features
            </a>
            <a href="/login" className="text-sage hover:text-sage-dark font-medium transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        <WaitlistHero waitlistCount={waitlistCount} />
        <div id="features">
          <WaitlistFeatures />
        </div>
        <WaitlistCTA />
      </main>

      {/* Footer */}
      <WaitlistFooter />
    </div>
  );
}
