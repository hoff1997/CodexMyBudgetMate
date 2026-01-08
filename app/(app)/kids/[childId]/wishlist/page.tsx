import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidWishlistClient } from "./kid-wishlist-client";

export const metadata = {
  title: "My Wishlist | My Budget Mate Kids",
  description: "Things I want to save for",
};

interface PageProps {
  params: Promise<{ childId: string }>;
}

export default async function KidWishlistPage({ params }: PageProps) {
  const { childId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Get child profile
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, first_name, avatar_emoji, avatar_url, star_balance")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    notFound();
  }

  // Get wishlist items with converted goal info
  const { data: items } = await supabase
    .from("teen_wishlists")
    .select(`
      *,
      converted_goal:teen_savings_goals (
        id,
        name,
        target_amount,
        current_amount
      )
    `)
    .eq("child_profile_id", childId)
    .order("priority", { ascending: true });

  return (
    <KidWishlistClient
      child={{
        id: child.id,
        name: child.first_name,
        avatar_url: child.avatar_url,
        avatar_emoji: child.avatar_emoji,
        star_balance: child.star_balance,
      }}
      items={items || []}
    />
  );
}
