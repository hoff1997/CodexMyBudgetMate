import { Button } from "@/components/ui/button";

const roadmapItems = [
  {
    title: "Coach mode",
    description: "Invite your financial coach to review budgets, leave notes, and celebrate wins.",
  },
  {
    title: "Automation recipes",
    description: "Create rules to auto-tag merchants and split transactions on import.",
  },
  {
    title: "Mobile widgets",
    description: "iOS and Android widgets for quick envelope checks on the go.",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-10 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Coming soon</h1>
        <p className="text-base text-muted-foreground">
          Here’s what we’re actively building to level up your budgeting workflow.
        </p>
      </header>
      <section className="space-y-5">
        {roadmapItems.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-6 py-5"
          >
            <h2 className="text-lg font-semibold text-secondary">{item.title}</h2>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </section>
      <footer className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Want to shape the roadmap? Let us know which feature would help most.
        <Button className="mt-3" variant="secondary">
          Share feedback
        </Button>
      </footer>
    </div>
  );
}
