import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PiggyBank, MailCheck, ShieldCheck, Sparkles, Users } from "lucide-react";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-primary/10">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold text-secondary">My Budget Mate</span>
          </div>
          <Button asChild variant="ghost">
            <Link href="/">Back to site</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 md:flex-row md:items-start md:justify-between">
        <section className="max-w-xl space-y-6">
          <Badge variant="secondary" className="uppercase tracking-wide">
            Secure Supabase magic links
          </Badge>
          <h1 className="text-3xl font-semibold text-secondary md:text-4xl">
            Kia ora, welcome back to your budget mate.
          </h1>
          <p className="text-sm text-muted-foreground">
            Pop in your email and we’ll send a one-time magic link. It’s the same flow our Replit build
            used, now powered by Supabase so your data stays safe and in sync across devices.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: MailCheck,
                title: "Magic link, no password",
                copy: "Skip remembering passwords—open the email and you’re in.",
              },
              {
                icon: ShieldCheck,
                title: "Bank-grade security",
                copy: "Row-level security and planned 2FA keep access tight.",
              },
              {
                icon: Sparkles,
                title: "Demo mode available",
                copy: "Preview the app with sample envelopes before inviting your whānau.",
              },
              {
                icon: Users,
                title: "Coach friendly",
                copy: "Partnership programme ready—ask us to enable coach accounts.",
              },
            ].map((item) => (
              <Card key={item.title} className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-semibold text-secondary">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{item.copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base text-secondary">Need a demo account?</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Perfect for testing or showcasing the budgeting flows without sending a magic link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                In local development, set <code className="rounded bg-muted px-1">NEXT_PUBLIC_AUTH_DISABLED=true</code> and hop
                straight into the app.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard?demo=1">Explore in demo mode</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Want real access? Email <a className="underline" href="mailto:hello@mybudgetmate.co.nz">hello@mybudgetmate.co.nz</a> with a short intro.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="w-full max-w-md">
          <Card className="border shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-secondary">Sign in with a magic link</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                We’ll email you a secure link that expires in 5 minutes. Check your spam folder if it doesn’t arrive straight away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm />
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Need an account? {" "}
                <Link href="/signup" className="text-primary underline">
                  Request early access
                </Link>
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Prefer the old Replit login? Use the demo mode above or contact us for migration support.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
