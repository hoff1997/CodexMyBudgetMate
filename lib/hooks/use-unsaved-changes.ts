import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface UnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onNavigateAway?: () => void;
  message?: string;
}

/**
 * Hook to warn users when they try to navigate away with unsaved changes
 *
 * Features:
 * - Warns on browser navigation (back/forward/close)
 * - Can be integrated with custom navigation dialogs
 * - Customizable warning message
 *
 * @param options Configuration for unsaved changes detection
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  onNavigateAway,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UnsavedChangesOptions) {
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);

  // Update ref when hasUnsavedChanges changes
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Handle browser navigation (back/forward/close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show their own
        // But we still need to set returnValue for the dialog to appear
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [message]);

  // Callback to check if navigation should be blocked
  const shouldBlockNavigation = useCallback(() => {
    if (hasUnsavedChangesRef.current && onNavigateAway) {
      onNavigateAway();
      return true;
    }
    return false;
  }, [onNavigateAway]);

  return {
    shouldBlockNavigation,
    hasUnsavedChanges: hasUnsavedChangesRef.current,
  };
}

/**
 * Helper to track changes in form data
 * Compares current data with original data to detect changes
 */
export function useChangeTracking<T>(
  originalData: T,
  currentData: T,
  compareFn?: (a: T, b: T) => boolean
): boolean {
  const defaultCompare = (a: T, b: T) => {
    return JSON.stringify(a) !== JSON.stringify(b);
  };

  const compare = compareFn || defaultCompare;
  return compare(originalData, currentData);
}
