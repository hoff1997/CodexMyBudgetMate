"use client";

import Link from "next/link";
import Image from "next/image";

const sections = [
  {
    title: "How bank connection works",
    copy: [
      "My Budget Mate connects to your New Zealand bank accounts through Akahu, a trusted open banking provider. This allows your transactions to flow automatically into your budget, eliminating manual data entry.",
      "When you connect a bank account, you authorise Akahu to securely retrieve your transaction data. My Budget Mate then receives this data to populate your envelopes, reconciliation queue, and reports.",
      "We never see or store your bank login credentials. Authentication happens directly between you and Akahu using bank-grade security.",
    ],
  },
  {
    title: "What is Akahu?",
    copy: [
      "Akahu is New Zealand's leading open banking platform, accredited under the Consumer Data Right (CDR) framework. They provide secure, regulated connections to ANZ, ASB, BNZ, Westpac, Kiwibank, and other NZ financial institutions.",
      "Akahu acts as a secure intermediary between your bank and My Budget Mate. They are regulated by the Financial Markets Authority (FMA) and comply with NZ privacy legislation.",
      "Learn more about Akahu at akahu.nz or review their privacy policy at akahu.nz/privacy.",
    ],
  },
  {
    title: "What data do we access?",
    copy: [
      "Account information: Account names, types, and balances to help you track your financial position.",
      "Transaction history: Merchant names, amounts, dates, and bank memos to populate your budget and reconciliation workflow.",
      "We request read-only access. My Budget Mate cannot move money, make payments, or modify your bank accounts in any way.",
    ],
  },
  {
    title: "Security measures",
    copy: [
      "Bank-grade encryption: All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption.",
      "Two-factor authentication: We require 2FA for all users connecting bank accounts, adding an extra layer of protection.",
      "No credential storage: Your bank username and password are never shared with or stored by My Budget Mate.",
      "Regular security assessments: We conduct security reviews and follow OWASP best practices for application security.",
      "NZ-hosted infrastructure: Your data is stored in Australia/New Zealand region data centres.",
    ],
  },
  {
    title: "Your control over connections",
    copy: [
      "Connect and disconnect anytime: You can add or remove bank connections from your Settings page at any time.",
      "Selective account access: Choose which accounts to connect - you don't have to link everything.",
      "Full control in-app: Manage all your bank connections directly within My Budget Mate - no need to visit external sites.",
      "Data deletion: When you disconnect an account or delete your My Budget Mate account, associated transaction data is removed from our systems.",
    ],
  },
  {
    title: "Why we use Akahu",
    copy: [
      "CDR accredited: Akahu is one of the first providers accredited under NZ's Consumer Data Right legislation, meaning they meet strict regulatory standards.",
      "Official bank APIs: Akahu connects through official bank APIs rather than screen scraping, providing more reliable and secure data access.",
      "Kiwi company: Akahu is a New Zealand company, subject to NZ laws and regulations, ensuring your data stays protected under local privacy legislation.",
      "Proven track record: Akahu powers financial data for major NZ apps and institutions, processing millions of transactions securely.",
    ],
  },
  {
    title: "Frequently asked questions",
    subsections: [
      {
        question: "Is it safe to connect my bank?",
        answer:
          "Yes. Akahu uses bank-grade security and is regulated by the FMA. We only have read-only access and cannot move your money.",
      },
      {
        question: "Will my bank know I'm using My Budget Mate?",
        answer:
          "Your bank will see that you've authorised Akahu to access your data. They won't see My Budget Mate specifically.",
      },
      {
        question: "What if I change my bank password?",
        answer:
          "You may need to re-authorise the connection through Akahu. We'll alert you if your connection becomes inactive.",
      },
      {
        question: "Can I use My Budget Mate without connecting a bank?",
        answer:
          "Yes! You can use manual transaction entry on our free plan. Bank connections are optional but save significant time.",
      },
      {
        question: "How do I disconnect my bank?",
        answer:
          "Go to Settings > Bank Connections and click disconnect. Your connection will be removed immediately.",
      },
    ],
  },
];

export default function BankConnectionPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-16 md:px-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-primary">
          Bank Connection
        </p>
        <h1 className="text-4xl font-semibold text-secondary md:text-5xl">
          How we securely connect to your bank
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          My Budget Mate uses Akahu, New Zealand&apos;s trusted open banking
          provider, to securely access your transaction data. Here&apos;s
          everything you need to know.
        </p>
      </header>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border bg-muted/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20">
            <svg
              className="h-5 w-5 text-sage-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Read-only access</p>
            <p className="text-xs text-muted-foreground">We can&apos;t move your money</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20">
            <svg
              className="h-5 w-5 text-sage-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Bank-grade encryption</p>
            <p className="text-xs text-muted-foreground">256-bit TLS security</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20">
            <svg
              className="h-5 w-5 text-sage-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">CDR accredited</p>
            <p className="text-xs text-muted-foreground">Regulated by NZ government</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-2xl font-semibold text-secondary">
              {section.title}
            </h2>
            {"copy" in section && section.copy && (
              <div className="space-y-2 text-sm text-muted-foreground md:text-base">
                {section.copy.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
            {"subsections" in section && section.subsections && (
              <div className="space-y-4">
                {section.subsections.map((faq, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/5 p-4"
                  >
                    <p className="font-medium text-secondary">{faq.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Akahu partnership section */}
      <section className="rounded-3xl border bg-muted/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-secondary">Powered by Akahu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Akahu is New Zealand&apos;s leading open banking platform, trusted by
              major financial institutions and apps across the country.
            </p>
          </div>
          <a
            href="https://www.akahu.nz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-dark"
          >
            Learn more about Akahu
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </section>

      <footer className="rounded-3xl border bg-muted/10 p-6 text-sm text-muted-foreground md:text-base">
        <p className="font-medium text-secondary">Questions about bank connections?</p>
        <p className="mt-2">
          Visit our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>{" "}
          for details on data handling, or contact{" "}
          <a
            href="mailto:support@mybudgetmate.nz"
            className="underline underline-offset-4"
          >
            support@mybudgetmate.nz
          </a>{" "}
          if you have specific questions about your connection.
        </p>
        <p className="mt-4">
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>
          {" | "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          {" | "}
          <Link href="/privacy/cookies" className="underline underline-offset-4">
            Cookie Policy
          </Link>
        </p>
      </footer>
    </main>
  );
}
