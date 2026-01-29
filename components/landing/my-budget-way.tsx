import { CheckCircle2 } from "lucide-react";

const roadmapSteps = [
  {
    step: 1,
    title: "Fill Your Envelopes",
    description:
      "Allocate every dollar of your pay into envelopes for bills, spending, and savings. Know exactly what you can spend before you spend it.",
    colour: "blue",
  },
  {
    step: 2,
    title: "Save Your Starter Stash",
    description:
      "Build a buffer of $1,000 so unexpected costs don't derail your budget. A cushion that lets you breathe.",
    colour: "blue",
  },
  {
    step: 3,
    title: "Destroy Debt",
    description:
      "Use the debt snowball method to knock out debt one by one, smallest to largest. Every payoff builds momentum.",
    colour: "blue",
  },
  {
    step: 4,
    title: "Build Your Safety Net",
    description:
      "Grow your emergency fund to cover 3 months of expenses. Peace of mind when life throws a curveball.",
    colour: "blue",
  },
  {
    step: 5,
    title: "Grow Your Future Fund",
    description:
      "With debt gone and safety secured, invest in your future - KiwiSaver top-ups, savings goals, investments or whatever matters to you.",
    colour: "blue",
  },
];

export function MyBudgetWay() {
  return (
    <section id="roadmap" className="py-16 md:py-24 bg-silver-very-light">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
            The My Budget Way
          </h2>
          <p className="text-lg text-text-medium max-w-2xl mx-auto">
            A clear roadmap for your money - no matter where you&apos;re starting from
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-sage-light" />

          <div className="space-y-8">
            {roadmapSteps.map((item) => (
              <div key={item.step} className="relative flex gap-4 md:gap-6">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ${
                    item.colour === "blue"
                      ? "bg-blue-light text-blue"
                      : item.colour === "gold"
                        ? "bg-gold-light text-gold"
                        : "bg-sage-very-light text-sage"
                  }`}
                >
                  <span className="text-lg md:text-xl font-bold">{item.step}</span>
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-2xl border border-silver-light p-5 md:p-6 hover:border-sage-light hover:shadow-md transition-all">
                  <h3 className="text-lg font-semibold text-text-dark mb-2">
                    {item.title}
                  </h3>
                  <p className="text-text-medium text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Completion marker */}
          <div className="relative flex items-center gap-4 md:gap-6 mt-8">
            <div className="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <p className="text-sage-dark font-semibold text-lg">
              You&apos;re in control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
