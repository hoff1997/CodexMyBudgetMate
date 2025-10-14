import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";

  if (!session && !authDisabled) {
    redirect("/login");
  }

  return <Sidebar>{children}</Sidebar>;
}
