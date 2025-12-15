import { useMemo } from "react";
import { allCoaching } from "../content";
import type { PageCoaching } from "../types";

export function usePageCoaching(pageId: string): PageCoaching | null {
  return useMemo(() => {
    return allCoaching[pageId] ?? null;
  }, [pageId]);
}
