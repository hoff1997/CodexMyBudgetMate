"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  console.log("🟢 [LOGIN ACTION] Starting login process");

  const supabase = await createClient();

  // Type-casting here for convenience
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  console.log("🟢 [LOGIN ACTION] Attempting sign in for:", data.email);

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.log("🔴 [LOGIN ACTION] Sign in failed:", error.message);
    return { error: error.message };
  }

  console.log("🟢 [LOGIN ACTION] Sign in successful, user:", authData.user?.email);
  console.log("🟢 [LOGIN ACTION] Session exists:", !!authData.session);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Type-casting here for convenience
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
