"use client";

import Link from "next/link";

const sections = [
  {
    title: "Overview",
    copy: [
      "My Budget Mate connects to your New Zealand banks through Akahu so you can reconcile real transactions, run envelope rules, and keep an accurate zero-budget plan. That means we treat privacy as a core product requirement, not an afterthought.",
      "This policy outlines what we store, how long we keep it, and the rights you have to manage or remove your data.",
    ],
  },
  {
    title: "What we collect",
    copy: [
      "Account data you enter directly: names of envelopes, notes, labels, asset and liability details.",
      "Transaction data pulled from Akahu: merchant name, amount, date, bank memo, envelope mappings, receipts you upload.",
      "Authentication details from Supabase: email address, session tokens, and optional profile metadata (full name, avatar).",
    ],
  },
  {
    title: "How we use your data",
    copy: [
      "To populate your budget dashboards, reports, and reconciliation workflow.",
      "To train merchant memory and rule suggestions inside your own account (data does not leave your workspace).",
      "To send transactional emails for login links, 2FA prompts, or bank connection alerts.",
    ],
  },
  {
    title: "Data retention",
    copy: [
      "You can delete envelopes, transactions, and attachments individually at any time.",
      "Removing your Supabase account will cascade-delete bank connections, transactions, receipts, and merchant rules.",
      "Backups, if enabled, are encrypted and rotate every 30 days.",
    ],
  },
  {
    title: "Third parties",
    copy: [
      "Akahu handles bank connections and secure data retrieval—review their policies at https://www.akahu.nz/privacy.",
      "Supabase hosts authentication, Postgres storage, database functions, and optional edge runtime features.",
      "No advertising or analytics pixels are embedded within the budgeting app.",
    ],
  },
  {
    title: "Your rights",
    copy: [
      "Request an export of your data via the in-app support link or email privacy@mybudgetmate.nz.",
      "Ask for corrections or removal of your account; we will confirm once deletion has been processed.",
      "Disable bank connections at any time. This stops new imports and removes access tokens from Akahu and Supabase.",
    ],
  },
  {
    title: "Contact",
    copy: [
      "Questions about privacy or data handling can be sent to privacy@mybudgetmate.nz.",
      "We target New Zealand households and coaches. If you are outside NZ, contact us before connecting any bank accounts.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-16 md:px-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-primary">Privacy policy</p>
        <h1 className="text-4xl font-semibold text-secondary md:text-5xl">
          How we protect your budgeting data
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Last updated {new Date().toLocaleDateString("en-NZ", { dateStyle: "long" })}. This version
          reflects the Supabase hosted build of My Budget Mate.
        </p>
      </header>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-2xl font-semibold text-secondary">{section.title}</h2>
            <div className="space-y-2 text-sm text-muted-foreground md:text-base">
              {section.copy.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="rounded-3xl border bg-muted/10 p-6 text-sm text-muted-foreground md:text-base">
        <p className="font-medium text-secondary">Need to update or delete your data?</p>
        <p className="mt-2">
          Visit the{" "}
          <Link href="/settings" className="underline underline-offset-4">
            settings hub
          </Link>{" "}
          to manage bank connections and download records, or contact{" "}
          <a href="mailto:privacy@mybudgetmate.nz" className="underline underline-offset-4">
            privacy@mybudgetmate.nz
          </a>{" "}
          for anything requiring manual support.
        </p>
        <p className="mt-4">
          For information about how we use cookies, see our{" "}
          <Link href="/privacy/cookies" className="underline underline-offset-4">
            Cookie Policy
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
