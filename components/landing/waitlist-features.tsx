import { Building2, CalendarClock, Compass, Mail, Milestone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function LineSquiggle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2" />
    </svg>
  );
}

const features = [
  {
    icon: Building2,
    iconAlt: "NZ bank sync icon for Akahu integration",
    title: "NZ Bank Sync",
    description:
      "Connect your Kiwi bank accounts through Akahu. Transactions flow in automatically so you can ditch the spreadsheets.",
  },
  {
    icon: CalendarClock,
    iconAlt: "Fortnightly pay cycle budget support",
    title: "Built for Kiwi Pay Cycles",
    description:
      "Fortnightly pay? Sorted. Weekly? No worries. A budgeting app that works with your pay cycle, not against it.",
  },
  {
    icon: Compass,
    iconAlt: "Guided budget setup with Remy",
    title: "Guided Budget Setup",
    description:
      "Remy walks you through it step by step. No budget experience needed. No spreadsheet degree required.",
  },
  {
    icon: Mail,
    iconAlt: "Envelope budgeting for bills savings and spending",
    title: "Envelope Budgeting",
    description:
      "Allocate your pay into digital envelopes for bills, savings, and spending. Always know what's available before you tap.",
  },
  {
    icon: Milestone,
    iconAlt: "The My Budget Way financial roadmap",
    title: "The My Budget Way",
    description:
      "A clear path that works: Fill your envelopes, Save your Starter Stash, Destroy Debt, Build your Safety Net, Grow your Future Fund.",
  },
  {
    icon: LineSquiggle,
    iconAlt: "Coaching not lecturing financial guidance",
    title: "Coaching, Not Lecturing",
    description:
      "No guilt trips here. Remy keeps it real but keeps it kind. Setbacks happen. We move forward. Your pace, your journey.",
  },
];

const faqs = [
  {
    question: "Is My Budget Mate free?",
    answer: "We will be launching with paid, budget friendly plans.",
  },
  {
    question: "Does it work with NZ banks?",
    answer:
      "Yes! We connect to all major NZ banks through Akahu including ANZ, ASB, Westpac, BNZ, and Kiwibank. You can also link some investment providers like Booster.",
  },
  {
    question: "Is this like YNAB for New Zealand?",
    answer:
      "We use similar envelope budgeting principles, but we're built specifically for NZ with fortnightly pay support and local bank connections.",
  },
  {
    question: "What is envelope budgeting?",
    answer:
      "Envelope budgeting means allocating your income into categories (envelopes) before you spend. Each dollar has a place to go each pay cycle, so you always know what's available.",
  },
];

export function WaitlistFeatures() {
  return (
    <>
      {/* Feature Cards */}
      <section className="py-16 md:py-24 bg-silver-very-light">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
              Why Kiwis are choosing My Budget Mate
            </h2>
            <p className="text-lg text-text-medium max-w-2xl mx-auto">
              Budget app features built for New Zealand
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 border border-silver-light hover:border-sage-light hover:shadow-lg transition-all"
              >
                <div
                  className="w-12 h-12 bg-sage-very-light rounded-xl flex items-center justify-center mb-4"
                  role="img"
                  aria-label={feature.iconAlt}
                >
                  <feature.icon className="w-6 h-6 text-sage" />
                </div>
                <h3 className="font-semibold text-text-dark mb-2">{feature.title}</h3>
                <p className="text-text-medium text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border-silver-light">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-text-dark">{faq.question}</CardTitle>
                  <CardDescription className="text-sm text-text-medium">
                    {faq.answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
