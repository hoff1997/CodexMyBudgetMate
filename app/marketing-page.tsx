import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Layers, TrendingUp, Shield } from "lucide-react";
import { ReturningUserCTA } from "@/components/landing/returning-user-cta";

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2EEEC] via-white to-[#F3F4F6]">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-semibold text-[#3D3D3D] whitespace-nowrap">My Budget Mate</span>
          <ReturningUserCTA variant="header" />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section - Side by side on mobile, larger layout on desktop */}
        <section className="flex flex-col">
          <div className="flex items-start justify-center gap-2 sm:gap-4 lg:gap-6">
            {/* Left: All text content */}
            <div className="flex-1 max-w-xl space-y-3">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#3D3D3D]">
                <span className="block sm:hidden">Budgeting that</span>
                <span className="block sm:hidden mt-1 whitespace-nowrap">actually fits your life</span>
                <span className="hidden sm:block">Budgeting that actually</span>
                <span className="hidden sm:block mt-2">fits your life</span>
              </h1>
              <p className="text-base sm:text-xl font-medium text-[#5A7E7A]">
                <span className="sm:hidden">Tell your money where to go before you wonder where it&nbsp;went.</span>
                <span className="hidden sm:inline">Tell your money where to go before you wonder where it went.</span>
              </p>
              <p className="text-base sm:text-lg text-[#6B6B6B] pt-1">
                <span className="block sm:hidden">Connect your NZ bank accounts and&nbsp;see&nbsp;exactly&nbsp;where&nbsp;you&nbsp;stand.</span>
                <span className="hidden sm:block">Connect your NZ bank accounts and see exactly where you stand.<br />No spreadsheets. Just clarity.</span>
                <span className="block sm:hidden mt-1">No spreadsheets. Just&nbsp;clarity.</span>
              </p>
              {/* Button on desktop - left aligned */}
              <div className="hidden sm:block mt-2">
                <ReturningUserCTA variant="hero" />
              </div>
            </div>

            {/* Right: Remy - aligned to top, pushed to right margin on mobile */}
            <div className="flex-shrink-0 -mr-4 sm:mr-0 sm:ml-0">
              <Image
                src="/Images/remy-fullsize.png"
                alt="Remy, your budgeting guide"
                width={300}
                height={375}
                className="object-contain w-[140px] sm:w-[120px] lg:w-[240px] h-auto"
                priority
                quality={100}
                unoptimized
              />
            </div>
          </div>
          {/* Button on mobile - centered to full width */}
          <div className="flex sm:hidden justify-center mt-4">
            <ReturningUserCTA variant="hero" />
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
        <section className="rounded-2xl border border-[#E5E7EB] bg-[#E2EEEC] p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#3D3D3D] md:text-3xl">
            Ready to see where your money&apos;s going?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6B6B6B]">
            Join Kiwi households who budget by pay cycle, not by guesswork.
          </p>
          <div className="mt-5">
            <ReturningUserCTA variant="footer" />
          </div>
        </section>
      </main>

      <footer className="bg-[#3D3D3D] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <span>&copy; {new Date().getFullYear()} My Budget Mate.</span>
            <br />
            <span>Built with aroha in Aotearoa (NZ)</span>
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
