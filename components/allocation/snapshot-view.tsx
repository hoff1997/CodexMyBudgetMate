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
  ChevronDown,
  ChevronRight,
  Eye,
  MoreVertical,
  FolderInput,
  History,
  Thermometer,
  Archive,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PaysUntilDueBadge, PaysUntilDuePlaceholder } from "@/components/shared/pays-until-due-badge";
import { CompactProgressBar } from "@/components/shared/envelope-progress-bar";
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

// Format frequency as abbreviation
function formatFrequencyAbbrev(frequency?: string): string {
  if (!frequency) return "-";
  const map: Record<string, string> = {
    weekly: "Wk",
    fortnightly: "FN",
    monthly: "Mth",
    quarterly: "Q",
    annually: "Yr",
    yearly: "Yr",
  };
  return map[frequency.toLowerCase()] || frequency;
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

// Calculate progress percentage
function calculateProgress(current?: number, target?: number): number {
  if (!target || target === 0) return 0;
  return Math.min(((current || 0) / target) * 100, 100);
}

export function SnapshotView({
  envelopes,
  incomeSources,
  onEnvelopeChange,
  onChangeCategoryClick,
  onArchiveClick,
  onLevelBillClick,
}: SnapshotViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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

  // Group envelopes by priority
  const groupedEnvelopes = useMemo(() => {
    const groups: Record<PriorityLevel, UnifiedEnvelopeData[]> = {
      essential: [],
      important: [],
      discretionary: [],
    };

    envelopes.forEach((env) => {
      // Skip suggested envelopes only (show tracking envelopes in snapshot)
      if (env.is_suggested) return;

      const priority = (env.priority as PriorityLevel) || "discretionary";
      if (priority in groups) {
        groups[priority].push(env);
      }
    });

    return groups;
  }, [envelopes]);

  const toggleGroup = (priority: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(priority)) {
      newCollapsed.delete(priority);
    } else {
      newCollapsed.add(priority);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Render mobile card
  const renderSnapshotCard = (envelope: UnifiedEnvelopeData) => {
    const statusInfo = getEnvelopeStatusIcon(envelope);
    const progress = calculateProgress(envelope.currentAmount, envelope.targetAmount);
    const priority = (envelope.priority as PriorityLevel) || "discretionary";

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
              <p className="text-xs text-text-medium capitalize">
                {envelope.subtype || "-"}
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
          {envelope.targetAmount && Number(envelope.targetAmount) > 0 && (
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
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-xs text-text-medium">Current</p>
              <p className="text-sm font-semibold text-sage">
                ${Number(envelope.currentAmount || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-medium">Target</p>
              <p className="text-sm font-semibold text-text-dark">
                {envelope.targetAmount
                  ? `$${Number(envelope.targetAmount).toFixed(2)}`
                  : "-"}
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

  // Render priority group
  const renderPriorityGroup = (priority: PriorityLevel) => {
    const config = PRIORITY_CONFIG[priority];
    const envelopesInGroup = groupedEnvelopes[priority];

    if (envelopesInGroup.length === 0) return null;

    const isExpanded = !collapsedGroups.has(priority);

    return (
      <div key={priority} className="mb-5">
        {/* Group Header */}
        <button
          type="button"
          onClick={() => toggleGroup(priority)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-t-md cursor-pointer",
            config.bgColor,
            "border border-b-0",
            config.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
            <span className="font-semibold text-xs uppercase tracking-wide text-text-dark">
              {config.label}
            </span>
            <span className="text-xs text-text-medium font-normal">
              ({envelopesInGroup.length}{" "}
              {envelopesInGroup.length === 1 ? "envelope" : "envelopes"})
            </span>
          </div>
        </button>

        {/* Table/Cards */}
        {isExpanded && (
          <div className={cn("border rounded-b-md overflow-hidden", config.borderColor)}>
            {isMobile ? (
              // Mobile: Card layout
              <div className="p-3 space-y-3 bg-white">
                {envelopesInGroup.map(renderSnapshotCard)}
              </div>
            ) : (
              // Desktop: Table layout (matching Priority view styling)
              <table className="w-full table-fixed">
                <thead className="bg-silver-very-light border-b border-silver-light">
                  <tr>
                    {/* Quick Glance */}
                    <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                      <Eye className="h-3 w-3 text-text-light mx-auto" />
                    </th>
                    {/* Priority */}
                    <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[40px]">
                      Pri
                    </th>
                    {/* Status */}
                    <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[36px]"></th>
                    {/* Name */}
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[160px]">
                      Envelope
                    </th>
                    {/* Type */}
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">
                      Type
                    </th>
                    {/* Target */}
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
                      Target
                    </th>
                    {/* Due */}
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">
                      Due
                    </th>
                    {/* Progress */}
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[90px]">
                      Progress
                    </th>
                    {/* Current */}
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                      Current
                    </th>
                    {/* Due In */}
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[60px]">
                      Due In
                    </th>
                    {/* Actions */}
                    <th className="px-1 py-2 text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[32px]"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-silver-very-light">
                  {envelopesInGroup.map((envelope) => {
                    const statusInfo = getEnvelopeStatusIcon(envelope);
                    const envPriorityConfig = getPriorityConfig(envelope.priority);
                    const iconBg = envelope.priority === 'essential' ? 'bg-sage-very-light' :
                                   envelope.priority === 'important' ? 'bg-blue-light' : 'bg-silver-very-light';

                    return (
                      <tr
                        key={envelope.id}
                        className="hover:bg-[#E2EEEC] transition-colors h-[44px] group"
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

                        {/* Status Icon */}
                        <td className="px-1 py-1.5 text-center">
                          <div className="inline-flex items-center justify-center" title={statusInfo.tooltip}>
                            {statusInfo.icon}
                          </div>
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

                        {/* Type */}
                        <td className="px-2 py-1.5">
                          <span className="text-[11px] text-text-medium capitalize">
                            {envelope.subtype || "-"}
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

                        {/* Due Date */}
                        <td className="px-2 py-1.5">
                          <span className="text-[11px] text-text-medium">
                            {formatDueDate(envelope.dueDate)}
                          </span>
                        </td>

                        {/* Progress Bar */}
                        <td className="px-2 py-1.5">
                          <CompactProgressBar
                            current={envelope.currentAmount || 0}
                            target={envelope.targetAmount || 0}
                            className="w-full"
                          />
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

                        {/* Actions (Three-dot menu) */}
                        <td className="px-1 py-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-0.5 rounded text-text-light hover:bg-silver-very-light hover:text-text-medium opacity-0 group-hover:opacity-100 transition-opacity"
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
            )}
          </div>
        )}
      </div>
    );
  };

  // Count total envelopes
  const totalEnvelopes =
    groupedEnvelopes.essential.length +
    groupedEnvelopes.important.length +
    groupedEnvelopes.discretionary.length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="rounded-lg border border-blue-light bg-[#DDEAF5]/30 p-4">
          <div className="flex items-start gap-3">
            <div className="text-sm text-text-dark">
              <p className="font-medium mb-1">Snapshot View</p>
              <p className="text-text-medium">
                Quick overview of your envelopes for fast spending decisions.
                Switch to Priority or Category view to edit details.
              </p>
            </div>
          </div>
        </div>

        {/* Priority Groups */}
        {renderPriorityGroup("essential")}
        {renderPriorityGroup("important")}
        {renderPriorityGroup("discretionary")}

        {/* No Envelopes State */}
        {totalEnvelopes === 0 && (
          <div className="text-center py-12">
            <p className="text-text-medium">No envelopes to display</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
