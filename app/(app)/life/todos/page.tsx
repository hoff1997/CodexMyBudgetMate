import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { TodosClient } from "./todos-client";

export default async function TodosPage() {
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

  // Fetch todo lists with items
  const { data: lists } = await supabase
    .from("todo_lists")
    .select(`
      *,
      items:todo_items(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Process lists to add counts
  const processedLists = lists?.map((list) => ({
    ...list,
    totalItems: list.items?.length || 0,
    completedItems: list.items?.filter((i: { completed: boolean }) => i.completed).length || 0,
  })) || [];

  // Fetch children for assignment
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("parent_user_id", user.id);

  return (
    <TodosClient
      initialLists={processedLists}
      childProfiles={children || []}
    />
  );
}
