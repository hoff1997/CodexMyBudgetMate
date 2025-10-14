import { differenceInCalendarDays, format, isBefore } from "date-fns";

export type PlannerFrequency =
  | "none"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "annually";

export const frequencyOptions: { value: PlannerFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "none", label: "No schedule" },
];

export function calculateAnnualFromTarget(targetAmount: number, frequency: PlannerFrequency) {
  if (!targetAmount) return 0;
  switch (frequency) {
    case "weekly":
      return targetAmount * 52;
    case "fortnightly":
      return targetAmount * 26;
    case "monthly":
      return targetAmount * 12;
    case "quarterly":
      return targetAmount * 4;
    case "annually":
    case "none":
    default:
      return targetAmount;
  }
}

export function calculateRequiredContribution(
  annualAmount: number,
  payFrequency: PlannerFrequency,
) {
  if (!annualAmount) return 0;
  switch (payFrequency) {
    case "weekly":
      return annualAmount / 52;
    case "fortnightly":
      return annualAmount / 26;
    case "monthly":
      return annualAmount / 12;
    case "quarterly":
      return annualAmount / 4;
    case "annually":
      return annualAmount;
    case "none":
    default:
      return annualAmount / 12;
  }
}

export function determineStatus(current: number, expected: number, tolerance = 5) {
  if (current < expected - tolerance) return "under" as const;
  if (current > expected + tolerance) return "over" as const;
  return "on-track" as const;
}

export function calculateDueProgress(nextDue?: string | null) {
  if (!nextDue) return { progress: 0, label: "No due date", formatted: undefined as string | undefined };
  const dueDate = new Date(nextDue);
  const today = new Date();
  const windowStart = isBefore(dueDate, today) ? dueDate : today;
  const total = Math.max(differenceInCalendarDays(dueDate, windowStart), 0) || 1;
  const remaining = Math.max(differenceInCalendarDays(dueDate, today), 0);
  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const label = remaining === 0 ? "Due today" : `${remaining} days left`;
  return { progress, label, formatted: format(dueDate, "dd/MM/yyyy") };
}
