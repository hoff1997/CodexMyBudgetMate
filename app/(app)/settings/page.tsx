import { createClient } from "@/lib/supabase/server";
import { SettingsClient, type SettingsData } from "@/components/layout/settings/settings-client";

type IncomeSourceRecord = {
  id: string;
  name: string;
  pay_cycle: "weekly" | "fortnightly" | "monthly";
  typical_amount: number | string | null;
  next_pay_date: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  replaced_by_id: string | null;
  created_at: string;
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

type SettingsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let incomeSources: IncomeSourceRecord[] = [];
  let labels: LabelRecord[] = [];
  let bankConnections: BankConnectionRecord[] = [];
  let profile: { full_name: string | null; preferred_name: string | null; avatar_url: string | null; pay_cycle: string | null; default_page: string | null; date_of_birth: string | null; celebration_reminder_weeks: number | null } | null = null;

  if (user) {
    const [incomeRes, labelRes, bankRes, profileRes] = await Promise.all([
      supabase
        .from("income_sources")
        .select("id, name, pay_cycle, typical_amount, next_pay_date, start_date, end_date, is_active, replaced_by_id, created_at")
        .eq("user_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("labels")
        .select("id, name, colour, description, usage_count")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("bank_connections")
        .select("id, provider, status, last_synced_at, sync_frequency, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, preferred_name, avatar_url, pay_cycle, default_page, date_of_birth, celebration_reminder_weeks").eq("id", user.id).maybeSingle(),
    ]);

    incomeSources = (incomeRes.data ?? []) as IncomeSourceRecord[];
    labels = (labelRes.data ?? []) as LabelRecord[];
    bankConnections = (bankRes.data ?? []) as BankConnectionRecord[];
    profile = profileRes.data ?? null;
  }

  const data: SettingsData = user
    ? {
        profile: {
          fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
          preferredName: profile?.preferred_name ?? null,
          avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
          email: user.email ?? null,
          payCycle: profile?.pay_cycle ?? "fortnightly",
          defaultPage: profile?.default_page ?? "/reconcile",
          dateOfBirth: profile?.date_of_birth ?? null,
          celebrationReminderWeeks: profile?.celebration_reminder_weeks ?? 3,
        },
        incomeSources: incomeSources.map((row) => ({
          id: row.id,
          name: row.name,
          pay_cycle: row.pay_cycle,
          typical_amount: toNumber(row.typical_amount),
          next_pay_date: row.next_pay_date,
          start_date: row.start_date,
          end_date: row.end_date,
          is_active: row.is_active,
          replaced_by_id: row.replaced_by_id,
          created_at: row.created_at,
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
        demoMode: false,
        userId: user.id,
        username: user.email ?? "User",
      }
    : getDemoSettingsData();

  const akahuStatus = typeof searchParams?.akahu === "string" ? searchParams.akahu : undefined;
  const messageParam = typeof searchParams?.message === "string" ? decodeURIComponent(searchParams.message) : null;

  let flash: { type: "success" | "error"; message: string } | null = null;
  if (akahuStatus === "connected") {
    flash = { type: "success", message: "Akahu connection linked successfully." };
  } else if (akahuStatus === "refreshed") {
    flash = { type: "success", message: "Akahu connection refreshed." };
  } else if (akahuStatus === "disconnected") {
    flash = { type: "success", message: "Akahu connection removed." };
  } else if (akahuStatus === "error") {
    flash = { type: "error", message: messageParam ?? "Akahu connection failed. Please try again." };
  }

  return <SettingsClient data={data} flash={flash} />;
}

function getDemoSettingsData(): SettingsData {
  const now = new Date();
  return {
    profile: {
      fullName: "Demo Budget Mate",
      preferredName: "Demo",
      avatarUrl: null,
      email: "demo@example.com",
      payCycle: "fortnightly",
      defaultPage: "/reconcile",
      dateOfBirth: null,
      celebrationReminderWeeks: 3,
    },
    incomeSources: [
      {
        id: "demo-salary",
        name: "My Salary",
        pay_cycle: "fortnightly",
        typical_amount: 3000,
        next_pay_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().slice(0, 10),
        start_date: new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10),
        end_date: null,
        is_active: true,
        replaced_by_id: null,
        created_at: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
      },
      {
        id: "demo-freelance",
        name: "Freelance Work",
        pay_cycle: "monthly",
        typical_amount: 500,
        next_pay_date: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10),
        start_date: new Date(now.getFullYear(), 6, 1).toISOString().slice(0, 10),
        end_date: null,
        is_active: true,
        replaced_by_id: null,
        created_at: new Date(now.getFullYear(), 6, 1).toISOString(),
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
    demoMode: true,
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}
