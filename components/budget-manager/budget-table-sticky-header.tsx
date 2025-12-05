"use client";

import { ArrowUp, ArrowDown, ArrowUpDown, MessageSquare } from "lucide-react";

type SortColumn = 'name' | 'category' | 'priority' | 'subtype' | 'targetAmount' | 'frequency' | 'dueDate' | 'currentAmount' | 'totalFunded' | null;
type SortDirection = 'asc' | 'desc';

interface BudgetTableStickyHeaderProps {
  showCategories: boolean;
  showIncomeColumns?: boolean;
  showOpeningBalance?: boolean;
  showCurrentBalance?: boolean;
  showNotes?: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  enableDragAndDrop?: boolean;
}

export function BudgetTableStickyHeader({
  showCategories,
  showIncomeColumns = true,
  showOpeningBalance = true,
  showCurrentBalance = true,
  showNotes = true,
  sortColumn,
  sortDirection,
  onSort,
  enableDragAndDrop = false,
}: BudgetTableStickyHeaderProps) {
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-0.5 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-0.5 text-primary" />;
  };

  return (
    <div className="sticky top-0 z-20 bg-muted border rounded-lg overflow-hidden shadow-sm">
      <table className="w-full table-fixed">
        <thead>
          <tr className="h-10">
            {/* Drag Handle Column */}
            {enableDragAndDrop && (
              <th className="w-5 min-w-[20px] max-w-[20px] px-0 py-0"></th>
            )}
            {/* Priority - moved before Icon/Name */}
            <th className="py-0.5 text-[10px] font-semibold w-5 min-w-[20px] max-w-[20px]" title="Priority">
              <button type="button" onClick={() => onSort('priority')} className="w-full flex items-center justify-center hover:text-primary">
                <SortIcon column="priority" />
              </button>
            </th>
            <th className="w-6 min-w-[24px] max-w-[24px] px-0 py-0"></th>
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-24 min-w-[96px] max-w-[96px] text-left">
              <button type="button" onClick={() => onSort('name')} className="inline-flex items-center hover:text-primary pl-1">
                Name<SortIcon column="name" />
              </button>
            </th>
            {/* Category Column */}
            {showCategories && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px]">
                <button type="button" onClick={() => onSort('category')} className="w-full flex items-center justify-center hover:text-primary">
                  Cat<SortIcon column="category" />
                </button>
              </th>
            )}
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-11 min-w-[44px] max-w-[44px]">
              <button type="button" onClick={() => onSort('subtype')} className="w-full flex items-center justify-center hover:text-primary">
                Type<SortIcon column="subtype" />
              </button>
            </th>
            {/* Opening Balance - moved before Target */}
            {showOpeningBalance && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-right pr-1 leading-tight">
                <span className="block">Opening</span>
                <span className="block">Balance</span>
              </th>
            )}
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px]">
              <button type="button" onClick={() => onSort('targetAmount')} className="w-full flex items-center justify-end hover:text-primary pr-1">
                Target<SortIcon column="targetAmount" />
              </button>
            </th>
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px]">
              <button type="button" onClick={() => onSort('frequency')} className="w-full flex items-center justify-center hover:text-primary">
                Frequency<SortIcon column="frequency" />
              </button>
            </th>
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px]">
              <button type="button" onClick={() => onSort('dueDate')} className="w-full flex items-center justify-center hover:text-primary">
                Due<SortIcon column="dueDate" />
              </button>
            </th>

            {/* Per Pay - Calculated amount needed each pay cycle */}
            {showIncomeColumns && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px] text-right pr-1 leading-tight">
                <span className="block">Per</span>
                <span className="block">Pay</span>
              </th>
            )}

            {/* Fund From - Compact selector showing which income sources fund this */}
            {showIncomeColumns && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-24 min-w-[96px] max-w-[96px] text-center leading-tight">
                <span className="block">Fund From</span>
                <span className="block text-[9px] text-muted-foreground font-normal">(click to edit)</span>
              </th>
            )}

            {/* On Track Status */}
            {showIncomeColumns && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-center leading-tight">
                <span className="block">On</span>
                <span className="block">Track</span>
              </th>
            )}

            {/* Current Balance (Maintenance) */}
            {showCurrentBalance && (
              <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px]">
                <button type="button" onClick={() => onSort('currentAmount')} className="w-full flex items-center justify-end hover:text-primary pr-1">
                  Curr<SortIcon column="currentAmount" />
                </button>
              </th>
            )}

            {/* Balance Tracking Columns */}
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-right pr-1 leading-tight">
              <span className="block">Should</span>
              <span className="block">Have</span>
            </th>
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px] text-right pr-1 leading-tight">
              <span className="block">Balance</span>
              <span className="block">Gap</span>
            </th>
            <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-center">Track</th>

            {/* Notes - Fixed width with icon */}
            {showNotes && (
              <th className="py-0.5 text-[10px] font-semibold w-6 min-w-[24px] max-w-[24px] text-center" title="Notes">
                <MessageSquare className="h-3 w-3 mx-auto text-muted-foreground" />
              </th>
            )}

            <th className="py-0.5 text-[10px] font-semibold w-8 min-w-[32px] max-w-[32px]"></th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
