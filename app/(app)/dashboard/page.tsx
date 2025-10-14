import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";

type PageProps = {
  searchParams?: {
    demo?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const demoParam = searchParams?.demo;

  if (demoParam === "1") {
    cookieStore.set("demo-mode", "true", {
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
      sameSite: "lax",
    });
  }

  if (demoParam === "0") {
    cookieStore.delete("demo-mode");
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";
  const demoMode =
    demoParam === "1" ||
    cookieStore.get("demo-mode")?.value === "true" ||
    (authDisabled && !session);

  if (!session && !authDisabled && !demoMode) {
    redirect("/login");
  }

  if (!session && demoMode) {
    return (
      <DashboardShell
        profile={{ id: "demo-user", full_name: "Demo Budget Mate", avatar_url: null }}
        userId="demo-user"
        demoMode
      />
    );
  }

  const userId = session!.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return <DashboardShell profile={profile} userId={userId} demoMode={false} />;
}
