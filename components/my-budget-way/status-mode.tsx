"use client";

import { CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { GoalRow, CompactStatusRow, DividerRow } from "./shared/goal-row";
import type {
  SuggestedEnvelope,
  CreditCardDebtData,
  MilestoneProgress,
} from "./types";

interface StatusModeProps {
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  milestoneProgress: MilestoneProgress;
  onSnooze?: (envelopeId: string, days: number) => void;
  onEnvelopeClick?: (envelope: SuggestedEnvelope) => void;
}

export function StatusMode({
  suggestedEnvelopes,
  creditCardDebt,
  milestoneProgress,
  onSnooze,
  onEnvelopeClick,
}: StatusModeProps) {
  const hasDebt = creditCardDebt?.hasDebt ?? false;

  // Check if envelope is locked based on debt status
  const isEnvelopeLocked = (suggestionType: string | null | undefined): boolean => {
    if (!suggestionType) return false;
    if (suggestionType === "starter-stash") return false;
    // Safety Net and CC Holding are locked until ALL DEBT = $0
    if (suggestionType === "safety-net" || suggestionType === "cc-holding") {
      return hasDebt;
    }
    return false;
  };

  // Get description based on type and lock status - Remy's coaching voice
  const getDescription = (
    envelope: SuggestedEnvelope,
    isLocked: boolean
  ): string => {
    if (envelope.suggestion_type === "starter-stash") {
      return "Your first $1,000 safety cushion – a quick win!";
    }
    if (envelope.suggestion_type === "safety-net") {
      return isLocked
        ? "Unlocks when all debt is paid – three months of peace"
        : "Three months of essentials for true peace of mind";
    }
    if (envelope.suggestion_type === "cc-holding") {
      return isLocked
        ? "Unlocks when all debt is paid – use cards wisely"
        : "Use your card as a tool, not a crutch";
    }
    return envelope.description || "";
  };

  // Render Smash Your Debt row
  const renderSmashYourDebtRow = () => {
    if (!creditCardDebt) return null;

    const debtPaid = creditCardDebt.startingDebt - creditCardDebt.currentDebt;
    const debtProgress =
      creditCardDebt.startingDebt > 0
        ? (debtPaid / creditCardDebt.startingDebt) * 100
        : 100;
    const isDebtComplete = !creditCardDebt.hasDebt;

    return (
      <GoalRow
        id="smash-your-debt"
        icon={isDebtComplete ? "✅" : "💪"}
        title="Smash Your Debt"
        description={
          creditCardDebt.hasDebt && creditCardDebt.activeDebt
            ? `Pay off smallest first – ${creditCardDebt.activeDebt.name} ($${creditCardDebt.activeDebt.balance.toLocaleString()} left)`
            : "Debt-free! You're building real momentum!"
        }
        target={creditCardDebt.startingDebt}
        current={debtPaid}
        isComplete={isDebtComplete}
        progressColor="blue"
      />
    );
  };

  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[500px]">
      <thead className="bg-silver-very-light border-b border-silver-light">
        <tr>
          <th className="px-4 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide">
            Item
          </th>
          <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
            Target
          </th>
          <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
            Current
          </th>
          <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[220px]">
            Progress
          </th>
          <th className="px-2 py-1.5 w-[32px]"></th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {/* Fill Your Envelopes Row */}
        {milestoneProgress.shouldShowEnvelopeRow ? (
          <tr className="bg-sage-very-light/50">
            <td className="px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-base bg-white border border-sage-light flex-shrink-0">
                  📊
                </div>
                <div>
                  <div className="font-semibold text-sm text-text-dark">
                    Fill Your Envelopes
                  </div>
                  <div className="text-[10px] text-text-medium">
                    {milestoneProgress.needsFunding > 0
                      ? `${milestoneProgress.needsFunding}/${milestoneProgress.totalCount} envelopes need funding`
                      : `Overall progress across all your spending categories (${milestoneProgress.fundedCount}/${milestoneProgress.totalCount} funded)`}
                  </div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2 text-right">
              <span className="text-sm font-semibold text-text-dark">
                ${milestoneProgress.totalTarget.toLocaleString()}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              <span
                className="text-sm font-semibold"
                style={{ color: "#7A9E9A" }}
              >
                ${milestoneProgress.totalCurrent.toLocaleString()}
              </span>
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2 justify-end">
                <div className="w-36 h-2.5 bg-silver-very-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sage-light to-sage rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, milestoneProgress.overallProgress)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-sage-dark min-w-[45px] text-right">
                  {milestoneProgress.overallProgress.toFixed(0)}%
                </span>
              </div>
            </td>
            <td className="px-2 py-2">
              <div className="flex items-center justify-center w-6 h-6">
                {milestoneProgress.overallProgress >= 100 && (
                  <CheckCircle2 className="w-4 h-4 text-sage" />
                )}
              </div>
            </td>
          </tr>
        ) : (
          <CompactStatusRow
            message="All envelopes on track"
            subtext={`(${milestoneProgress.totalCount} envelopes, ${milestoneProgress.overallProgress.toFixed(0)}% funded)`}
            linkText="View Details →"
            linkHref="/envelope-summary"
          />
        )}

        <DividerRow />

        {/* Core Goals in fixed order: Starter Stash, Smash Your Debt, Safety Net, CC Holding */}
        {(() => {
          // Sort envelopes into fixed order
          const stepOrder = ["starter-stash", "safety-net", "cc-holding"];
          const sortedEnvelopes = [...suggestedEnvelopes].sort((a, b) => {
            const aIndex = stepOrder.indexOf(a.suggestion_type || "");
            const bIndex = stepOrder.indexOf(b.suggestion_type || "");
            // Items not in order go to the end
            const aPos = aIndex === -1 ? 999 : aIndex;
            const bPos = bIndex === -1 ? 999 : bIndex;
            return aPos - bPos;
          });

          return sortedEnvelopes.flatMap((envelope, index) => {
            const rows: React.ReactNode[] = [];
            const isStarterStashEnvelope =
              envelope.suggestion_type === "starter-stash";
            const isCCHolding = envelope.suggestion_type === "cc-holding";
            const isLocked = isEnvelopeLocked(envelope.suggestion_type);
            const target = Number(envelope.target_amount ?? 0);
            const current = Number(envelope.current_amount ?? 0);

            // CC Holding when locked - show debt payoff progress
            if (isCCHolding && isLocked && creditCardDebt) {
            const debtProgress =
              creditCardDebt.startingDebt > 0
                ? ((creditCardDebt.startingDebt - creditCardDebt.currentDebt) /
                    creditCardDebt.startingDebt) *
                  100
                : 0;

            rows.push(
              <tr key={envelope.id} className="bg-gray-50/50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-base bg-gray-100 border border-gray-200 flex-shrink-0">
                      <Lock className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-text-medium">
                        Credit Card Holding
                      </div>
                      <div className="text-[10px] text-text-light italic">
                        {getDescription(envelope, true)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-sm text-text-light">—</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-sm text-text-light">—</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-36 h-2.5 bg-silver-very-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-light to-blue rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, debtProgress)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-blue min-w-[45px] text-right">
                      {debtProgress.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center w-6 h-6">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                </td>
              </tr>
            );
          } else {
            // Standard row
            rows.push(
              <GoalRow
                key={envelope.id}
                id={envelope.id}
                icon={
                  isCCHolding ? "💳" : envelope.icon ?? "📁"
                }
                title={isCCHolding ? "Credit Card Holding" : envelope.name}
                description={getDescription(envelope, isLocked)}
                target={target}
                current={current}
                isLocked={isLocked}
                progressColor="sage"
                showSnoozeMenu={
                  !isCCHolding && !isLocked && current < target
                }
                showNotificationIcon={isStarterStashEnvelope}
                onSnooze={
                  onSnooze ? (days) => onSnooze(envelope.id, days) : undefined
                }
                onClick={
                  onEnvelopeClick && !isLocked
                    ? () => onEnvelopeClick(envelope)
                    : undefined
                }
              />
            );
          }

            // After Starter Stash, add Smash Your Debt row
            if (isStarterStashEnvelope) {
              const smashDebtRow = renderSmashYourDebtRow();
              if (smashDebtRow) {
                rows.push(smashDebtRow);
              }
            }

            return rows;
          });
        })()}
      </tbody>
    </table>
    </div>
  );
}
