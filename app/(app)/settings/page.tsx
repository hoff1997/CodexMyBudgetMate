import { createClient } from "@/lib/supabase/server";
import { SettingsClient, type SettingsData } from "@/components/layout/settings/settings-client";
import type { PlannerFrequency } from "@/lib/planner/calculations";

type EnvelopeRecord = {
  id: string;
  name: string;
  category_id: string | null;
  target_amount: number | string | null;
  annual_amount: number | string | null;
  pay_cycle_amount: number | string | null;
  frequency: PlannerFrequency | null;
  next_payment_due: string | null;
  notes: string | null;
};

type LabelRecord = {
  id: string;
  name: string;
  colour: string | null;
  description: string | null;
  usage_count: number | null;
};

type BankConnectionRecord = {
  id: string;
  provider: string;
  status: string;
  last_synced_at: string | null;
  sync_frequency: string | null;
  created_at?: string | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let envelopes: EnvelopeRecord[] = [];
  let labels: LabelRecord[] = [];
  let bankConnections: BankConnectionRecord[] = [];
  let profile: { full_name: string | null; avatar_url: string | null } | null = null;

  if (session) {
    const [envelopeRes, labelRes, bankRes, profileRes] = await Promise.all([
      supabase
        .from("envelopes")
        .select(
          "id, name, category_id, target_amount, annual_amount, pay_cycle_amount, frequency, next_payment_due, notes",
        )
        .eq("user_id", session.user.id)
        .order("name"),
      supabase
        .from("labels")
        .select("id, name, colour, description, usage_count")
        .eq("user_id", session.user.id)
        .order("name"),
      supabase
        .from("bank_connections")
        .select("id, provider, status, last_synced_at, sync_frequency, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", session.user.id).maybeSingle(),
    ]);

    envelopes = (envelopeRes.data ?? []) as EnvelopeRecord[];
    labels = (labelRes.data ?? []) as LabelRecord[];
    bankConnections = (bankRes.data ?? []) as BankConnectionRecord[];
    profile = profileRes.data ?? null;
  }

  const data: SettingsData = session
    ? {
        profile: {
          fullName: profile?.full_name ?? session.user.user_metadata?.full_name ?? "",
          avatarUrl: profile?.avatar_url ?? session.user.user_metadata?.avatar_url ?? null,
          email: session.user.email ?? null,
        },
        envelopes: envelopes.map((row) => ({
          id: row.id,
          name: row.name,
          annualAmount: toNumber(row.annual_amount),
          payCycleAmount: toNumber(row.pay_cycle_amount),
          frequency: row.frequency ?? null,
          nextPaymentDue: row.next_payment_due,
          notes: row.notes,
        })),
        labels: labels.map((label) => ({
          id: label.id,
          name: label.name,
          colour: label.colour,
          description: label.description,
          usageCount: label.usage_count ?? 0,
        })),
        bankConnections: bankConnections.map((connection) => ({
          id: connection.id,
          provider: connection.provider,
          status: connection.status,
          lastSyncedAt: connection.last_synced_at,
          syncFrequency: connection.sync_frequency,
          createdAt: connection.created_at ?? null,
        })),
        security: {
          twoFactorEnabled: false,
          backupCodesRemaining: 0,
        },
        webhooks: {
          akahuEvents: false,
          envelopePush: false,
        },
        demoMode: false,
      }
    : getDemoSettingsData();

  return <SettingsClient data={data} />;
}

function getDemoSettingsData(): SettingsData {
  const now = new Date();
  return {
    profile: {
      fullName: "Demo Budget Mate",
      avatarUrl: null,
      email: "demo@example.com",
    },
    envelopes: [
      {
        id: "demo-mortgage",
        name: "Mortgage",
        annualAmount: 42000,
        payCycleAmount: 3500,
        frequency: "monthly",
        nextPaymentDue: new Date(now.getFullYear(), now.getMonth(), 28).toISOString().slice(0, 10),
        notes: "15 year fixed at 5.85%",
      },
      {
        id: "demo-groceries",
        name: "Groceries",
        annualAmount: 9600,
        payCycleAmount: 800,
        frequency: "fortnightly",
        nextPaymentDue: new Date(now.getFullYear(), now.getMonth(), 12).toISOString().slice(0, 10),
        notes: "Family of four",
      },
    ],
    labels: [
      {
        id: "demo-household",
        name: "Household",
        colour: "#8b5cf6",
        description: "General household expenses",
        usageCount: 18,
      },
      {
        id: "demo-transport",
        name: "Transport",
        colour: "#0ea5e9",
        description: "Fuel, parking, public transport",
        usageCount: 9,
      },
      {
        id: "demo-fun",
        name: "Fun",
        colour: "#f97316",
        description: "Entertainment and treats",
        usageCount: 6,
      },
    ],
    bankConnections: [
      {
        id: "demo-anz",
        provider: "ANZ",
        status: "connected",
        lastSyncedAt: now.toISOString(),
        syncFrequency: "15m",
        createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 2).toISOString(),
      },
      {
        id: "demo-westpac",
        provider: "Westpac",
        status: "action_required",
        lastSyncedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString(),
        syncFrequency: "hourly",
        createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 18).toISOString(),
      },
    ],
    security: {
      twoFactorEnabled: true,
      backupCodesRemaining: 6,
    },
    webhooks: {
      akahuEvents: true,
      envelopePush: false,
    },
    demoMode: true,
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}
