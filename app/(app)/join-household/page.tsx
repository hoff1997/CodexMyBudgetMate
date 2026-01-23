import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinHouseholdClient } from "./join-household-client";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function JoinHouseholdPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { token } = await searchParams;

  return <JoinHouseholdClient token={token || null} />;
}
