import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./onboarding-client";
import { headers } from "next/headers";

export const metadata = {
  title: 'Get Started - My Budget Mate',
  description: 'Set up your budget in just a few minutes',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user has already completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', session.user.id)
    .single();

  // If onboarding is complete, redirect to dashboard
  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  // Detect mobile
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  return <OnboardingClient isMobile={isMobile} />;
}
