import {
  type PayCycle,
  type Frequency,
  type Envelope,
  type EnvelopeHealth,
  type Scenario,
  type ScenarioResult,
  type ImpactedEnvelope,
} from "./types";

// Calculate how many pays occur between two dates
export function calculatePaysBetween(startDate: Date, endDate: Date, payCycle: PayCycle): number {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (payCycle) {
    case "weekly":
      return Math.ceil(days / 7);
    case "fortnightly":
      return Math.ceil(days / 14);
    case "monthly":
      return Math.ceil(days / 30.44); // average days per month
    default:
      return 0;
  }
}

// Calculate the last time this bill was due (start of current saving period)
export function calculateLastDueDate(nextDueDate: Date, frequency: Frequency): Date {
  const last = new Date(nextDueDate);

  switch (frequency) {
    case "weekly":
      last.setDate(last.getDate() - 7);
      break;
    case "fortnightly":
      last.setDate(last.getDate() - 14);
      break;
    case "monthly":
      last.setMonth(last.getMonth() - 1);
      break;
    case "quarterly":
      last.setMonth(last.getMonth() - 3);
      break;
    case "annual":
      last.setFullYear(last.getFullYear() - 1);
      break;
    case "once":
      // For one-time expenses, assume saving period started a year ago or when created
      last.setFullYear(last.getFullYear() - 1);
      break;
  }

  return last;
}

// Get number of pays per month for a given pay cycle
export function getPayCyclesPerMonth(payCycle: PayCycle): number {
  switch (payCycle) {
    case "weekly":
      return 52 / 12; // ~4.33
    case "fortnightly":
      return 26 / 12; // ~2.17
    case "monthly":
      return 1;
    default:
      return 1;
  }
}

// Calculate total pays in a frequency period
export function getPayCyclesInFrequency(frequency: Frequency, payCycle: PayCycle): number {
  switch (frequency) {
    case "weekly":
      return payCycle === "weekly" ? 1 : payCycle === "fortnightly" ? 0.5 : 0.23;
    case "fortnightly":
      return payCycle === "weekly" ? 2 : payCycle === "fortnightly" ? 1 : 0.46;
    case "monthly":
      return payCycle === "weekly" ? 4.33 : payCycle === "fortnightly" ? 2.17 : 1;
    case "quarterly":
      return payCycle === "weekly" ? 13 : payCycle === "fortnightly" ? 6.5 : 3;
    case "annual":
      return payCycle === "weekly" ? 52 : payCycle === "fortnightly" ? 26 : 12;
    case "once":
      // For one-time, assume spread over a year
      return payCycle === "weekly" ? 52 : payCycle === "fortnightly" ? 26 : 12;
    default:
      return 1;
  }
}

// Calculate envelope health (where should you be vs where you are)
export function calculateEnvelopeHealth(
  envelope: Envelope,
  payCycle: PayCycle,
  today: Date = new Date()
): EnvelopeHealth {
  const dueDate = envelope.next_payment_due ? new Date(envelope.next_payment_due) : null;
  const frequency = envelope.frequency || "once";
  const totalDueAmount = envelope.target_amount || 0;
  const currentBalance = envelope.current_amount || 0;

  // If no due date, can't calculate health
  if (!dueDate) {
    return {
      envelopeId: envelope.id,
      name: envelope.name,
      priority: envelope.priority,
      dueDate: null,
      totalDueAmount,
      currentBalance,
      shouldHaveSaved: 0,
      gap: 0,
      gapStatus: "on-track",
      percentComplete: 100,
      regularPerPay: envelope.pay_cycle_amount || 0,
      daysUntilDue: null,
      paysUntilDue: null,
      priorityScore: 9999,
      priorityReason: "No due date set",
    };
  }

  // Calculate saving period
  const savingPeriodStart = calculateLastDueDate(dueDate, frequency);
  const paysSinceStart = calculatePaysBetween(savingPeriodStart, today, payCycle);
  const totalPaysInPeriod = calculatePaysBetween(savingPeriodStart, dueDate, payCycle);

  // Regular per-pay amount
  const regularPerPay = totalPaysInPeriod > 0 ? totalDueAmount / totalPaysInPeriod : 0;

  // How much SHOULD be saved by now
  const shouldHaveSaved = Math.min(regularPerPay * paysSinceStart, totalDueAmount);

  // Gap analysis
  const gap = shouldHaveSaved - currentBalance;
  const percentComplete = shouldHaveSaved > 0 ? (currentBalance / shouldHaveSaved) * 100 : 100;

  let gapStatus: "ahead" | "on-track" | "behind";
  if (gap < -50) {
    gapStatus = "ahead";
  } else if (gap >= -50 && gap <= 50) {
    gapStatus = "on-track";
  } else {
    gapStatus = "behind";
  }

  // Timeline
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const paysUntilDue = calculatePaysBetween(today, dueDate, payCycle);

  // Priority scoring (lower = more urgent)
  const urgencyWeight = Math.max(1, 100 - daysUntilDue);
  const gapWeight = gap > 0 ? (gap / totalDueAmount) * 100 : 0;
  const priorityScore = urgencyWeight + gapWeight;

  let priorityReason: string;
  if (gapStatus === "ahead") {
    priorityReason = `On track with $${Math.abs(gap).toFixed(2)} buffer`;
  } else if (gapStatus === "on-track") {
    priorityReason = "On track for due date";
  } else {
    priorityReason = `${daysUntilDue} days until due, $${gap.toFixed(2)} behind schedule`;
  }

  return {
    envelopeId: envelope.id,
    name: envelope.name,
    priority: envelope.priority,
    dueDate: dueDate.toISOString().slice(0, 10),
    totalDueAmount,
    currentBalance,
    shouldHaveSaved,
    gap,
    gapStatus,
    percentComplete,
    regularPerPay,
    daysUntilDue,
    paysUntilDue,
    priorityScore,
    priorityReason,
  };
}

// Calculate all envelope health checks
export function calculateAllEnvelopeHealth(
  envelopes: Envelope[],
  payCycle: PayCycle
): EnvelopeHealth[] {
  return envelopes
    .filter((env) => env.envelope_type === "expense") // only expenses
    .map((env) => calculateEnvelopeHealth(env, payCycle));
}

// Calculate scenario impact
export function calculateScenario(
  envelopes: Envelope[],
  payCycle: PayCycle,
  scenario: Scenario
): ScenarioResult {
  // Step 1: Calculate current health for all envelopes
  const allHealth = calculateAllEnvelopeHealth(envelopes, payCycle);

  // Step 2: Identify affected envelopes
  let affectedEnvelopes = envelopes.filter((env) =>
    scenario.affectedPriorities.includes(env.priority)
  );

  // If specific envelopes named, filter further
  if (scenario.specificEnvelopes && scenario.specificEnvelopes.length > 0) {
    affectedEnvelopes = affectedEnvelopes.filter((env) =>
      scenario.specificEnvelopes!.some((name) => env.name.toLowerCase().includes(name.toLowerCase()))
    );
  }

  // Step 3: Calculate savings from reduction
  const impactedEnvelopes: ImpactedEnvelope[] = affectedEnvelopes.map((env) => {
    const currentPerPay = env.pay_cycle_amount || 0;
    const newPerPay = currentPerPay * (1 - scenario.reduction / 100);
    const savedPerPay = currentPerPay - newPerPay;

    return {
      envelopeId: env.id,
      name: env.name,
      priority: env.priority,
      currentPerPay,
      newPerPay,
      savedPerPay,
    };
  });

  // Step 4: Calculate total savings
  const savingsPerPay = impactedEnvelopes.reduce((sum, e) => sum + e.savedPerPay, 0);
  const savingsPerMonth = savingsPerPay * getPayCyclesPerMonth(payCycle);
  const totalSavingsOverPeriod = savingsPerPay * scenario.duration;

  // Step 5: Calculate current gap across all envelopes
  const behindEnvelopes = allHealth.filter((h) => h.gap > 0).sort((a, b) => a.priorityScore - b.priorityScore);
  const currentGap = behindEnvelopes.reduce((sum, h) => sum + h.gap, 0);

  // Step 6: Project where surplus would go
  let remainingSurplus = totalSavingsOverPeriod;
  const projectedHealth = allHealth.map((health) => {
    if (health.gap <= 0) return health; // already on track or ahead

    const allocated = Math.min(remainingSurplus, health.gap);
    remainingSurplus -= allocated;

    const newBalance = health.currentBalance + allocated;
    const newGap = health.shouldHaveSaved - newBalance;

    return {
      ...health,
      currentBalance: newBalance,
      gap: newGap,
      gapStatus: newGap <= 50 ? ("on-track" as const) : ("behind" as const),
      percentComplete: (newBalance / health.shouldHaveSaved) * 100,
    };
  });

  // Step 7: Calculate metrics
  const gapAfterScenario = Math.max(0, currentGap - totalSavingsOverPeriod);
  const timeToCloseGap = savingsPerPay > 0 ? Math.ceil(currentGap / savingsPerPay) : 0;
  const bufferAfterGap = Math.max(0, totalSavingsOverPeriod - currentGap);
  const onTrackAfterPays = Math.min(scenario.duration, timeToCloseGap);

  return {
    scenario,
    savingsPerPay,
    savingsPerMonth,
    totalSavingsOverPeriod,
    impactedEnvelopes,
    projection: {
      currentGap,
      gapAfterScenario,
      timeToCloseGap,
      bufferAfterGap,
      onTrackAfterPays,
    },
    healthAfterScenario: {
      essential: projectedHealth.filter((h) => {
        const env = envelopes.find((e) => e.id === h.envelopeId);
        return env?.priority === "essential";
      }),
      important: projectedHealth.filter((h) => {
        const env = envelopes.find((e) => e.id === h.envelopeId);
        return env?.priority === "important";
      }),
      discretionary: projectedHealth.filter((h) => {
        const env = envelopes.find((e) => e.id === h.envelopeId);
        return env?.priority === "discretionary";
      }),
    },
  };
}

// Pre-built common scenarios
export function getCommonScenarios(payCycle: PayCycle): Scenario[] {
  // Duration in pays
  const threeMonthDuration = payCycle === "weekly" ? 12 : payCycle === "fortnightly" ? 6 : 3;
  const sixMonthDuration = payCycle === "weekly" ? 24 : payCycle === "fortnightly" ? 12 : 6;

  return [
    {
      id: "pause-discretionary",
      name: "Pause All Discretionary",
      description: "Cut all non-essential spending for 3 months",
      duration: threeMonthDuration,
      affectedPriorities: ["discretionary"],
      reduction: 100,
    },
    {
      id: "reduce-discretionary-half",
      name: "Reduce Discretionary by Half",
      description: "Keep some treats, but dial back significantly",
      duration: threeMonthDuration,
      affectedPriorities: ["discretionary"],
      reduction: 50,
    },
    {
      id: "pause-subscriptions",
      name: "Subscription Audit",
      description: "Pause streaming services and subscriptions for 6 months",
      duration: sixMonthDuration,
      affectedPriorities: ["discretionary"],
      reduction: 100,
      specificEnvelopes: ["Netflix", "Spotify", "Disney", "Gym", "Subscription"],
    },
    {
      id: "no-eating-out",
      name: "No Takeaways & Eating Out",
      description: "Cook at home for 3 months",
      duration: threeMonthDuration,
      affectedPriorities: ["discretionary"],
      reduction: 100,
      specificEnvelopes: ["Eating Out", "Takeaway", "Restaurant", "Hospitality"],
    },
    {
      id: "intense-sprint",
      name: "Intense 3-Month Sprint",
      description: "Essentials only - aggressive buffer building",
      duration: threeMonthDuration,
      affectedPriorities: ["discretionary", "important"],
      reduction: 100,
    },
  ];
}
