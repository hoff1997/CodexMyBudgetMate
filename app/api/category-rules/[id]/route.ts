import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRule } from "@/lib/types/rules";

const MATCH_TYPES = new Set(["contains", "starts_with", "exact"]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transaction_rules")
    .select(
      "id, pattern, merchant_normalized, envelope_id, is_active, match_type, case_sensitive, created_at, updated_at",
    )
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.pattern !== undefined) {
    const pattern = String(body.pattern ?? "").trim();
    if (!pattern) {
      return NextResponse.json({ error: "Pattern cannot be empty" }, { status: 400 });
    }
    update.pattern = pattern;
    const caseSensitive = body.caseSensitive ?? existing.case_sensitive ?? false;
    update.merchant_normalized = caseSensitive ? pattern : pattern.toLowerCase();
  }

  if (body.envelopeId !== undefined) {
    update.envelope_id = body.envelopeId ? String(body.envelopeId) : null;
  }

  if (body.isActive !== undefined) {
    update.is_active = Boolean(body.isActive);
  }

  if (body.matchType !== undefined) {
    update.match_type = MATCH_TYPES.has(body.matchType) ? body.matchType : existing.match_type;
  }

  if (body.caseSensitive !== undefined) {
    const caseSensitive = Boolean(body.caseSensitive);
    update.case_sensitive = caseSensitive;
    const pattern = (update.pattern as string | undefined) ?? existing.pattern ?? "";
    update.merchant_normalized = caseSensitive ? pattern : pattern.toLowerCase();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("transaction_rules")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .select(
      "id, pattern, merchant_normalized, envelope_id, is_active, match_type, case_sensitive, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Unable to update rule" }, { status: 400 });
  }

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, name, icon")
    .eq("id", updated.envelope_id)
    .maybeSingle();

  return NextResponse.json(
    formatRuleResponse(updated, envelope?.name ?? null, envelope?.icon ?? null),
  );
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase
    .from("transaction_rules")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
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
