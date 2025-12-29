import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Layers, TrendingUp, Shield } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2EEEC] via-white to-[#F3F4F6]">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo - text only, no icon */}
          <span className="text-xl font-semibold text-[#3D3D3D]">My Budget Mate</span>
          <div className="flex gap-3">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        {/* Hero Section - Two Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Left: Text Content (60%) */}
          <div className="lg:col-span-3 space-y-5">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold leading-tight text-[#3D3D3D] md:text-5xl">
                Budgeting that actually fits your life.
              </h1>
              <p className="text-xl font-medium text-[#5A7E7A]">
                Tell your money where to go before you wonder where it went.
              </p>
            </div>
            <p className="max-w-xl text-lg text-[#6B6B6B]">
              Connect your NZ bank accounts and see exactly where you stand. No spreadsheets. Just clarity.
            </p>
            <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white">
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>

          {/* Right: Remy Image (40%) */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end">
            <Image
              src="/Images/remy-fullsize.png"
              alt="Remy, your budgeting guide, showing the My Budget Mate app"
              width={360}
              height={450}
              className="object-contain max-w-[280px] lg:max-w-[360px] w-full h-auto"
              priority
            />
          </div>
        </section>

        {/* Feature Cards */}
        <section id="features" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CreditCard,
              title: "Connects to your bank",
              description: "Works with ANZ, ASB, BNZ, Kiwibank, Westpac and more through Akahu. Your transactions flow in automatically.",
            },
            {
              icon: Layers,
              title: "Envelope budgeting",
              description: "Assign your money to envelopes: bills, groceries, fun money. Know exactly what's available before you spend.",
            },
            {
              icon: TrendingUp,
              title: "See the full picture",
              description: "Track where your money actually goes. Celebrate the wins. Spot the patterns. No judgement, just clarity.",
            },
            {
              icon: Shield,
              title: "Your data stays yours",
              description: "Bank-level encryption keeps everything secure. We never sell your information. Ever.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="h-full border-[#E5E7EB]">
              <CardHeader className="pb-2">
                <feature.icon className="mb-2 h-8 w-8 text-[#7A9E9A]" />
                <CardTitle className="text-lg text-[#3D3D3D]">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-[#6B6B6B]">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* FAQ Section */}
        <section id="faqs" className="space-y-6">
          <h2 className="text-3xl font-semibold text-[#3D3D3D] md:text-4xl text-center">
            Common questions
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                question: "Does it work with my bank?",
                answer:
                  "Yes! We connect to all major NZ banks through Akahu, including ANZ, ASB, BNZ, Westpac, and Kiwibank. If you prefer, you can also add transactions manually.",
              },
              {
                question: "Can I invite my financial coach?",
                answer:
                  "Not yet, but it's on our roadmap. The app is built to support coach access in the future.",
              },
              {
                question: "Is my data secure?",
                answer:
                  "Absolutely. Your data is encrypted and protected with bank-level security. We use read-only bank connections, so we can see your transactions but can never move your money.",
              },
              {
                question: "How do I get started?",
                answer:
                  "Sign up free, connect your bank accounts (or skip that for now), and start creating envelopes for your regular expenses. The Getting Started checklist walks you through it step by step.",
              },
            ].map((faq) => (
              <Card key={faq.question} className="border-[#E5E7EB]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#3D3D3D]">{faq.question}</CardTitle>
                  <CardDescription className="text-sm text-[#6B6B6B]">{faq.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-[#E2EEEC] p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#3D3D3D] md:text-3xl">
            Ready to see where your money&apos;s going?
          </h2>
          <p className="mt-3 text-base text-[#6B6B6B]">
            Join Kiwi households who budget by pay cycle, not by guesswork.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 md:flex-row">
            <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white">
              <Link href="/signup">Start your free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#E5E7EB] hover:border-[#7A9E9A] text-[#6B6B6B] bg-white">
              <Link href="/login">Already have an account? Sign in</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-[#3D3D3D] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <span>&copy; {new Date().getFullYear()} My Budget Mate. Built with aroha in Aotearoa.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="#features" className="hover:underline text-[#B8D4D0]">
              Features
            </Link>
            <Link href="#faqs" className="hover:underline text-[#B8D4D0]">
              FAQs
            </Link>
            <Link href="/privacy" className="hover:underline text-[#B8D4D0]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline text-[#B8D4D0]">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
