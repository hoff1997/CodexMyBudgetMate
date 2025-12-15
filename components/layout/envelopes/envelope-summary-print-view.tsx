"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/finance";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";

interface PrintViewProps {
  envelopes: SummaryEnvelope[];
  totals: {
    target: number;
    current: number;
  };
  ccHolding?: number;
}

// Category order for sorting
const CATEGORY_ORDER: Record<string, number> = {
  housing: 1,
  utilities: 2,
  transport: 3,
  food: 4,
  healthcare: 5,
  insurance: 6,
  subscriptions: 7,
  savings: 8,
  debt: 9,
  personal: 10,
  entertainment: 11,
  pets: 12,
  kids: 13,
  gifts: 14,
  uncategorised: 999,
};

// Auto-categorize based on envelope name
function guessCategory(envelopeName: string): string {
  const name = envelopeName.toLowerCase();
  if (/rent|mortgage|home|house|property|rates|body corp|strata/i.test(name)) return "Housing";
  if (/electric|gas|water|power|energy|internet|phone|mobile|telstra|optus|vodafone|nbn/i.test(name)) return "Utilities";
  if (/car|fuel|petrol|rego|registration|insurance|transport|uber|lyft|parking|toll/i.test(name)) return "Transport";
  if (/grocer|food|woolworth|coles|aldi|iga|dining|restaurant|takeaway|coffee/i.test(name)) return "Food";
  if (/health|medical|doctor|dentist|pharmacy|medibank|bupa|hcf|nib/i.test(name)) return "Healthcare";
  if (/insurance|life cover|income protection|tpd/i.test(name)) return "Insurance";
  if (/netflix|spotify|disney|stan|amazon prime|subscription|youtube|apple music/i.test(name)) return "Subscriptions";
  if (/saving|emergency|rainy day|buffer|goal/i.test(name)) return "Savings";
  if (/debt|loan|credit card|cc |afterpay|zip pay|klarna/i.test(name)) return "Debt";
  if (/personal|clothing|haircut|gym|fitness|hobby/i.test(name)) return "Personal";
  if (/entertainment|movie|game|fun|leisure|vacation|holiday|travel/i.test(name)) return "Entertainment";
  if (/pet|dog|cat|vet/i.test(name)) return "Pets";
  if (/kid|child|school|daycare|childcare/i.test(name)) return "Kids";
  if (/gift|birthday|christmas|present/i.test(name)) return "Gifts";
  return "Uncategorised";
}

export function EnvelopeSummaryPrintView({ envelopes, totals, ccHolding = 0 }: PrintViewProps) {
  // Group envelopes by category
  const grouped = useMemo(() => {
    const groups: Record<string, SummaryEnvelope[]> = {};

    envelopes.forEach((env) => {
      const category = env.category_name || guessCategory(env.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(env);
    });

    // Sort categories
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const orderA = CATEGORY_ORDER[a.toLowerCase()] ?? 50;
        const orderB = CATEGORY_ORDER[b.toLowerCase()] ?? 50;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });
  }, [envelopes]);

  const gap = Math.max(0, totals.target - totals.current);

  const getPercent = (balance: number, target: number) => {
    if (target === 0) return balance >= 0 ? 100 : 0;
    return Math.round((balance / target) * 100);
  };

  const getStatusClass = (balance: number, target: number) => {
    if (balance < 0) return "negative";
    if (balance >= target) return "funded";
    return "underfunded";
  };

  return (
    <div className="print-only">
      {/* Header */}
      <div className="print-header">
        <h1>Envelope Summary</h1>
        <span className="date">
          My Budget Mate •{" "}
          {new Date().toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Stats line */}
      <div className="print-stats">
        <span className="stat">
          <span className="stat-label">Target:</span>{" "}
          <span className="stat-value">{formatCurrency(totals.target)}</span>
        </span>
        <span className="stat">
          <span className="stat-label">Balance:</span>{" "}
          <span className="stat-value">{formatCurrency(totals.current)}</span>
        </span>
        <span className="stat">
          <span className="stat-label">Gap:</span>{" "}
          <span className="stat-value">{formatCurrency(gap)}</span>
        </span>
        {ccHolding > 0 && (
          <span className="stat">
            <span className="stat-label">CC Hold:</span>{" "}
            <span className="stat-value">{formatCurrency(ccHolding)}</span>
          </span>
        )}
      </div>

      {/* Envelope table */}
      <table className="print-envelope-table">
        <thead>
          <tr>
            <th>Envelope</th>
            <th className="amount">Target</th>
            <th className="amount">Balance</th>
            <th className="percent">%</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([category, categoryEnvelopes]) => (
            <>
              {/* Category header row */}
              <tr key={`cat-${category}`} className="category">
                <td colSpan={4}>{category}</td>
              </tr>
              {/* Envelope rows */}
              {categoryEnvelopes.map((env) => {
                const target = Number(env.target_amount ?? 0);
                const balance = Number(env.current_amount ?? 0);
                const percent = getPercent(balance, target);
                const statusClass = getStatusClass(balance, target);
                return (
                  <tr key={env.id}>
                    <td className="envelope-name">{env.name}</td>
                    <td className="amount">{target > 0 ? formatCurrency(target) : "—"}</td>
                    <td className={`amount ${statusClass}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className={`percent ${statusClass}`}>
                      {target > 0 ? percent : "—"}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="print-footer">
        <span>{envelopes.length} envelopes</span>
        <span>Printed from My Budget Mate</span>
      </div>
    </div>
  );
}
