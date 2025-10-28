import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, CreditCard, Target, TrendingUp, Shield, DollarSign, Smartphone, BarChart3, UserCircle, Building2, Sparkles, Users } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-primary/10">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-secondary">My Budget Mate</span>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Launch App</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="space-y-8 text-center">
          <Badge className="mx-auto w-fit" variant="secondary">
            Personal Finance Made Simple
          </Badge>
          <h1 className="text-4xl font-bold leading-tight text-secondary md:text-5xl">
            Take control of your money with envelope budgeting that fits your life.
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Connect your New Zealand bank accounts, automate transaction categorisation, and achieve
            your financial goals with our comprehensive budgeting platform.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Get Started Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CreditCard,
              title: "Bank integration",
              description: "Secure Akahu connections to ANZ, ASB, BNZ, Kiwibank, Westpac, and more.",
            },
            {
              icon: Target,
              title: "Envelope planning",
              description: "Zero-based budgeting with annual, per-pay, and due-date scheduling.",
            },
            {
              icon: TrendingUp,
              title: "Smart analytics",
              description: "Track spending trends, highlight overspend, and celebrate wins.",
            },
            {
              icon: Shield,
              title: "Secure & private",
              description: "Supabase auth, rows-level security, and planned 2FA keep data safe.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader>
                <feature.icon className="mb-3 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-secondary md:text-4xl">
            Why choose My Budget Mate?
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: DollarSign,
                title: "Zero-based budgeting",
                text: "Plan every dollar, sync across planner, settings, and recurring income.",
              },
              {
                icon: Smartphone,
                title: "Mobile ready",
                text: "Mobile-first roadmap with upcoming bottom nav, swipe gestures, and compact transactions.",
              },
              {
                icon: BarChart3,
                title: "Real-time insights",
                text: "Planner maths, reconciliation alerts, and upcoming analytics keep you informed.",
              },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center">
                <benefit.icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="text-xl font-semibold text-secondary">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="space-y-10">
          <div className="space-y-2 text-center">
            <Badge variant="outline">Loved by coaches and households across Aotearoa</Badge>
            <h2 className="text-3xl font-semibold text-secondary md:text-4xl">What people say</h2>
            <p className="mx-auto max-w-3xl text-sm text-muted-foreground">
              These quotes are placeholders until we plug in real case studies. Use them to convey the
              value props lifted from the Replit marketing pack.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "My clients finally see every pay cycle mapped to envelopes. The planner maths is a game changer.",
                name: "Aroha T.",
                role: "Financial coach, Wellington",
              },
              {
                quote:
                  "Linking our banks through Akahu means reconciliation is minutes, not hours.",
                name: "Sam & Priya",
                role: "Household, Auckland",
              },
              {
                quote:
                  "Zero-based budgeting felt hard—My Budget Mate makes it feel achievable every pay day.",
                name: "Michael P.",
                role: "Small business owner, Christchurch",
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <p className="text-sm text-muted-foreground">“{testimonial.quote}”</p>
                  <div className="mt-auto text-left">
                    <p className="font-semibold text-secondary">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faqs" className="space-y-8">
          <h2 className="text-3xl font-semibold text-secondary md:text-4xl text-center">
            Frequently asked questions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                question: "Does it work with my bank?",
                answer:
                  "Yes—Akahu covers ANZ, ASB, BNZ, Westpac, Kiwibank, and more. Manual CSV import is on the roadmap.",
              },
              {
                question: "Can I invite my financial coach?",
                answer:
                  "Coach mode is planned—our Supabase architecture is ready for multi-tenant access.",
              },
              {
                question: "Is my data secure?",
                answer:
                  "Supabase row-level security, environment-managed secrets, and upcoming 2FA keep your data safe.",
              },
              {
                question: "How do I get started?",
                answer:
                  "Use the Getting Started checklist inside the app to load accounts, envelopes, and recurring income.",
              },
            ].map((faq) => (
              <Card key={faq.question}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription>{faq.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border bg-primary/5 p-10 text-center">
          <h2 className="text-3xl font-semibold text-secondary md:text-4xl">
            Ready to transform your finances?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join households and coaches across Aotearoa building zero-based budgets that stick.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">Start your journey today</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Already invited? Sign in</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <PiggyBank className="h-5 w-5" />
            <span>&copy; {new Date().getFullYear()} My Budget Mate. Built with aroha in Aotearoa.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="#features" className="hover:underline">
              Features
            </Link>
            <Link href="#testimonials" className="hover:underline">
              Testimonials
            </Link>
            <Link href="#faqs" className="hover:underline">
              FAQs
            </Link>
            <Link href="/coming-soon" className="hover:underline">
              Roadmap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
