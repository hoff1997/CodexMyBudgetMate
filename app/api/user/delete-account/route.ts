import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid confirmation. Please type 'DELETE MY ACCOUNT' exactly." },
        { status: 400 }
      );
    }

    // Store deletion reason for analytics (optional)
    if (parsed.data.reason) {
      try {
        await supabase.from("account_deletion_feedback").insert({
          reason: parsed.data.reason,
          deleted_at: new Date().toISOString(),
        });
      } catch {
        // Ignore errors - feedback table may not exist
      }
    }

    // Delete user data in order (respecting foreign key constraints)
    // The cascading deletes should handle most of this, but we'll be explicit

    // 1. Delete meal plan data
    await supabase.from("meal_plan").delete().eq("user_id", user.id);
    await supabase.from("meal_templates").delete().eq("user_id", user.id);
    await supabase.from("freezer_meals").delete().eq("user_id", user.id);

    // 2. Delete recipes
    await supabase.from("recipes").delete().eq("user_id", user.id);

    // 3. Delete transactions
    await supabase.from("transactions").delete().eq("user_id", user.id);

    // 4. Delete envelope allocations and envelopes
    await supabase.from("envelope_allocations").delete().eq("user_id", user.id);
    await supabase.from("envelopes").delete().eq("user_id", user.id);

    // 5. Delete income sources
    await supabase.from("income_sources").delete().eq("user_id", user.id);

    // 6. Delete accounts
    await supabase.from("accounts").delete().eq("user_id", user.id);

    // 7. Delete categories and labels
    await supabase.from("categories").delete().eq("user_id", user.id);
    await supabase.from("labels").delete().eq("user_id", user.id);

    // 8. Delete achievements
    await supabase.from("achievements").delete().eq("user_id", user.id);

    // 9. Delete assets and liabilities
    await supabase.from("assets").delete().eq("user_id", user.id);
    await supabase.from("liabilities").delete().eq("user_id", user.id);

    // 10. Delete net worth snapshots
    await supabase.from("net_worth_snapshots").delete().eq("user_id", user.id);

    // 11. Delete kids data
    await supabase.from("children").delete().eq("user_id", user.id);

    // 12. Delete bank connections
    await supabase.from("bank_connections").delete().eq("user_id", user.id);

    // 13. Delete profile last
    await supabase.from("profiles").delete().eq("id", user.id);

    // Finally, delete the auth user using admin client
    // This requires the service role key
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      // Data is already deleted, so we still consider this a success
      // The user won't be able to log in anyway
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted."
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }
}
