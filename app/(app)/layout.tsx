import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const demoMode = cookieStore.get("demo-mode")?.value === "true";

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";

  if (!session && !authDisabled && !demoMode) {
    redirect("/login");
  }

  return <Sidebar>{children}</Sidebar>;
}
