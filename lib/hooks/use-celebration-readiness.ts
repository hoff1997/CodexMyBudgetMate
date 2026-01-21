import { useQuery } from "@tanstack/react-query";

export interface CelebrationReadinessData {
  status: 'on_track' | 'slightly_behind' | 'needs_attention' | 'no_events';
  shortfall: number;
  perPayCatchUp: number;
  nextEventName: string | null;
  nextEventDate: string | null;
  daysUntil: number | null;
  paysUntil: number | null;
  currentBalance: number;
  annualTotal: number;
  steadyStatePerPay: number;
}

/**
 * Hook to fetch celebration readiness for all celebration envelopes
 * Returns a map of envelope_id -> readiness data
 */
export function useCelebrationReadiness() {
  return useQuery<Record<string, CelebrationReadinessData>>({
    queryKey: ["celebration-readiness"],
    queryFn: async () => {
      const res = await fetch("/api/celebrations/readiness");
      if (!res.ok) {
        throw new Error("Failed to fetch celebration readiness");
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Only refetch on mount if stale
    refetchOnWindowFocus: false,
  });
}

/**
 * Get readiness data for a specific envelope
 */
export function getEnvelopeReadiness(
  readinessMap: Record<string, CelebrationReadinessData> | undefined,
  envelopeId: string
): CelebrationReadinessData | null {
  if (!readinessMap) return null;
  return readinessMap[envelopeId] || null;
}
