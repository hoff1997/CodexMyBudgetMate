"use client";

import Link from "next/link";

const sections = [
  {
    title: "Introduction",
    copy: [
      "My Budget Mate is a budgeting planner designed for New Zealand households and coaches. These terms outline the conditions of use for the Supabase-hosted version of the app.",
      "By creating an account or connecting a bank feed you agree to the commitments below. If you are using My Budget Mate on behalf of a business or coaching practice, you confirm you have authority to bind that entity.",
    ],
  },
  {
    title: "Eligibility",
    copy: [
      "You must be at least 18 years old to connect bank accounts via Akahu.",
      "You are responsible for ensuring your use of My Budget Mate complies with all relevant laws, regulations, and bank terms.",
    ],
  },
  {
    title: "Account responsibilities",
    copy: [
      "Safeguard your login credentials and enable 2FA when available.",
      "Do not share access to your Supabase credentials or bank connections with unauthorised parties.",
      "Notify us immediately if you suspect unauthorised access via the in-app help link.",
    ],
  },
  {
    title: "Connected services",
    copy: [
      "Akahu manages bank connectivity; you must also accept their terms when linking accounts.",
      "Supabase provides the authentication, API, and storage layers. Service availability is tied to their infrastructure uptime.",
      "We may surface third-party services (e.g., accounting integrations) in the future—those will include separate terms before activation.",
    ],
  },
  {
    title: "Acceptable use",
    copy: [
      "Do not use My Budget Mate to store illegal content, infringe on intellectual property, or attempt to reverse engineer the service.",
      "Automated scraping, brute force attacks, or attempts to bypass security controls are strictly prohibited.",
      "Respect fellow users and avoid uploading content (labels, notes, receipts) that is abusive, discriminatory, or harmful.",
    ],
  },
  {
    title: "Payment and plan changes",
    copy: [
      "Pricing, if applicable, will be communicated separately and may change with 30 days notice.",
      "Failure to pay invoices may result in suspension of bank connections or read-only access until resolved.",
    ],
  },
  {
    title: "Availability and support",
    copy: [
      "We target 99% uptime excluding planned maintenance or outages caused by Akahu/Supabase.",
      "Support is available through the in-app help link.",
      "We may roll out beta features to limited accounts; participation is optional and feedback is welcome.",
    ],
  },
  {
    title: "Termination",
    copy: [
      "You can delete your account at any time. This removes bank tokens, transactions, envelopes, and uploaded receipts.",
      "We reserve the right to suspend or terminate accounts that violate these terms or present a security risk.",
    ],
  },
  {
    title: "Changes to these terms",
    copy: [
      "We will provide at least 14 days notice (via email or in-app banner) before material changes take effect.",
      "Continuing to use My Budget Mate after updated terms go live constitutes acceptance.",
    ],
  },
  {
    title: "Contact",
    copy: [
      "Questions or concerns can be directed to us via the in-app help link.",
      "Postal address for formal notices: My Budget Mate, PO Box 12345, Auckland 1143, New Zealand.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-16 md:px-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-primary">Terms of service</p>
        <h1 className="text-4xl font-semibold text-secondary md:text-5xl">
          The basics for using My Budget Mate
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Last updated {new Date().toLocaleDateString("en-NZ", { dateStyle: "long" })}. These terms
          align with the Supabase + Akahu deployment described in our product docs.
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
        <p className="font-medium text-secondary">Looking for the privacy policy?</p>
        <p className="mt-2">
          It lives alongside these terms. Visit the{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy page
          </Link>{" "}
          to see how we handle your data.
        </p>
      </footer>
    </main>
  );
}
