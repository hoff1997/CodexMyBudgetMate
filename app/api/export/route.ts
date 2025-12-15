import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";

// Helper to convert array to CSV string
function toCSV(data: Record<string, unknown>[] | null): string {
  if (!data || data.length === 0) {
    return "No data";
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        // Handle null/undefined
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma, quotes, or newlines
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all user data in parallel
    const [
      { data: accounts },
      { data: envelopes },
      { data: transactions },
      { data: incomeSources },
      { data: labels },
      { data: assets },
      { data: liabilities },
      { data: profile },
    ] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("envelopes").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id),
      supabase.from("income_sources").select("*").eq("user_id", user.id),
      supabase.from("labels").select("*").eq("user_id", user.id),
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("liabilities").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    // Create ZIP file
    const zip = new JSZip();

    // Add each dataset as CSV
    zip.file("accounts.csv", toCSV(accounts));
    zip.file("envelopes.csv", toCSV(envelopes));
    zip.file("transactions.csv", toCSV(transactions));
    zip.file("income_sources.csv", toCSV(incomeSources));
    zip.file("labels.csv", toCSV(labels));
    zip.file("assets.csv", toCSV(assets));
    zip.file("liabilities.csv", toCSV(liabilities));
    zip.file("profile.csv", toCSV(profile ? [profile] : null));

    // Add export metadata
    const exportDate = new Date().toISOString();
    zip.file(
      "export_info.txt",
      `My Budget Mate Data Export
================================
Exported: ${exportDate}
User: ${user.email}

Files included:
- accounts.csv (${accounts?.length ?? 0} records)
- envelopes.csv (${envelopes?.length ?? 0} records)
- transactions.csv (${transactions?.length ?? 0} records)
- income_sources.csv (${incomeSources?.length ?? 0} records)
- labels.csv (${labels?.length ?? 0} records)
- assets.csv (${assets?.length ?? 0} records)
- liabilities.csv (${liabilities?.length ?? 0} records)
- profile.csv (1 record)

Note: This export contains all your budget data.
CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.
`
    );

    // Generate ZIP as blob
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Return as download
    const dateStr = new Date().toISOString().split("T")[0];
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="my-budget-mate-export-${dateStr}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
