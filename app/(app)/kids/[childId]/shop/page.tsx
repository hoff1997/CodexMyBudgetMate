import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { AvatarShopClient } from "./avatar-shop-client";

interface Props {
  params: { childId: string };
}

export default async function AvatarShopPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Fetch child profile (verify parent owns this child)
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url, star_balance")
    .eq("id", params.childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    notFound();
  }

  // Fetch shop items
  const { data: items } = await supabase
    .from("avatar_shop_items")
    .select("*")
    .order("tier")
    .order("star_cost");

  // Fetch child's inventory
  const { data: inventory } = await supabase
    .from("child_avatar_inventory")
    .select("shop_item_id")
    .eq("child_profile_id", params.childId);

  const ownedIds = new Set(inventory?.map((i) => i.shop_item_id) || []);
  const itemsWithOwnership = items?.map((item) => ({
    ...item,
    owned: ownedIds.has(item.id),
  }));

  return (
    <AvatarShopClient
      child={child}
      initialItems={itemsWithOwnership || []}
    />
  );
}
