import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

const querySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

type AssetRow = {
  id: string;
  name: string;
  asset_type: string | null;
  current_value: number | string | null;
  notes: string | null;
};

type LiabilityRow = {
  id: string;
  name: string;
  liability_type: string | null;
  current_balance: number | string | null;
  notes: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
  });

  if (!parsedQuery.success) {
    const message = parsedQuery.error.flatten().formErrors[0] ?? "Invalid query parameters";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const exportFormat = parsedQuery.data.format;

  const [assetsRes, liabilitiesRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, asset_type, current_value, notes")
      .eq("user_id", session.user.id)
      .order("name"),
    supabase
      .from("liabilities")
      .select("id, name, liability_type, current_balance, notes")
      .eq("user_id", session.user.id)
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

  const rows = buildBalanceSheetRows(assets, liabilities);
  const filenameBase = `balance-sheet-${format(new Date(), "yyyyMMdd-HHmmss")}`;

  if (exportFormat === "xlsx") {
    const headers = Object.keys(rows[0] ?? { Section: "", Name: "", Category: "", Value: "", Notes: "" });
    const dataRows = rows.map((row) => headers.map((header) => row[header] ?? ""));
    const xml = buildSpreadsheetXml("Balance Sheet", headers, dataRows);
    const binary = new TextEncoder().encode(xml);
    const body = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${filenameBase}.xls"`,
      },
    });
  }

  const csv = toCsv(rows);
  const body = csv.buffer.slice(csv.byteOffset, csv.byteOffset + csv.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}

function buildBalanceSheetRows(assets: AssetRow[], liabilities: LiabilityRow[]) {
  const rows: Array<Record<string, string>> = [];
  let totalAssets = 0;
  let totalLiabilities = 0;

  rows.push({ Section: "Assets", Name: "", Category: "", Value: "", Notes: "" });
  assets.forEach((asset) => {
    const value = Number(asset.current_value ?? 0);
    totalAssets += value;
    rows.push({
      Section: "",
      Name: asset.name ?? "",
      Category: asset.asset_type ?? "",
      Value: value.toFixed(2),
      Notes: asset.notes ?? "",
    });
  });
  rows.push({
    Section: "",
    Name: "Total assets",
    Category: "",
    Value: totalAssets.toFixed(2),
    Notes: "",
  });

  rows.push({ Section: "", Name: "", Category: "", Value: "", Notes: "" });
  rows.push({ Section: "Liabilities", Name: "", Category: "", Value: "", Notes: "" });

  liabilities.forEach((liability) => {
    const balance = Number(liability.current_balance ?? 0);
    totalLiabilities += balance;
    rows.push({
      Section: "",
      Name: liability.name ?? "",
      Category: liability.liability_type ?? "",
      Value: balance.toFixed(2),
      Notes: liability.notes ?? "",
    });
  });
  rows.push({
    Section: "",
    Name: "Total liabilities",
    Category: "",
    Value: totalLiabilities.toFixed(2),
    Notes: "",
  });

  rows.push({ Section: "", Name: "", Category: "", Value: "", Notes: "" });
  rows.push({
    Section: "Net worth",
    Name: "",
    Category: "",
    Value: (totalAssets - totalLiabilities).toFixed(2),
    Notes: "",
  });

  return rows;
}

function toCsv(rows: Array<Record<string, string>>) {
  if (!rows.length) {
    return new TextEncoder().encode("");
  }
  const headers = Object.keys(rows[0]);
  const encoder = new TextEncoder();
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ].join("\n");
  return encoder.encode(lines);
}

function escapeCsv(value: string) {
  if (value === "") return "";
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildSpreadsheetXml(sheetName: string, headers: string[], rows: string[][]) {
  const headerRow = `<Row>${headers
    .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("")}</Row>`;
  const dataRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n  <Worksheet ss:Name="${escapeXml(sheetName)}">\n    <Table>\n      ${headerRow}\n      ${dataRows}\n    </Table>\n  </Worksheet>\n</Workbook>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
