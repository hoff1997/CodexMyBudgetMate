"use client";

import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MinusCircle,
  DollarSign,
  Receipt,
  Eye,
  MoreVertical,
  FolderInput,
  History,
  Thermometer,
  Archive,
  StickyNote,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PaysUntilDueBadge, PaysUntilDuePlaceholder } from "@/components/shared/pays-until-due-badge";
import { calculatePaysUntilDue, getNextDueDate, getPrimaryPaySchedule } from "@/lib/utils/pays-until-due";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type PriorityLevel = "essential" | "important" | "discretionary";

interface SnapshotViewProps {
  envelopes: UnifiedEnvelopeData[];
  incomeSources: IncomeSource[];
  onEnvelopeChange?: (id: string, field: keyof UnifiedEnvelopeData, value: unknown) => void;
  onChangeCategoryClick?: (envelope: UnifiedEnvelopeData) => void;
  onArchiveClick?: (envelope: UnifiedEnvelopeData) => void;
  onLevelBillClick?: (envelope: UnifiedEnvelopeData) => void;
}

const PRIORITY_CONFIG: Record<
  PriorityLevel,
  {
    label: string;
    dotColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  essential: {
    label: "ESSENTIAL",
    dotColor: "bg-[#5A7E7A]",
    bgColor: "bg-[#E2EEEC]",
    borderColor: "border-[#B8D4D0]",
  },
  important: {
    label: "IMPORTANT",
    dotColor: "bg-[#6B9ECE]",
    bgColor: "bg-[#DDEAF5]",
    borderColor: "border-[#6B9ECE]",
  },
  discretionary: {
    label: "FLEXIBLE",
    dotColor: "bg-[#9CA3AF]",
    bgColor: "bg-[#F3F4F6]",
    borderColor: "border-[#E5E7EB]",
  },
};

// Helper to safely get priority config with fallback
function getPriorityConfig(priority: string | undefined) {
  if (priority && priority in PRIORITY_CONFIG) {
    return PRIORITY_CONFIG[priority as PriorityLevel];
  }
  return PRIORITY_CONFIG.discretionary;
}

// Get envelope status icon and tooltip
function getEnvelopeStatusIcon(envelope: UnifiedEnvelopeData): {
  icon: React.ReactNode;
  tooltip: string;
} {
  // Tracking envelopes
  if (envelope.is_tracking_only || envelope.subtype === "tracking") {
    return {
      icon: <Receipt className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Tracking only",
    };
  }

  // Spending envelopes
  if (envelope.subtype === "spending") {
    return {
      icon: <DollarSign className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Spending envelope",
    };
  }

  // No target set
  const target = Number(envelope.targetAmount ?? 0);
  if (!target || target === 0) {
    return {
      icon: <MinusCircle className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "No target set",
    };
  }

  // Calculate funding ratio
  const current = Number(envelope.currentAmount ?? 0);
  const ratio = current / target;

  // Surplus (>=105%)
  if (ratio >= 1.05) {
    return {
      icon: <TrendingUp className="h-4 w-4 text-[#5A7E7A]" />,
      tooltip: "Surplus - over funded",
    };
  }

  // On track (>=80%)
  if (ratio >= 0.8) {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />,
      tooltip: "On track - 80%+ funded",
    };
  }

  // Needs attention (<80%)
  return {
    icon: <AlertCircle className="h-4 w-4 text-[#6B9ECE]" />,
    tooltip: "Needs attention - under funded",
  };
}

export function SnapshotView({
  envelopes,
  incomeSources,
  onEnvelopeChange,
  onChangeCategoryClick,
  onArchiveClick,
  onLevelBillClick,
}: SnapshotViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Helper to format due date from various types
  const formatDueDate = (dueDate: number | Date | string | undefined): string => {
    if (!dueDate) return "-";
    try {
      if (dueDate instanceof Date) {
        return format(dueDate, "dd/MM/yy");
      }
      if (typeof dueDate === "number") {
        // It's a day of month (1-31), just show the day
        return `Day ${dueDate}`;
      }
      // It's a string date
      return format(new Date(dueDate), "dd/MM/yy");
    } catch {
      return "-";
    }
  };

  // Get primary pay schedule for "Due In" calculation
  const paySchedule = useMemo(() => {
    return getPrimaryPaySchedule(
      incomeSources.map(s => ({
        nextPayDate: s.nextPayDate,
        frequency: s.frequency,
        isActive: s.isActive !== false,
      })),
      'fortnightly'
    );
  }, [incomeSources]);

  // Helper to check if an envelope is fully funded
  const isEnvelopeFullyFunded = (envelope: UnifiedEnvelopeData): boolean => {
    const target = Number(envelope.targetAmount ?? 0);
    const current = Number(envelope.currentAmount ?? 0);
    return target > 0 && current >= target;
  };

  // Filter out suggested envelopes
  const displayEnvelopes = useMemo(() => {
    return envelopes.filter(env => !env.is_suggested);
  }, [envelopes]);

  // Render mobile card
  const renderSnapshotCard = (envelope: UnifiedEnvelopeData) => {
    const statusInfo = getEnvelopeStatusIcon(envelope);
    const current = Number(envelope.currentAmount || 0);
    const target = Number(envelope.targetAmount || 0);
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return (
      <div
        key={envelope.id}
        className="border border-silver-light rounded-lg p-4 bg-white"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            {envelope.icon && <span className="text-xl">{envelope.icon}</span>}
            <div>
              <h4 className="font-medium text-text-dark">{envelope.name}</h4>
              <p className="text-xs text-text-medium">
                {envelope.category_name || "Uncategorized"}
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center">
                {statusInfo.icon}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{statusInfo.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-2">
          {/* Progress */}
          {target > 0 && (
            <div>
              <div className="flex justify-between text-xs text-text-medium mb-1">
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-sage-very-light rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background:
                      "linear-gradient(90deg, #E2EEEC 0%, #B8D4D0 50%, #7A9E9A 100%)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-xs text-text-medium">Current</p>
              <p className="text-sm font-semibold text-sage">
                ${current.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-medium">Target</p>
              <p className="text-sm font-semibold text-text-dark">
                {target > 0 ? `$${target.toFixed(2)}` : "-"}
              </p>
            </div>
          </div>

          {/* Due Info */}
          {envelope.subtype === 'bill' && envelope.dueDate && (
            <div className="flex items-center justify-between pt-2 border-t border-silver-light">
              <span className="text-xs text-text-medium">
                Due: {formatDueDate(envelope.dueDate)}
              </span>
              {paySchedule ? (
                (() => {
                  const nextDue = getNextDueDate(envelope.dueDate);
                  if (!nextDue) return <PaysUntilDuePlaceholder />;
                  const isFunded = isEnvelopeFullyFunded(envelope);
                  const result = calculatePaysUntilDue(nextDue, paySchedule, isFunded);
                  return (
                    <PaysUntilDueBadge
                      urgency={result.urgency}
                      displayText={result.displayText}
                      isFunded={isFunded}
                    />
                  );
                })()
              ) : (
                <PaysUntilDuePlaceholder />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Single flat table - no headers, user determines order via sort */}
        <div className="border border-silver-light rounded-md overflow-hidden">
          {isMobile ? (
            // Mobile: Card layout
            <div className="p-3 space-y-3 bg-white">
              {displayEnvelopes.map(renderSnapshotCard)}
            </div>
          ) : (
            // Desktop: Table layout - flat list without priority group headers
            <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[800px]">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  {/* Quick Glance */}
                  <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                    <Eye className="h-3 w-3 text-text-light mx-auto" />
                  </th>
                  {/* Priority */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">
                    Priority
                  </th>
                  {/* Name */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[140px]">
                    Envelope
                  </th>
                  {/* Category */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[100px]">
                    Category
                  </th>
                  {/* Type */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[65px]">
                    Type
                  </th>
                  {/* Progress */}
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[100px]">
                    Progress
                  </th>
                  {/* Due */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                    Due
                  </th>
                  {/* Target */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                    Target
                  </th>
                  {/* Current */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[65px]">
                    Current
                  </th>
                  {/* Due In */}
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[55px]">
                    Due In
                  </th>
                  {/* Notes */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[28px]">Notes</th>
                  {/* Status */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[45px]">
                    Status
                  </th>
                  {/* Actions - last column, always visible */}
                  <th className="px-1 py-2 text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[32px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-silver-very-light">
                {displayEnvelopes.map((envelope) => {
                  const statusInfo = getEnvelopeStatusIcon(envelope);
                  const envPriorityConfig = getPriorityConfig(envelope.priority);
                  // No background color for icons - keep transparent to match page
                  const iconBg = '';

                  return (
                    <tr
                      key={envelope.id}
                      className="transition-colors h-[44px] group"
                    >
                      {/* Quick Glance */}
                      <td className="px-1 py-1.5 text-center">
                        {onEnvelopeChange && (
                          <button
                            type="button"
                            onClick={() => onEnvelopeChange(envelope.id, 'is_monitored', !envelope.is_monitored)}
                            className={cn(
                              "p-0.5 rounded transition-colors",
                              envelope.is_monitored
                                ? "text-sage hover:text-sage-dark"
                                : "text-silver-light hover:text-text-light opacity-0 group-hover:opacity-100"
                            )}
                            title={envelope.is_monitored ? "Remove from Quick Glance" : "Add to Quick Glance"}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                      </td>

                      {/* Priority Dot */}
                      <td className="px-1 py-1.5 text-center">
                        <span
                          className={cn(
                            "inline-block w-3 h-3 rounded-full",
                            envPriorityConfig.dotColor
                          )}
                          title={envelope.priority === 'essential' ? 'Essential' : envelope.priority === 'important' ? 'Important' : 'Flexible'}
                        />
                      </td>

                      {/* Name */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0", iconBg)}>
                            {envelope.icon}
                          </div>
                          <span className="font-medium text-text-dark text-[12px] truncate">
                            {envelope.name}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-2 py-1.5">
                        <span className="text-[11px] text-text-medium truncate block">
                          {envelope.category_name || "-"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-2 py-1.5">
                        <span className="text-[11px] text-text-medium capitalize">
                          {envelope.subtype || "-"}
                        </span>
                      </td>

                      {/* Progress - bar with percentage */}
                      <td className="px-2 py-1.5">
                        {(() => {
                          const target = Number(envelope.targetAmount ?? 0);
                          const current = Number(envelope.currentAmount ?? 0);
                          if (!target || target === 0) {
                            return <span className="text-[11px] text-text-light">—</span>;
                          }
                          const ratio = current / target;
                          const percentage = Math.min(Math.round(ratio * 100), 100);
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                    background: "linear-gradient(90deg, #E2EEEC 0%, #B8D4D0 50%, #7A9E9A 100%)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-text-medium w-8 text-right">
                                {percentage}%
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Due Date */}
                      <td className="px-2 py-1.5">
                        <span className="text-[11px] text-text-medium">
                          {formatDueDate(envelope.dueDate)}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="px-2 py-1.5 text-right">
                        <span className="text-[11px] text-text-dark">
                          {envelope.targetAmount
                            ? `$${Number(envelope.targetAmount).toFixed(0)}`
                            : "-"}
                        </span>
                      </td>

                      {/* Current Balance */}
                      <td className="px-2 py-1.5 text-right">
                        <span className="text-[11px] font-semibold text-sage">
                          ${(envelope.currentAmount || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Due In (Pays Until Due) */}
                      <td className="px-2 py-1.5 text-center">
                        {envelope.subtype === 'bill' && envelope.dueDate && paySchedule ? (
                          (() => {
                            const nextDue = getNextDueDate(envelope.dueDate);
                            if (!nextDue) return <span className="text-text-light text-[10px]">—</span>;
                            const isFunded = isEnvelopeFullyFunded(envelope);
                            const result = calculatePaysUntilDue(nextDue, paySchedule, isFunded);
                            return (
                              <PaysUntilDueBadge
                                urgency={result.urgency}
                                displayText={result.displayText}
                                isFunded={isFunded}
                              />
                            );
                          })()
                        ) : (
                          <span className="text-text-light text-[10px]">—</span>
                        )}
                      </td>

                      {/* Notes Icon */}
                      <td className="px-1 py-1.5 text-center">
                        {envelope.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center justify-center cursor-help">
                                <StickyNote className="h-3 w-3 text-sage" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p className="text-sm whitespace-pre-wrap">{envelope.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-text-light text-[10px]">—</span>
                        )}
                      </td>

                      {/* Status Icon */}
                      <td className="px-1 py-1.5 text-center">
                        <div className="inline-flex items-center justify-center" title={statusInfo.tooltip}>
                          {statusInfo.icon}
                        </div>
                      </td>

                      {/* Actions (Three-dot menu) - last column, always visible */}
                      <td className="px-1 py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-0.5 rounded text-text-medium hover:bg-silver-very-light hover:text-text-dark"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {onChangeCategoryClick && (
                              <DropdownMenuItem
                                onClick={() => onChangeCategoryClick(envelope)}
                                className="text-xs gap-2"
                              >
                                <FolderInput className="h-3.5 w-3.5" />
                                Change Category
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                window.location.href = `/envelopes/${envelope.id}?tab=history`;
                              }}
                              className="text-xs gap-2"
                            >
                              <History className="h-3.5 w-3.5" />
                              View History
                            </DropdownMenuItem>
                            {onEnvelopeChange && (
                              <DropdownMenuItem
                                onClick={() => onEnvelopeChange(envelope.id, 'is_monitored', !envelope.is_monitored)}
                                className="text-xs gap-2"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {envelope.is_monitored ? "Remove from Quick Glance" : "Add to Quick Glance"}
                              </DropdownMenuItem>
                            )}
                            {/* Level this bill - only show for bill envelopes that aren't already leveled */}
                            {envelope.subtype === 'bill' && !envelope.is_leveled && onLevelBillClick && (
                              <DropdownMenuItem
                                onClick={() => onLevelBillClick(envelope)}
                                className="text-xs gap-2"
                              >
                                <Thermometer className="h-3.5 w-3.5" />
                                Level this bill
                              </DropdownMenuItem>
                            )}
                            {/* Remove leveling option - show when already leveled */}
                            {envelope.is_leveled && onEnvelopeChange && (
                              <DropdownMenuItem
                                onClick={() => onEnvelopeChange(envelope.id, 'is_leveled', false)}
                                className="text-xs gap-2 text-text-medium"
                              >
                                <Thermometer className="h-3.5 w-3.5" />
                                Remove leveling
                              </DropdownMenuItem>
                            )}
                            {onArchiveClick && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onArchiveClick(envelope)}
                                  className="text-xs gap-2 text-blue focus:text-blue"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* No Envelopes State */}
        {displayEnvelopes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-medium">No envelopes to display</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
