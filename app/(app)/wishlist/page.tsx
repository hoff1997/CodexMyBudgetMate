import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { WishlistClient } from "./wishlist-client";

export const metadata = {
  title: "Wishlist | My Budget Mate",
  description: "Track things you want to buy and convert them to savings goals",
};

export default async function WishlistPage() {
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

  // Fetch wishlist items with converted envelope details
  const { data: items } = await supabase
    .from("wishlists")
    .select(`
      *,
      converted_envelope:envelopes!converted_envelope_id (
        id,
        name,
        current_balance,
        target_amount
      )
    `)
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return <WishlistClient initialItems={items || []} />;
}
