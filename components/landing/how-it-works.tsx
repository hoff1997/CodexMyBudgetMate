import { Building2, LayoutGrid, BarChart3 } from "lucide-react";
import Image from "next/image";

const steps = [
  {
    number: "1",
    icon: Building2,
    title: "Connect Your Bank",
    description:
      "Link your NZ bank account securely through Akahu. Your transactions flow in automatically - no spreadsheets needed.",
  },
  {
    number: "2",
    icon: LayoutGrid,
    title: "Allocate Your Pay",
    description:
      "Split your income into digital envelopes for bills, savings, and spending. Remy guides you through it step by step.",
  },
  {
    number: "3",
    icon: BarChart3,
    title: "Track and Grow",
    description:
      "See exactly where your money goes each pay cycle. Destroy debt, build savings, and grow your future fund - at your pace.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
            How My Budget Mate Works
          </h2>
          <p className="text-lg text-text-medium max-w-2xl mx-auto">
            Three simple steps to take control of your money
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-sage-light" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              {/* Number circle */}
              <div className="relative z-10 w-14 h-14 mx-auto mb-6 bg-sage text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                {step.number}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-4 bg-sage-very-light rounded-xl flex items-center justify-center">
                <step.icon className="w-7 h-7 text-sage-dark" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-text-dark mb-2">
                {step.title}
              </h3>
              <p className="text-text-medium text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Remy endorsement */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-sage-light bg-sage-light flex-shrink-0">
            <Image
              src="/Images/remy-encouraging.png"
              alt="Remy"
              fill
              className="object-cover object-top"
              quality={100}
              unoptimized
            />
          </div>
          <p className="text-sm text-sage-dark italic">
            &quot;I&apos;ll walk you through every step. No budget experience needed.&quot;
          </p>
        </div>
      </div>
    </section>
  );
}
