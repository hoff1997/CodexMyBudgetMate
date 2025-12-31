"use client";

import { Lock, CheckCircle2, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ProgressBarColor = "sage" | "blue";

export interface GoalRowProps {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  description: string;
  target: number;
  current: number;
  isLocked?: boolean;
  isComplete?: boolean;
  progressColor?: ProgressBarColor;
  showSnoozeMenu?: boolean;
  showNotificationIcon?: boolean;
  onSnooze?: (days: number) => void;
  onClick?: () => void;
}

export function GoalRow({
  id,
  icon,
  title,
  description,
  target,
  current,
  isLocked = false,
  isComplete = false,
  progressColor = "sage",
  showSnoozeMenu = false,
  showNotificationIcon = false,
  onSnooze,
  onClick,
}: GoalRowProps) {
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const complete = isComplete || progress >= 100;

  const getProgressBarClass = () => {
    if (complete) return "bg-sage";
    if (progressColor === "blue") return "bg-gradient-to-r from-blue-light to-blue";
    return "bg-gradient-to-r from-sage-light to-sage";
  };

  const getProgressTextClass = () => {
    if (complete) return "text-sage";
    if (progressColor === "blue") return "text-blue";
    return "text-sage-dark";
  };

  return (
    <tr
      className={cn(
        isLocked
          ? "bg-gray-50/50"
          : complete
          ? "bg-sage-very-light/30"
          : current > 0
          ? "bg-white"
          : "bg-sage-very-light/30",
        onClick && "cursor-pointer hover:bg-sage-very-light/50"
      )}
      onClick={onClick}
    >
      {/* Item */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center text-base border flex-shrink-0",
              isLocked
                ? "bg-gray-100 border-gray-200"
                : progressColor === "blue"
                ? "bg-white border-blue-light"
                : "bg-white border-sage-light"
            )}
          >
            {isLocked ? (
              <Lock className="h-3.5 w-3.5 text-gray-400" />
            ) : typeof icon === "string" ? (
              icon
            ) : (
              icon
            )}
          </div>
          <div>
            <div
              className={cn(
                "font-semibold text-sm",
                isLocked ? "text-text-medium" : "text-text-dark"
              )}
            >
              {title}
            </div>
            <div
              className={cn(
                "text-[10px]",
                isLocked ? "text-text-light italic" : "text-text-medium"
              )}
            >
              {description}
            </div>
          </div>
        </div>
      </td>

      {/* Target */}
      <td className="px-4 py-2 text-right">
        <span
          className={cn(
            "text-sm font-medium",
            isLocked ? "text-text-light" : "text-text-dark"
          )}
        >
          {isLocked ? "—" : `$${target.toLocaleString()}`}
        </span>
      </td>

      {/* Current */}
      <td className="px-4 py-2 text-right">
        <span
          className={cn("text-sm font-semibold", isLocked ? "text-text-light" : "")}
          style={
            isLocked
              ? {}
              : { color: progressColor === "blue" ? "#6B9ECE" : "#7A9E9A" }
          }
        >
          {isLocked ? "—" : `$${current.toLocaleString()}`}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-2">
        {isLocked ? (
          <div className="flex items-center justify-end">
            <span className="text-sm font-medium text-gray-400 uppercase">
              Locked
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <div className="w-36 h-2.5 bg-silver-very-light rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getProgressBarClass()
                )}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span
              className={cn(
                "text-sm font-semibold min-w-[45px] text-right",
                getProgressTextClass()
              )}
            >
              {progress.toFixed(0)}%
            </span>
          </div>
        )}
      </td>

      {/* Status icon / Actions */}
      <td className="px-2 py-2">
        <div className="flex items-center justify-center w-6 h-6">
          {isLocked ? (
            <Lock className="w-4 h-4 text-gray-400" />
          ) : complete ? (
            <CheckCircle2 className="w-4 h-4 text-sage" />
          ) : showSnoozeMenu && onSnooze ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="Snooze or dismiss"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showNotificationIcon ? (
                    <Bell className="w-4 h-4 text-gold" />
                  ) : (
                    <Clock className="w-4 h-4 text-text-light hover:text-text-medium" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="end">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(7);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                  >
                    Snooze 7 days
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(14);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                  >
                    Snooze 14 days
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(30);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                  >
                    Snooze 30 days
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(90);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                  >
                    Snooze 90 days
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// Compact row for "all on track" state
export function CompactStatusRow({
  message,
  subtext,
  linkText,
  linkHref,
}: {
  message: string;
  subtext: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <tr className="bg-sage-very-light/30">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sage" />
            <span className="text-sm font-semibold text-sage-dark">{message}</span>
            <span className="text-xs text-text-medium">{subtext}</span>
          </div>
          {linkText && linkHref && (
            <a
              href={linkHref}
              className="text-xs text-sage-dark hover:underline font-medium"
            >
              {linkText}
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// Divider row between sections
export function DividerRow() {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-0">
        <div className="border-t border-silver-light" />
      </td>
    </tr>
  );
}
