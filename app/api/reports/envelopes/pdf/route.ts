import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance";
import { generatePdfDocument } from "@/lib/reports/pdf";

type EnvelopeRow = {
  name: string;
  category_id: string | null;
  category_name: string | null;
  target_amount: number | string | null;
  current_amount: number | string | null;
  pay_cycle_amount: number | string | null;
  frequency: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: envelopes, error } = await supabase
    .from("envelopes")
    .select(
      "name, category_id, target_amount, current_amount, pay_cycle_amount, frequency, category:category_id(name)",
    )
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const envelopeRows: EnvelopeRow[] = (envelopes ?? []).map((row: any) => ({
    name: row.name,
    category_id: row.category_id ?? null,
    category_name: row.category?.name ?? null,
    target_amount: row.target_amount ?? 0,
    current_amount: row.current_amount ?? 0,
    pay_cycle_amount: row.pay_cycle_amount ?? 0,
    frequency: row.frequency ?? null,
  }));

  const pdfBuffer = buildPdf({ envelopes: envelopeRows });
  const pdfArrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength,
  ) as ArrayBuffer;
  const filename = `envelope-summary-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`;

  return new NextResponse(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildPdf({ envelopes }: { envelopes: EnvelopeRow[] }) {
  const lines: string[] = [];
  lines.push(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`);
  lines.push("");
  lines.push("Envelope                   Category            Per pay    Target     Balance    Frequency");

  const totalTarget = envelopes.reduce(
    (sum, envelope) => sum + Number(envelope.target_amount ?? 0),
    0,
  );
  const totalCurrent = envelopes.reduce(
    (sum, envelope) => sum + Number(envelope.current_amount ?? 0),
    0,
  );
  const totalPerPay = envelopes.reduce(
    (sum, envelope) => sum + Number(envelope.pay_cycle_amount ?? 0),
    0,
  );

  envelopes.forEach((envelope) => {
    const name = (envelope.name ?? "").padEnd(25).slice(0, 25);
    const category = ((envelope.category_name ?? "Uncategorised").slice(0, 18)).padEnd(18);
    const perPay = formatCurrency(Number(envelope.pay_cycle_amount ?? 0)).padStart(10);
    const target = formatCurrency(Number(envelope.target_amount ?? 0)).padStart(10);
    const balance = formatCurrency(Number(envelope.current_amount ?? 0)).padStart(10);
    const freq = (envelope.frequency ?? "—").padEnd(10).slice(0, 10);
    lines.push(`${name}${category}${perPay} ${target} ${balance} ${freq}`);
  });

  lines.push("");
  lines.push(
    `Totals: per pay ${formatCurrency(totalPerPay)} • target ${formatCurrency(totalTarget)} • balance ${formatCurrency(totalCurrent)}`,
  );

  return generatePdfDocument("Envelope summary", lines);
}
