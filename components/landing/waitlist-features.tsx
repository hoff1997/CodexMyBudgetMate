import { Building2, CalendarClock, PiggyBank, TrendingDown, Bell, Heart } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "NZ Bank Sync",
    description: "Connect your Kiwi bank accounts directly. No more manual entry.",
  },
  {
    icon: CalendarClock,
    title: "Fortnightly Pay Support",
    description: "Built for how we actually get paid in New Zealand.",
  },
  {
    icon: PiggyBank,
    title: "Envelope Budgeting",
    description: "Give every dollar a purpose. See exactly where your money goes.",
  },
  {
    icon: TrendingDown,
    title: "Debt Snowball",
    description: "Crush your debt with a proven method that actually works.",
  },
  {
    icon: Bell,
    title: "Bill Reminders",
    description: "Never miss a payment. Know exactly what's coming up.",
  },
  {
    icon: Heart,
    title: "Coaching, Not Lecturing",
    description: "Remy guides you without judgment. Your pace, your journey.",
  },
];

export function WaitlistFeatures() {
  return (
    <section className="py-16 md:py-24 bg-silver-very-light">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
            What&apos;s coming your way
          </h2>
          <p className="text-lg text-text-medium max-w-2xl mx-auto">
            We&apos;re building the budgeting app New Zealand deserves. Here&apos;s a sneak peek.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-silver-light hover:border-sage-light hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-sage-very-light rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-sage" />
              </div>
              <h3 className="font-semibold text-text-dark mb-2">{feature.title}</h3>
              <p className="text-text-medium text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
