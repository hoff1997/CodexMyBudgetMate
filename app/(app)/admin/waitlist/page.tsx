import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WaitlistAdminClient } from "./waitlist-admin-client";

// List of admin user emails who can access this page
const ADMIN_EMAILS = [
  "dean@mybudgetmate.co.nz",
  "admin@mybudgetmate.co.nz",
];

export default async function WaitlistAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if not logged in or not an admin
  if (!user) {
    redirect("/login");
  }

  if (!ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/dashboard");
  }

  return <WaitlistAdminClient />;
}
