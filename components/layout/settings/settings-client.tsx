"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { calculateRequiredContribution } from "@/lib/planner/calculations";
import { formatCurrency } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EnvelopeRow = {
  id: string;
  name: string;
  annualAmount: number;
  payCycleAmount: number;
  frequency: string | null;
  nextPaymentDue: string | null;
  notes: string | null;
};

type LabelRow = {
  id: string;
  name: string;
  colour: string | null;
};

type BankConnectionRow = {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  syncFrequency: string | null;
  createdAt: string | null;
};

type SecuritySettings = {
  twoFactorEnabled: boolean;
  backupCodesRemaining: number;
};

type WebhookSettings = {
  akahuEvents: boolean;
  envelopePush: boolean;
};

export type SettingsData = {
  profile: {
    fullName: string;
    avatarUrl: string | null;
    email: string | null;
  };
  envelopes: EnvelopeRow[];
  labels: LabelRow[];
  bankConnections: BankConnectionRow[];
  security: SecuritySettings;
  webhooks: WebhookSettings;
  demoMode: boolean;
};

type Props = {
  data: SettingsData;
};

export function SettingsClient({ data }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileName, setProfileName] = useState(data.profile.fullName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.profile.avatarUrl);
  const [labels, setLabels] = useState<LabelRow[]>(data.labels);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColour, setNewLabelColour] = useState("#0ea5e9");
  const [webhooks, setWebhooks] = useState<WebhookSettings>(data.webhooks);
  const [security, setSecurity] = useState<SecuritySettings>(data.security);
  const [notes, setNotes] = useState("");

  const envelopeSum = useMemo(
    () => data.envelopes.reduce((sum, envelope) => sum + envelope.annualAmount, 0),
    [data.envelopes],
  );

  const connectionGroups = useMemo(() => {
    const groups: Record<string, BankConnectionRow[]> = {
      connected: [],
      pending: [],
      issues: [],
    };
    data.bankConnections.forEach((connection) => {
      const status = connection.status.toLowerCase();
      if (status.includes("connected")) {
        groups.connected.push(connection);
      } else if (status.includes("pending")) {
        groups.pending.push(connection);
      } else {
        groups.issues.push(connection);
      }
    });
    return groups;
  }, [data.bankConnections]);

  function handleSelectPhoto() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    toast.promise(simulateUpload(file), {
      loading: "Uploading photo…",
      success: "Profile photo updated",
      error: "Upload failed. Please try again.",
    });
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    toast.success("Profile photo cleared");
  }

  async function handleSaveProfile() {
    toast.success("Profile details saved");
  }

  function handleCreateLabel() {
    if (!newLabelName.trim()) {
      toast.error("Label name cannot be blank");
      return;
    }
    const newLabel: LabelRow = {
      id: `local-${Date.now()}`,
      name: newLabelName.trim(),
      colour: newLabelColour,
    };
    setLabels((prev) => [...prev, newLabel]);
    setNewLabelName("");
    toast.success("Label added");
  }

  function handleDeleteLabel(id: string) {
    setLabels((prev) => prev.filter((label) => label.id !== id));
    toast.success("Label removed");
  }

  function handleToggleWebhook(key: keyof WebhookSettings) {
    setWebhooks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success(`${key === "akahuEvents" ? "Akahu events" : "Envelope push"} ${next[key] ? "enabled" : "disabled"}`);
      return next;
    });
  }

  function handleTwoFactorToggle() {
    setSecurity((prev) => {
      const next = { ...prev, twoFactorEnabled: !prev.twoFactorEnabled };
      toast.success(`Two-factor authentication ${next.twoFactorEnabled ? "enabled" : "disabled"}`);
      return next;
    });
  }

  function handleGenerateBackupCodes() {
    setSecurity((prev) => ({ ...prev, backupCodesRemaining: 10 }));
    toast.success("New backup codes generated");
  }

  function handleConnectionAction(connection: BankConnectionRow, action: "refresh" | "disconnect") {
    toast.success(
      `${action === "refresh" ? "Refresh" : "Disconnect"} request queued for ${connection.provider}`,
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-secondary">Settings</h1>
          {data.demoMode ? (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Demo
            </Badge>
          ) : null}
        </div>
        <p className="text-base text-muted-foreground">
          Manage your profile, automate label workflows, and keep bank connections healthy.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Personalise the avatar and name that appear throughout the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <AvatarPreview name={profileName} src={avatarPreview} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSelectPhoto}>
                  Upload photo
                </Button>
                <Button size="sm" variant="outline" onClick={handleRemoveAvatar}>
                  Remove
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Full name</span>
                <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input value={data.profile.email ?? ""} readOnly />
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveProfile}>
                Save profile
              </Button>
              <Button size="sm" variant="outline">
                Manage household members
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick totals</CardTitle>
            <CardDescription>Key metrics from envelopes and bank connections.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <MetricRow label="Annual envelope funding" value={formatCurrency(envelopeSum)} />
            <MetricRow label="Active bank connections" value={data.bankConnections.length.toString()} />
            <MetricRow label="Labels in use" value={labels.length.toString()} />
            <MetricRow
              label="2FA status"
              value={security.twoFactorEnabled ? "Enabled" : "Disabled"}
              tone={security.twoFactorEnabled ? "text-emerald-600" : "text-rose-600"}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Envelope sync</CardTitle>
          <CardDescription>Planner contributions update automatically across the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
            Total annual envelope funding: {formatCurrency(envelopeSum, "NZD")}
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Envelope</th>
                  <th className="px-4 py-3">Annual</th>
                  <th className="px-4 py-3">Per pay (monthly)</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Next due</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.envelopes.length ? (
                  data.envelopes.map((envelope) => {
                    const perPay = calculateRequiredContribution(envelope.annualAmount, "monthly");
                    return (
                      <tr key={envelope.id} className="text-sm">
                        <td className="px-4 py-3 text-secondary">{envelope.name}</td>
                        <td className="px-4 py-3">{formatCurrency(envelope.annualAmount)}</td>
                        <td className="px-4 py-3">{formatCurrency(perPay)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{envelope.frequency ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {envelope.nextPaymentDue ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{envelope.notes ?? "—"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                      No envelopes yet. Add some in the planner to see settings here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Label manager</CardTitle>
          <CardDescription>Keep transaction and envelope labels tidy with colour coding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[2fr,1fr,auto]">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Label name</span>
              <Input
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="Utilities"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Colour</span>
              <Input
                type="color"
                value={newLabelColour}
                onChange={(event) => setNewLabelColour(event.target.value)}
              />
            </label>
            <div className="flex items-end">
              <Button size="sm" onClick={handleCreateLabel}>
                Add label
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labels.length ? (
              labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                  style={{ borderColor: label.colour ?? undefined }}
                >
                  <div>
                    <p className="font-medium text-secondary">{label.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {label.colour ?? "Default palette"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteLabel(label.id)}>
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                No labels yet. Create your first label to start tagging transactions.
              </div>
            )}
          </div>
          <div>
            <Label className="text-sm text-muted-foreground" htmlFor="label-notes">
              Label automation notes
            </Label>
            <Textarea
              id="label-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Document category rules or coaching notes for label usage."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank connections</CardTitle>
          <CardDescription>
            Monitor sync cycles, resolve connection issues, and manage webhook delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-3 text-sm text-muted-foreground">
              <OverviewMetric
                label="Connected"
                value={connectionGroups.connected.length}
                tone="text-emerald-600"
              />
              <OverviewMetric label="Pending" value={connectionGroups.pending.length} tone="text-secondary" />
              <OverviewMetric
                label="Attention needed"
                value={connectionGroups.issues.length}
                tone={connectionGroups.issues.length ? "text-rose-600" : "text-secondary"}
              />
              <p>
                Sync jobs run in the background using your configured frequency. Trigger a manual refresh if you
                suspect delays in new transactions.
              </p>
            </TabsContent>
            <TabsContent value="connections" className="mt-4 space-y-3">
              {data.bankConnections.length ? (
                data.bankConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-secondary">{connection.provider}</p>
                        <p className="text-xs">
                          Status: <StatusBadge status={connection.status} />
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleConnectionAction(connection, "refresh")}>
                          Refresh
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleConnectionAction(connection, "disconnect")}>
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                      <MetricRow label="Last sync" value={formatTimestamp(connection.lastSyncedAt)} />
                      <MetricRow label="Frequency" value={connection.syncFrequency ?? "Not set"} />
                      <MetricRow label="Connected" value={formatTimestamp(connection.createdAt)} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                  No bank connections yet. Connect through Akahu to enable automatic transaction imports.
                </div>
              )}
            </TabsContent>
            <TabsContent value="webhooks" className="mt-4 space-y-4">
              <WebhookToggle
                label="Akahu event stream"
                description="Receive transaction, account, and connection updates directly from Akahu."
                value={webhooks.akahuEvents}
                onChange={() => handleToggleWebhook("akahuEvents")}
              />
              <WebhookToggle
                label="Envelope push notifications"
                description="Send Supabase webhook events when envelope balances cross alert thresholds."
                value={webhooks.envelopePush}
                onChange={() => handleToggleWebhook("envelopePush")}
              />
              <p className="text-xs text-muted-foreground">
                Webhook deliveries are logged via Supabase edge functions. Ensure your URL responds within 5 seconds to avoid retries.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security &amp; 2FA</CardTitle>
          <CardDescription>
            Add an extra layer of protection for bank connections and coach handoffs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg border bg-muted/10 p-4">
            <p className="font-medium text-secondary">Two-factor authentication</p>
            <p className="mt-1 text-xs">
              Enable TOTP codes to approve sensitive actions. Scan the QR code with an authenticator app when prompted.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleTwoFactorToggle}>
                {security.twoFactorEnabled ? "Disable 2FA" : "Set up authenticator"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerateBackupCodes} disabled={!security.twoFactorEnabled}>
                Generate backup codes
              </Button>
              <Button size="sm" variant="outline">
                Download recovery PDF
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-secondary/40 bg-secondary/5 p-4 text-xs">
            Backup codes remaining: {security.backupCodesRemaining}. Store them in a secure password manager.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AvatarPreview({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
        <Image src={src} alt={name || "Profile photo"} fill className="object-cover" />
      </div>
    );
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-primary text-lg font-semibold text-primary">
      {initials || "MB"}
    </div>
  );
}

function MetricRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-medium text-secondary ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function OverviewMetric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2 text-sm">
      <span>{label}</span>
      <span className={`font-semibold ${tone ?? "text-secondary"}`}>{value}</span>
    </div>
  );
}

function WebhookToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-secondary">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-primary" : "bg-muted"
        }`}
        aria-pressed={value}
      >
        <span
          className={`ml-1 inline-block h-4 w-4 transform rounded-full bg-background transition ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase();
  const styles = tone.includes("connected")
    ? "bg-emerald-100 text-emerald-700"
    : tone.includes("pending")
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

async function simulateUpload(file: File) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return file.size;
}
