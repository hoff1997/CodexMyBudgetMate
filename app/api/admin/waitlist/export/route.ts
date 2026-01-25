import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all waitlist entries
    const { data, error } = await supabase
      .from("waitlist")
      .select("email, name, source, referral_code, referred_by, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Convert to CSV
    const headers = [
      "Email",
      "Name",
      "Source",
      "Referral Code",
      "Referred By",
      "Signed Up",
    ];
    const csvRows = [headers.join(",")];

    data?.forEach((entry) => {
      const row = [
        `"${entry.email || ""}"`,
        `"${entry.name || ""}"`,
        `"${entry.source || ""}"`,
        `"${entry.referral_code || ""}"`,
        `"${entry.referred_by || ""}"`,
        `"${new Date(entry.created_at).toLocaleDateString("en-NZ")}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csv = csvRows.join("\n");

    // Return as downloadable CSV
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="waitlist-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Failed to export waitlist" },
      { status: 500 }
    );
  }
}
