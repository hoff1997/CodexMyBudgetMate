import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Create your base accounts",
    description:
      "Add transaction, savings, and debt accounts so balances flow through every part of the app.",
    action: { label: "Go to Accounts", href: "/accounts" },
  },
  {
    title: "Plan your envelopes",
    description:
      "Set envelope targets by pay cycle so you know exactly how much to set aside each payday.",
    action: { label: "Open Envelope Planner", href: "/envelope-planning" },
  },
  {
    title: "Connect Akahu",
    description:
      "Link your NZ bank through Akahu for automatic transaction imports and faster reconciliation.",
    action: { label: "Connect your bank", href: "/dashboard" },
  },
  {
    title: "Complete first reconciliation",
    description:
      "Approve and categorise your first bank feed to build confidence in the cashflow snapshot.",
    action: { label: "Review transactions", href: "/reconcile" },
  },
];

export default function GettingStartedPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-10 md:py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-primary/70">Kick-off</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-secondary">Getting started</h1>
        <p className="text-base text-muted-foreground">
          Work through these steps to get My Budget Mate humming. Each checklist item unlocks a
          downstream feature like envelope health and rolling balances.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title} className="flex h-full flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="text-xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </div>
            <div className="border-t px-6 py-4">
              <Button asChild className="w-full" variant="secondary">
                <Link href={step.action.href}>{step.action.label}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>
      <footer className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-primary">
        Tip: keep your budget synced by reconciling at least once a week and tweaking envelope
        targets whenever your pay changes.
      </footer>
    </div>
  );
}
