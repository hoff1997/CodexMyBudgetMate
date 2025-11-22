"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { ValidationWarning } from "@/lib/types/unified-envelope";

interface ValidationWarningsProps {
  warnings: ValidationWarning[];
  className?: string;
}

export function ValidationWarnings({ warnings, className = "" }: ValidationWarningsProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 ${
            warning.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : warning.type === 'warning'
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {warning.type === 'error' ? (
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          ) : warning.type === 'warning' ? (
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{warning.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline warning badge for table cells
 */
export function InlineWarningBadge({ warning }: { warning: ValidationWarning }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        warning.type === 'error'
          ? 'bg-red-100 text-red-700'
          : warning.type === 'warning'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-blue-100 text-blue-700'
      }`}
      title={warning.message}
    >
      {warning.type === 'error' ? (
        <AlertCircle className="h-2.5 w-2.5" />
      ) : warning.type === 'warning' ? (
        <AlertTriangle className="h-2.5 w-2.5" />
      ) : (
        <Info className="h-2.5 w-2.5" />
      )}
      <span className="max-w-[120px] truncate">{warning.message}</span>
    </div>
  );
}
