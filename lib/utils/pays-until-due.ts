/**
 * Pays Until Due - Bill Urgency Calculator
 *
 * Helps users understand bill urgency in terms of paychecks, not calendar days.
 * Users think in pay cycles — "Can I fund this before it's due?"
 */

export interface PaySchedule {
  nextPayDate: Date;
  payFrequency: 'weekly' | 'fortnightly' | 'monthly';
}

export interface PaysUntilDue {
  pays: number;           // Number of pays until due (-1 = overdue)
  daysUntilDue: number;   // Raw days for reference
  urgency: 'overdue' | 'high' | 'medium' | 'low' | 'none';
  displayText: string;    // Formatted text to show
}

/**
 * Get the next occurrence of a due date based on day of month.
 * If the day has passed this month, returns next month's date.
 *
 * @param dueDateValue - Can be a Date, ISO string, or day number (1-31)
 * @returns The next occurrence of this due date
 */
export function getNextDueDate(dueDateValue: string | Date | number | null | undefined): Date | null {
  if (dueDateValue === null || dueDateValue === undefined) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDayOfMonth: number;

  if (typeof dueDateValue === 'number') {
    // Direct day number (1-31)
    dueDayOfMonth = dueDateValue;
  } else {
    // Date object or string - extract day
    const dueDate = new Date(dueDateValue);
    if (isNaN(dueDate.getTime())) {
      return null;
    }
    dueDayOfMonth = dueDate.getDate();
  }

  // Clamp to valid range
  dueDayOfMonth = Math.max(1, Math.min(31, dueDayOfMonth));

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  if (currentDay <= dueDayOfMonth) {
    // Due date is still this month
    return new Date(currentYear, currentMonth, dueDayOfMonth);
  } else {
    // Due date has passed this month, get next month's
    return new Date(currentYear, currentMonth + 1, dueDayOfMonth);
  }
}

/**
 * Ensure a pay date is in the future by advancing it based on pay frequency.
 *
 * @param storedDate - The stored next pay date
 * @param payFrequency - How often the user is paid
 * @returns A date that is in the future
 */
export function ensureNextPayDateIsFuture(
  storedDate: Date,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly'
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextPay = new Date(storedDate);
  nextPay.setHours(0, 0, 0, 0);

  // Keep advancing until we get a future date
  while (nextPay < today) {
    switch (payFrequency) {
      case 'weekly':
        nextPay.setDate(nextPay.getDate() + 7);
        break;
      case 'fortnightly':
        nextPay.setDate(nextPay.getDate() + 14);
        break;
      case 'monthly':
        nextPay.setMonth(nextPay.getMonth() + 1);
        break;
    }
  }

  return nextPay;
}

/**
 * Calculate how many pay cycles until a bill is due.
 *
 * @param dueDate - When the bill is due
 * @param paySchedule - User's pay schedule (next pay date and frequency)
 * @param isFunded - Whether the envelope is fully funded
 * @returns Object with pays count, urgency level, and display text
 */
export function calculatePaysUntilDue(
  dueDate: Date,
  paySchedule: PaySchedule,
  isFunded: boolean
): PaysUntilDue {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  // Ensure next pay date is in the future
  const nextPay = ensureNextPayDateIsFuture(
    new Date(paySchedule.nextPayDate),
    paySchedule.payFrequency
  );

  // Calculate days
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / msPerDay);
  const daysUntilNextPay = Math.floor((nextPay.getTime() - today.getTime()) / msPerDay);

  // Pay frequency in days
  const frequencyDays: Record<string, number> = {
    weekly: 7,
    fortnightly: 14,
    monthly: 30, // Approximation for monthly
  };
  const daysBetweenPays = frequencyDays[paySchedule.payFrequency] || 14;

  // Calculate pays until due
  let pays: number;

  if (daysUntilDue < 0) {
    pays = -1; // Overdue
  } else if (daysUntilDue <= daysUntilNextPay) {
    pays = 0; // Due before or on next pay day
  } else {
    // Calculate how many pays away
    const daysAfterNextPay = daysUntilDue - daysUntilNextPay;
    pays = 1 + Math.floor(daysAfterNextPay / daysBetweenPays);
  }

  // Determine urgency and display text based on funded status
  let urgency: PaysUntilDue['urgency'];
  let displayText: string;

  if (isFunded) {
    // Funded bills show information without urgency
    urgency = 'none';
    if (pays < 0) {
      displayText = 'Overdue';
    } else if (pays === 0) {
      displayText = 'Due soon';
    } else {
      displayText = `${pays} pay${pays !== 1 ? 's' : ''}`;
    }
  } else {
    // Unfunded bills show urgency
    if (pays < 0) {
      urgency = 'overdue';
      displayText = 'Overdue!';
    } else if (pays === 0) {
      urgency = 'high';
      displayText = 'Due now!';
    } else if (pays === 1) {
      urgency = 'high';
      displayText = '1 pay!';
    } else if (pays === 2) {
      urgency = 'medium';
      displayText = '2 pays';
    } else if (pays <= 4) {
      urgency = 'low';
      displayText = `${pays} pays`;
    } else {
      urgency = 'none';
      displayText = `${pays} pays`;
    }
  }

  return { pays, daysUntilDue, urgency, displayText };
}

/**
 * Get the primary pay schedule from a list of income sources.
 * Uses the income source with the earliest next_pay_date.
 *
 * @param incomeSources - Array of income sources
 * @param fallbackPayCycle - User's default pay cycle from profile
 * @returns PaySchedule or null if no valid schedule found
 */
export function getPrimaryPaySchedule(
  incomeSources: Array<{
    nextPayDate?: string | Date;
    frequency?: string;
    isActive?: boolean;
  }>,
  fallbackPayCycle: 'weekly' | 'fortnightly' | 'monthly' = 'fortnightly'
): PaySchedule | null {
  // Filter to active sources with next pay dates
  const validSources = incomeSources.filter(source => {
    if (source.isActive === false) return false;
    if (!source.nextPayDate) return false;
    const date = new Date(source.nextPayDate);
    return !isNaN(date.getTime());
  });

  if (validSources.length === 0) {
    // No valid income sources - can't calculate pays until due
    return null;
  }

  // Sort by next pay date (earliest first)
  const sorted = [...validSources].sort((a, b) => {
    const dateA = new Date(a.nextPayDate!);
    const dateB = new Date(b.nextPayDate!);
    return dateA.getTime() - dateB.getTime();
  });

  const primary = sorted[0];
  const nextPayDate = ensureNextPayDateIsFuture(
    new Date(primary.nextPayDate!),
    (primary.frequency as 'weekly' | 'fortnightly' | 'monthly') || fallbackPayCycle
  );

  // Map frequency values
  let payFrequency: 'weekly' | 'fortnightly' | 'monthly' = fallbackPayCycle;
  if (primary.frequency === 'weekly') payFrequency = 'weekly';
  else if (primary.frequency === 'fortnightly') payFrequency = 'fortnightly';
  else if (primary.frequency === 'monthly') payFrequency = 'monthly';
  else if (primary.frequency === 'twice_monthly') payFrequency = 'fortnightly'; // Approximate

  return {
    nextPayDate,
    payFrequency,
  };
}
