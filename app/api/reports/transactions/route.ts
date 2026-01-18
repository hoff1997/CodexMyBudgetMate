import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { createUnauthorizedError, createErrorResponse, createValidationError } from "@/lib/utils/api-error";

const querySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
  from: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid from date",
    }),
  to: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid to date",
    }),
});

type TransactionExportRow = {
  id: string;
  occurred_at: string;
  merchant_name: string | null;
  description: string | null;
  amount: number | string | null;
  envelope_name: string | null;
  status: string | null;
  account_name: string | null;
  bank_reference: string | null;
  bank_memo: string | null;
  labels: string[];
};

const UNASSIGNED_LABEL = "Unassigned";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    account: url.searchParams.get("account") ?? undefined,
    envelope: url.searchParams.get("envelope") ?? undefined,
  });

  if (!parsedQuery.success) {
    const message = parsedQuery.error.flatten().formErrors[0] ?? "Invalid query parameters";
    return createValidationError(message);
  }

  const { format: exportFormat, from, to } = parsedQuery.data;
  const accounts = url.searchParams.getAll("account");
  const envelopes = url.searchParams.getAll("envelope");
  const labels = url.searchParams.getAll("label");
  const minAmount = url.searchParams.get("min");
  const maxAmount = url.searchParams.get("max");

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, occurred_at, merchant_name, description, amount, status, bank_reference, bank_memo,
        account:accounts(name),
        envelope:envelopes(name),
        transaction_labels:transaction_labels(label:labels(name))`
    )
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch transactions");
  }

  const raw = (data ?? []).map((row: any) => ({
    id: row.id,
    occurred_at: row.occurred_at,
    merchant_name: row.merchant_name,
    description: row.description,
    amount: row.amount,
    envelope_name: row.envelope?.name ?? null,
    status: row.status,
    account_name: row.account?.name ?? null,
    bank_reference: row.bank_reference,
    bank_memo: row.bank_memo,
    labels: Array.isArray(row.transaction_labels)
      ? row.transaction_labels
          .map((entry: any) => entry?.label?.name)
          .filter(Boolean)
      : [],
  }));

  const fromDate = from ? new Date(from) : null;
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);
  const min = minAmount?.trim() ? Number(minAmount) : null;
  const max = maxAmount?.trim() ? Number(maxAmount) : null;
  const accountSet = new Set(accounts.map((account) => account.toLowerCase()));
  const envelopeSet = new Set(envelopes.map((envelope) => envelope.toLowerCase()));
  const labelSet = new Set(labels.map((label: string) => label.toLowerCase()));
  const limitAccounts = accountSet.size > 0;
  const limitEnvelopes = envelopeSet.size > 0;
  const limitLabels = labelSet.size > 0;

  const rows: TransactionExportRow[] = raw.filter((row) => {
    if (fromDate) {
      const occurred = new Date(row.occurred_at);
      if (occurred < fromDate) return false;
    }
    if (toDate) {
      const occurred = new Date(row.occurred_at);
      if (occurred > toDate) return false;
    }
    const amount = Number(row.amount ?? 0);
    if (min !== null && Number.isFinite(min) && amount < min) return false;
    if (max !== null && Number.isFinite(max) && amount > max) return false;
    const accountName = (row.account_name ?? UNASSIGNED_LABEL).toLowerCase();
    if (limitAccounts && !accountSet.has(accountName)) return false;
    const envelopeName = (row.envelope_name ?? UNASSIGNED_LABEL).toLowerCase();
    if (limitEnvelopes && !envelopeSet.has(envelopeName)) return false;
    if (limitLabels) {
      const labelsLower = row.labels.map((label: string) => label.toLowerCase());
      const hasMatch = labelsLower.some((label: string) => labelSet.has(label));
      if (!hasMatch) return false;
    }
    return true;
  });
  const filenameBase = `transactions-${format(new Date(), "yyyyMMdd-HHmmss")}`;

  if (exportFormat === "xlsx") {
    const headers = [
      "Date",
      "Merchant",
      "Description",
      "Amount",
      "Envelope",
      "Status",
      "Account",
      "Reference",
      "Memo",
      "Labels",
    ];
    const rowsForSheet = rows.map((row) => [
      row.occurred_at ? format(new Date(row.occurred_at), "yyyy-MM-dd") : "",
      row.merchant_name ?? "",
      row.description ?? "",
      Number(row.amount ?? 0).toFixed(2),
      row.envelope_name ?? "",
      row.status ?? "",
      row.account_name ?? "",
      row.bank_reference ?? "",
      row.bank_memo ?? "",
      row.labels.join("; "),
    ]);
    const xml = buildSpreadsheetXml("Transactions", headers, rowsForSheet);
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

function toCsv(rows: TransactionExportRow[]) {
  const headers = [
    "Date",
    "Merchant",
    "Description",
    "Amount",
    "Envelope",
    "Status",
    "Account",
    "Reference",
    "Memo",
    "Labels",
  ];
  const encoder = new TextEncoder();
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.occurred_at ? format(new Date(row.occurred_at), "yyyy-MM-dd") : "",
        row.merchant_name ?? "",
        row.description ?? "",
        Number(row.amount ?? 0).toFixed(2),
        row.envelope_name ?? "",
        row.status ?? "",
        row.account_name ?? "",
        row.bank_reference ?? "",
        row.bank_memo ?? "",
        row.labels.join("; "),
      ]
        .map(escapeCsv)
        .join(","),
    ),
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
