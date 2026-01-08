"use client";

import Link from "next/link";
import { ArrowLeft, Cookie, Shield, BarChart3, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COOKIE_CATEGORY_INFO } from "@/lib/types/cookie-consent";

const cookieCategories = [
  {
    key: "strictly_necessary" as const,
    icon: Shield,
    cookies: [
      {
        name: "sb-*-auth-token",
        purpose: "Supabase authentication session",
        duration: "Session / 1 year",
        provider: "Supabase",
      },
      {
        name: "mbm_cookie_consent",
        purpose: "Stores your cookie preferences",
        duration: "1 year",
        provider: "My Budget Mate",
      },
    ],
  },
  {
    key: "analytics" as const,
    icon: BarChart3,
    cookies: [
      {
        name: "None currently",
        purpose: "We do not currently use analytics cookies",
        duration: "N/A",
        provider: "N/A",
      },
    ],
  },
  {
    key: "marketing" as const,
    icon: Megaphone,
    cookies: [
      {
        name: "None",
        purpose: "We do not use marketing or advertising cookies",
        duration: "N/A",
        provider: "N/A",
      },
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-16 md:px-10">
      {/* Back link */}
      <Link
        href="/privacy"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-sage transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Privacy Policy
      </Link>

      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sage-very-light rounded-lg">
            <Cookie className="w-6 h-6 text-sage" />
          </div>
          <p className="text-xs uppercase tracking-wide text-primary">
            Cookie Policy
          </p>
        </div>
        <h1 className="text-4xl font-semibold text-secondary md:text-5xl">
          How we use cookies
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Last updated{" "}
          {new Date().toLocaleDateString("en-NZ", { dateStyle: "long" })}. This
          policy explains what cookies we use and why.
        </p>
      </header>

      {/* What are cookies */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-secondary">
          What are cookies?
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground md:text-base">
          <p>
            Cookies are small text files that are placed on your device when you
            visit a website. They are widely used to make websites work more
            efficiently and to provide information to website owners.
          </p>
          <p>
            We use cookies to keep you signed in, remember your preferences, and
            understand how you use our service so we can improve it.
          </p>
        </div>
      </section>

      {/* Cookie Categories */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-secondary">
          Cookies we use
        </h2>

        {cookieCategories.map((category) => {
          const info = COOKIE_CATEGORY_INFO[category.key];
          const Icon = category.icon;

          return (
            <div
              key={category.key}
              className="rounded-xl border border-silver-light overflow-hidden"
            >
              {/* Category Header */}
              <div className="bg-sage-very-light px-4 py-3 flex items-center gap-3">
                <Icon className="w-5 h-5 text-sage" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-dark">{info.name}</h3>
                  <p className="text-sm text-text-medium">{info.description}</p>
                </div>
                {info.required && (
                  <span className="text-xs bg-sage text-white px-2 py-1 rounded">
                    Always On
                  </span>
                )}
              </div>

              {/* Cookie Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-text-dark">
                        Cookie Name
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-text-dark">
                        Purpose
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-text-dark">
                        Duration
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-text-dark">
                        Provider
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.cookies.map((cookie, index) => (
                      <tr
                        key={index}
                        className="border-t border-silver-light hover:bg-muted/10"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-medium">
                          {cookie.name}
                        </td>
                        <td className="px-4 py-3 text-text-medium">
                          {cookie.purpose}
                        </td>
                        <td className="px-4 py-3 text-text-medium">
                          {cookie.duration}
                        </td>
                        <td className="px-4 py-3 text-text-medium">
                          {cookie.provider}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {/* Your choices */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-secondary">Your choices</h2>
        <div className="space-y-2 text-sm text-muted-foreground md:text-base">
          <p>
            When you first visit My Budget Mate, you will see a cookie banner
            that lets you accept all cookies or customize your preferences.
          </p>
          <p>
            You can change your cookie preferences at any time by visiting your{" "}
            <Link
              href="/settings/privacy"
              className="text-sage hover:text-sage-dark underline"
            >
              Privacy Settings
            </Link>
            .
          </p>
          <p>
            You can also control cookies through your browser settings. Most
            browsers allow you to block or delete cookies. However, if you block
            strictly necessary cookies, some parts of My Budget Mate may not
            work properly.
          </p>
        </div>
      </section>

      {/* Legal basis */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-secondary">Legal basis</h2>
        <div className="space-y-2 text-sm text-muted-foreground md:text-base">
          <p>
            We comply with the{" "}
            <strong>Privacy Act 2020 (New Zealand)</strong>, the{" "}
            <strong>UK GDPR</strong>, and the{" "}
            <strong>Privacy and Electronic Communications Regulations (PECR)</strong>.
          </p>
          <p>
            For strictly necessary cookies, we rely on legitimate interest as
            they are essential for the service to function.
          </p>
          <p>
            For analytics and marketing cookies (if enabled), we rely on your
            explicit consent, which you can withdraw at any time.
          </p>
        </div>
      </section>

      {/* Updates */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-secondary">
          Updates to this policy
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground md:text-base">
          <p>
            We may update this cookie policy from time to time. When we make
            significant changes, we will notify you through the app or by
            email.
          </p>
        </div>
      </section>

      {/* Contact */}
      <footer className="rounded-3xl border bg-muted/10 p-6 text-sm text-muted-foreground md:text-base">
        <p className="font-medium text-secondary">Questions about cookies?</p>
        <p className="mt-2">
          Contact us at{" "}
          <a
            href="mailto:privacy@mybudgetmate.nz"
            className="underline underline-offset-4"
          >
            privacy@mybudgetmate.nz
          </a>{" "}
          or visit our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          for more information about how we handle your data.
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Clear localStorage and reload to show banner
              localStorage.removeItem("mbm_cookie_consent");
              window.location.reload();
            }}
          >
            <Cookie className="w-4 h-4 mr-2" />
            Manage Cookie Preferences
          </Button>
        </div>
      </footer>
    </main>
  );
}
