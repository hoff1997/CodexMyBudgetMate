import { Building2, TrendingUp } from "lucide-react";

interface SocialProofBarProps {
  waitlistCount?: number;
}

const banks = [
  { name: "ANZ", abbr: "ANZ" },
  { name: "ASB", abbr: "ASB" },
  { name: "BNZ", abbr: "BNZ" },
  { name: "The Co-operative Bank", abbr: "Co-op Bank" },
  { name: "Heartland", abbr: "Heartland" },
  { name: "Kiwibank", abbr: "Kiwibank" },
  { name: "NZHL", abbr: "NZHL" },
  { name: "Rabobank", abbr: "Rabobank" },
  { name: "SBS", abbr: "SBS" },
  { name: "TSB", abbr: "TSB" },
  { name: "Westpac", abbr: "Westpac" },
];

const funds = [
  { name: "Booster", abbr: "Booster" },
  { name: "Fisher Funds", abbr: "Fisher Funds" },
  { name: "Generate", abbr: "Generate" },
  { name: "Hatch", abbr: "Hatch" },
  { name: "Kernel Wealth", abbr: "Kernel" },
  { name: "Milford Asset Management", abbr: "Milford" },
  { name: "Pie Funds", abbr: "Pie Funds" },
  { name: "Sharesies", abbr: "Sharesies" },
  { name: "Sharesight", abbr: "Sharesight" },
  { name: "Simplicity", abbr: "Simplicity" },
  { name: "Stake", abbr: "Stake" },
  { name: "Superlife", abbr: "Superlife" },
];

export function SocialProofBar({ waitlistCount = 0 }: SocialProofBarProps) {
  return (
    <section className="py-8 bg-white border-b border-silver-light">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Powered by */}
        <div className="flex items-center justify-center">
          <p className="text-xs text-text-light">
            Powered by{" "}
            <span className="font-medium text-text-medium">Akahu</span>{" "}
            Open Banking
          </p>
        </div>

        {/* Banks */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-text-medium">
            <Building2 className="w-4 h-4 text-sage" />
            <span className="font-medium">Banks</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {banks.map((bank) => (
              <span
                key={bank.abbr}
                className="px-3 py-1 bg-silver-very-light border border-silver-light rounded-full text-xs font-medium text-text-medium"
              >
                {bank.abbr}
              </span>
            ))}
          </div>
        </div>

        {/* Funds & Investment Platforms */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-text-medium">
            <TrendingUp className="w-4 h-4 text-sage" />
            <span className="font-medium">Funds &amp; Investment Platforms</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {funds.map((fund) => (
              <span
                key={fund.abbr}
                className="px-3 py-1 bg-silver-very-light border border-silver-light rounded-full text-xs font-medium text-text-medium"
              >
                {fund.abbr}
              </span>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-text-light">
          Available connections may change at any time and some limitations may apply.
        </p>
      </div>
    </section>
  );
}
