"use client";

import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ReadinessStatus = 'on_track' | 'slightly_behind' | 'needs_attention' | 'no_events';

interface CelebrationReadinessBadgeProps {
  status: ReadinessStatus;
  shortfall: number;
  nextEventName?: string;
  daysUntil?: number;
  paysUntil?: number;
  className?: string;
}

/**
 * Compact badge showing celebration envelope readiness status
 * Used in the budget allocation table for celebration envelopes
 */
export function CelebrationReadinessBadge({
  status,
  shortfall,
  nextEventName,
  daysUntil,
  paysUntil,
  className,
}: CelebrationReadinessBadgeProps) {
  if (status === 'no_events') {
    return (
      <span className={cn("text-[11px] text-text-light", className)}>
        —
      </span>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'on_track':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Ready',
          bgColor: 'bg-sage-very-light',
          textColor: 'text-sage-dark',
          borderColor: 'border-sage-light',
        };
      case 'slightly_behind':
        return {
          icon: <ArrowRight className="h-3 w-3" />,
          text: shortfall > 0 ? `+${formatCurrency(shortfall)}` : 'Catching up',
          bgColor: 'bg-blue-light',
          textColor: 'text-blue',
          borderColor: 'border-blue',
        };
      case 'needs_attention':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: shortfall > 0 ? `-${formatCurrency(shortfall)}` : 'Short',
          bgColor: 'bg-gold-light',
          textColor: 'text-gold-dark',
          borderColor: 'border-gold',
        };
      default:
        return {
          icon: null,
          text: '—',
          bgColor: '',
          textColor: 'text-text-light',
          borderColor: '',
        };
    }
  };

  const config = getStatusConfig();

  const tooltipContent = () => {
    if (status === 'on_track') {
      return nextEventName
        ? `Ready for ${nextEventName}${daysUntil !== undefined ? ` in ${daysUntil} days` : ''}`
        : 'On track for upcoming celebrations';
    }

    if (status === 'slightly_behind') {
      const paysText = paysUntil !== undefined ? ` over ${paysUntil} pay${paysUntil !== 1 ? 's' : ''}` : '';
      return nextEventName
        ? `Need ${formatCurrency(shortfall)} more for ${nextEventName}${paysText}`
        : `Need ${formatCurrency(shortfall)} more${paysText}`;
    }

    if (status === 'needs_attention') {
      return nextEventName
        ? `Short ${formatCurrency(shortfall)} for ${nextEventName}${daysUntil !== undefined ? ` (${daysUntil} days away)` : ''}`
        : `Short ${formatCurrency(shortfall)} for upcoming celebration`;
    }

    return '';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
              config.bgColor,
              config.textColor,
              className
            )}
          >
            {config.icon}
            <span>{config.text}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Placeholder when no readiness data is available
 */
export function CelebrationReadinessPlaceholder({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] text-text-light", className)}>
      —
    </span>
  );
}
