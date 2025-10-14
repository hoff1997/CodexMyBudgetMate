import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRule } from "@/lib/types/rules";

const MATCH_TYPES = new Set(["contains", "starts_with", "exact"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const pattern = (body.pattern ?? "").trim();
  const envelopeId = body.envelopeId ? String(body.envelopeId) : "";
  if (!pattern) {
    return NextResponse.json({ error: "Pattern is required" }, { status: 400 });
  }
  if (!envelopeId) {
    return NextResponse.json({ error: "Envelope is required" }, { status: 400 });
  }

  const matchType = MATCH_TYPES.has(body.matchType) ? body.matchType : "contains";
  const caseSensitive = Boolean(body.caseSensitive);
  const normalized = caseSensitive ? pattern : pattern.toLowerCase();

  const { data: inserted, error } = await supabase
    .from("transaction_rules")
    .insert({
      user_id: session.user.id,
      pattern,
      merchant_normalized: normalized,
      envelope_id: envelopeId,
      match_type: matchType,
      case_sensitive: caseSensitive,
      is_active: true,
    })
    .select(
      "id, pattern, merchant_normalized, envelope_id, is_active, match_type, case_sensitive, created_at, updated_at",
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Unable to create rule" }, { status: 400 });
  }

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, name, icon")
    .eq("id", envelopeId)
    .maybeSingle();

  return NextResponse.json(
    formatRuleResponse(inserted, envelope?.name ?? null, envelope?.icon ?? null),
  );
}

function formatRuleResponse(
  record: {
    id: string;
    pattern: string | null;
    merchant_normalized: string | null;
    envelope_id: string | null;
    is_active: boolean | null;
    match_type: string | null;
    case_sensitive: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  },
  envelopeName: string | null,
  envelopeIcon: string | null,
): CategoryRule {
  const pattern = (record.pattern ?? record.merchant_normalized ?? "").trim();
  return {
    id: record.id,
    pattern,
    envelopeId: record.envelope_id ?? "",
    envelopeName,
    envelopeIcon,
    isActive: record.is_active ?? true,
    matchType: (record.match_type as CategoryRule["matchType"]) ?? "contains",
    caseSensitive: record.case_sensitive ?? false,
    createdAt: record.created_at,
    updatedAt: record.updated_at ?? record.created_at,
  };
}
