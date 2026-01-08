import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Chore Schedule Generator
 *
 * This job processes active chore schedules and generates chore_assignments
 * for the appropriate children based on the schedule configuration.
 *
 * Run daily via cron job at /api/jobs/run
 */

type ScheduleRow = {
  id: string;
  parent_user_id: string;
  name: string;
  chore_template_id: string | null;
  routine_id: string | null;
  child_profile_id: string | null;
  rotation_id: string | null;
  frequency: "daily" | "weekly" | "fortnightly" | "monthly";
  days_of_week: number[] | null;
  day_of_month: number | null;
  time_of_day: string | null;
  target_time: string | null;
  start_date: string;
  end_date: string | null;
  occurrences_limit: number | null;
  occurrences_count: number;
  next_occurrence_date: string | null;
  currency_type: string | null;
  currency_amount: number | null;
};

type GeneratorResult = {
  schedulesProcessed: number;
  assignmentsCreated: number;
  skipped: number;
  errors: Array<{ scheduleId: string; message: string }>;
};

/**
 * Calculate the next occurrence date based on frequency and current date
 */
function calculateNextOccurrence(
  schedule: ScheduleRow,
  fromDate: Date
): string | null {
  const { frequency, days_of_week, day_of_month, end_date, occurrences_limit, occurrences_count } = schedule;

  // Check if we've hit limits
  if (occurrences_limit && occurrences_count >= occurrences_limit) {
    return null;
  }

  if (end_date && fromDate > new Date(end_date)) {
    return null;
  }

  const nextDate = new Date(fromDate);

  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case "weekly":
      if (days_of_week && days_of_week.length > 0) {
        // Find the next matching day of week
        const currentDay = nextDate.getDay();
        const sortedDays = [...days_of_week].sort((a, b) => a - b);

        // Find the next day in the list that's after today
        let nextDay = sortedDays.find((d) => d > currentDay);
        if (nextDay === undefined) {
          // Wrap to next week
          nextDay = sortedDays[0];
          nextDate.setDate(nextDate.getDate() + (7 - currentDay + nextDay));
        } else {
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
        }
      } else {
        // Default: same day next week
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;

    case "fortnightly":
      nextDate.setDate(nextDate.getDate() + 14);
      break;

    case "monthly":
      if (day_of_month) {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(Math.min(day_of_month, getDaysInMonth(nextDate)));
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
  }

  // Check end date again
  if (end_date && nextDate > new Date(end_date)) {
    return null;
  }

  return nextDate.toISOString().split("T")[0];
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get the week starting date (Monday) for a given date
 */
function getWeekStarting(date: Date): string {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + mondayOffset);
  return weekStart.toISOString().split("T")[0];
}

/**
 * Main schedule generator function
 */
export async function runChoreScheduleGenerator(
  client: SupabaseClient
): Promise<GeneratorResult> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStarting = getWeekStarting(today);

  const result: GeneratorResult = {
    schedulesProcessed: 0,
    assignmentsCreated: 0,
    skipped: 0,
    errors: [],
  };

  // Fetch all active schedules where next_occurrence_date <= today
  const { data: schedules, error: schedulesError } = await client
    .from("chore_schedules")
    .select("*")
    .eq("is_active", true)
    .lte("next_occurrence_date", todayStr)
    .lte("start_date", todayStr);

  if (schedulesError) {
    throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
  }

  if (!schedules || schedules.length === 0) {
    return result;
  }

  for (const schedule of schedules as ScheduleRow[]) {
    result.schedulesProcessed += 1;

    try {
      // Check end date
      if (schedule.end_date && new Date(schedule.end_date) < today) {
        // Deactivate expired schedule
        await client
          .from("chore_schedules")
          .update({ is_active: false })
          .eq("id", schedule.id);
        result.skipped += 1;
        continue;
      }

      // Check occurrences limit
      if (
        schedule.occurrences_limit &&
        schedule.occurrences_count >= schedule.occurrences_limit
      ) {
        await client
          .from("chore_schedules")
          .update({ is_active: false })
          .eq("id", schedule.id);
        result.skipped += 1;
        continue;
      }

      // Determine which children to assign to
      let childIds: string[] = [];

      if (schedule.child_profile_id) {
        // Single child assignment
        childIds = [schedule.child_profile_id];
      } else if (schedule.rotation_id) {
        // Rotation - get current child and advance rotation
        const { data: rotation, error: rotationError } = await client
          .from("chore_rotations")
          .select("current_child_index")
          .eq("id", schedule.rotation_id)
          .single();

        if (rotationError || !rotation) {
          result.errors.push({
            scheduleId: schedule.id,
            message: `Failed to get rotation: ${rotationError?.message || "Not found"}`,
          });
          continue;
        }

        const { data: members, error: membersError } = await client
          .from("chore_rotation_members")
          .select("child_profile_id, order_position")
          .eq("rotation_id", schedule.rotation_id)
          .order("order_position");

        if (membersError || !members || members.length === 0) {
          result.errors.push({
            scheduleId: schedule.id,
            message: `Failed to get rotation members: ${membersError?.message || "No members"}`,
          });
          continue;
        }

        const currentIndex = rotation.current_child_index % members.length;
        childIds = [members[currentIndex].child_profile_id];

        // Advance rotation to next child
        const nextIndex = (currentIndex + 1) % members.length;
        await client
          .from("chore_rotations")
          .update({
            current_child_index: nextIndex,
            last_rotated_at: new Date().toISOString(),
          })
          .eq("id", schedule.rotation_id);
      } else {
        // No child specified - skip
        result.errors.push({
          scheduleId: schedule.id,
          message: "No child_profile_id or rotation_id specified",
        });
        continue;
      }

      // Determine which chores to create
      let choreTemplateIds: Array<{
        templateId: string;
        currencyType: string | null;
        currencyAmount: number | null;
        sortOrder: number;
      }> = [];

      if (schedule.routine_id) {
        // Get routine items
        const { data: routineItems, error: routineError } = await client
          .from("chore_routine_items")
          .select("chore_template_id, sort_order, override_currency_type, override_currency_amount")
          .eq("routine_id", schedule.routine_id)
          .order("sort_order");

        if (routineError || !routineItems) {
          result.errors.push({
            scheduleId: schedule.id,
            message: `Failed to get routine items: ${routineError?.message || "Not found"}`,
          });
          continue;
        }

        choreTemplateIds = routineItems.map((item) => ({
          templateId: item.chore_template_id as string,
          currencyType: (item.override_currency_type || schedule.currency_type) as string | null,
          currencyAmount: (item.override_currency_amount ?? schedule.currency_amount) as number | null,
          sortOrder: item.sort_order as number,
        }));
      } else if (schedule.chore_template_id) {
        // Single chore
        choreTemplateIds = [
          {
            templateId: schedule.chore_template_id,
            currencyType: schedule.currency_type,
            currencyAmount: schedule.currency_amount,
            sortOrder: 0,
          },
        ];
      } else {
        result.errors.push({
          scheduleId: schedule.id,
          message: "No chore_template_id or routine_id specified",
        });
        continue;
      }

      // Calculate day_of_week for assignment (0 = Sunday, 6 = Saturday)
      const dayOfWeek = today.getDay();

      // Create assignments for each child and each chore template
      for (const childId of childIds) {
        for (const choreInfo of choreTemplateIds) {
          // Check if assignment already exists for this week/child/template
          const { data: existing } = await client
            .from("chore_assignments")
            .select("id")
            .eq("child_profile_id", childId)
            .eq("chore_template_id", choreInfo.templateId)
            .eq("week_starting", weekStarting)
            .eq("day_of_week", dayOfWeek)
            .limit(1);

          if (existing && existing.length > 0) {
            // Assignment already exists
            result.skipped += 1;
            continue;
          }

          // Create the assignment
          const { error: insertError } = await client
            .from("chore_assignments")
            .insert({
              child_profile_id: childId,
              parent_user_id: schedule.parent_user_id,
              chore_template_id: choreInfo.templateId,
              week_starting: weekStarting,
              day_of_week: dayOfWeek,
              status: "pending",
              currency_type: choreInfo.currencyType,
              currency_amount: choreInfo.currencyAmount,
              schedule_id: schedule.id,
              routine_id: schedule.routine_id,
              time_of_day: schedule.time_of_day,
              target_time: schedule.target_time,
              sort_order_in_routine: choreInfo.sortOrder,
            });

          if (insertError) {
            result.errors.push({
              scheduleId: schedule.id,
              message: `Failed to create assignment: ${insertError.message}`,
            });
            continue;
          }

          result.assignmentsCreated += 1;
        }
      }

      // Update schedule with next occurrence date and increment count
      const nextOccurrence = calculateNextOccurrence(schedule, today);

      await client
        .from("chore_schedules")
        .update({
          last_generated_date: todayStr,
          next_occurrence_date: nextOccurrence,
          occurrences_count: schedule.occurrences_count + 1,
          is_active: nextOccurrence !== null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id);
    } catch (err) {
      result.errors.push({
        scheduleId: schedule.id,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
