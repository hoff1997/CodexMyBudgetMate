'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SortColumn =
  | 'name'
  | 'category'
  | 'priority'
  | 'status'
  | 'subtype'
  | 'targetAmount'
  | 'frequency'
  | 'dueDate'
  | 'currentAmount'
  | 'totalFunded'
  | null;

export type SortDirection = 'asc' | 'desc';

export type ViewMode = 'priority' | 'category' | 'snapshot';

interface SortButtonProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortChange: (column: SortColumn, direction: SortDirection) => void;
  /** Current view mode - used to disable irrelevant sort options */
  viewMode?: ViewMode;
}

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'subtype', label: 'Type' },
  { value: 'targetAmount', label: 'Target Amount' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'currentAmount', label: 'Current Balance' },
  { value: 'totalFunded', label: 'Total Funded' },
];

/**
 * Compact sort button with popover for selecting sort column and direction.
 * Designed to sit alongside the view mode toggle buttons.
 */
export function SortButton({ sortColumn, sortDirection, onSortChange, viewMode }: SortButtonProps) {
  const [open, setOpen] = useState(false);

  // Determine which options are disabled based on view mode
  const isOptionDisabled = (optionValue: string): boolean => {
    // Priority sort is ineffective in Priority view (already grouped by priority)
    if (optionValue === 'priority' && viewMode === 'priority') {
      return true;
    }
    // Category sort is ineffective in Category view (already grouped by category)
    if (optionValue === 'category' && viewMode === 'category') {
      return true;
    }
    return false;
  };

  const handleColumnSelect = (column: SortColumn) => {
    // Don't allow selecting disabled options
    if (isOptionDisabled(column as string)) return;

    if (column === sortColumn) {
      // Same column - toggle direction
      onSortChange(column, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - default to ascending
      onSortChange(column, 'asc');
    }
  };

  const handleClear = () => {
    onSortChange(null, 'asc');
    setOpen(false);
  };

  const activeLabel = sortColumn
    ? sortOptions.find(o => o.value === sortColumn)?.label
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "px-2 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1",
            sortColumn
              ? "bg-white text-sage-dark shadow-sm"
              : "text-text-medium hover:text-text-dark"
          )}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortColumn ? (
            <>
              {activeLabel}
              {sortDirection === 'asc' ? (
                <ArrowUp className="h-2.5 w-2.5" />
              ) : (
                <ArrowDown className="h-2.5 w-2.5" />
              )}
            </>
          ) : (
            'Sort'
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <div className="space-y-0.5">
          {sortOptions.map(option => {
            const isActive = sortColumn === option.value;
            const isDisabled = isOptionDisabled(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleColumnSelect(option.value as SortColumn)}
                disabled={isDisabled}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-sm rounded flex items-center justify-between",
                  isDisabled
                    ? "text-silver cursor-not-allowed"
                    : isActive
                      ? "bg-sage-very-light text-sage-dark"
                      : "hover:bg-silver-very-light text-text-medium"
                )}
              >
                <span>{option.label}</span>
                {isActive && !isDisabled && (
                  <span className="flex items-center gap-1 text-sage">
                    {sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
          {sortColumn && (
            <>
              <div className="border-t border-silver-light my-1" />
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-2 py-1.5 text-left text-sm rounded text-text-medium hover:bg-silver-very-light"
              >
                Clear sort
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Keep old SortBanner export for backwards compatibility (can be removed later)
export const SortBanner = SortButton;
