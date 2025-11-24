import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/reports/pdf";

type AssetRow = {
  name: string;
  asset_type: string | null;
  current_value: number | string | null;
  notes: string | null;
};

type LiabilityRow = {
  name: string;
  liability_type: string | null;
  current_balance: number | string | null;
  interest_rate: number | string | null;
  notes: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const [assetsRes, liabilitiesRes] = await Promise.all([
    supabase
      .from("assets")
      .select("name, asset_type, current_value, notes")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("liabilities")
      .select("name, liability_type, current_balance, interest_rate, notes")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  if (assetsRes.error) {
    return NextResponse.json({ error: assetsRes.error.message }, { status: 400 });
  }
  if (liabilitiesRes.error) {
    return NextResponse.json({ error: liabilitiesRes.error.message }, { status: 400 });
  }

  const assets = (assetsRes.data ?? []) as AssetRow[];
  const liabilities = (liabilitiesRes.data ?? []) as LiabilityRow[];

  const pdfBuffer = buildPdf({ assets, liabilities });
  const pdfArrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength,
  ) as ArrayBuffer;
  const filename = `net-worth-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`;

  return new NextResponse(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildPdf({
  assets,
  liabilities,
}: {
  assets: AssetRow[];
  liabilities: LiabilityRow[];
}) {
  const lines: string[] = [];
  lines.push(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`);
  lines.push("");
  lines.push("Assets");
  lines.push("Name                       Category            Value       Notes");
  const totalAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value ?? 0), 0);
  assets.forEach((asset) => {
    const name = (asset.name ?? "").padEnd(27).slice(0, 27);
    const category = ((asset.asset_type ?? "").slice(0, 18)).padEnd(18);
    const value = toCurrency(asset.current_value).padStart(12);
    const notes = (asset.notes ?? "").slice(0, 40);
    lines.push(`${name}${category}${value}   ${notes}`);
  });
  lines.push(`Total assets: ${toCurrency(totalAssets)}`);
  lines.push("");
  lines.push("Liabilities");
  lines.push("Name                       Category            Balance     Notes");
  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + Number(liability.current_balance ?? 0),
    0,
  );
  liabilities.forEach((liability) => {
    const name = (liability.name ?? "").padEnd(27).slice(0, 27);
    const category = ((liability.liability_type ?? "").slice(0, 18)).padEnd(18);
    const balance = toCurrency(liability.current_balance).padStart(12);
    const notes = (liability.notes ?? "").slice(0, 40);
    lines.push(`${name}${category}${balance}   ${notes}`);
  });
  lines.push(`Total liabilities: ${toCurrency(totalLiabilities)}`);
  lines.push("");
  lines.push(`Net worth: ${toCurrency(totalAssets - totalLiabilities)}`);

  return generatePdfDocument("Net worth summary", lines);
}

function toCurrency(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(numberValue);
}
