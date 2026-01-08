import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { runAkahuSync } from "@/lib/jobs/akahu-sync";
import { runEnvelopeRecalculation } from "@/lib/jobs/envelope-recalc";
import { runPayPlanSync } from "@/lib/jobs/pay-plan-sync";
import { runChoreScheduleGenerator } from "@/lib/jobs/chore-schedule-generator";

function isTaskEnabled(task: string, filter: string) {
  if (filter === "all" || !filter) return true;
  return filter === task;
}

export async function POST(request: Request) {
  const authHeader = headers().get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const taskFilter = url.searchParams.get("task") ?? "all";

  const client = createServiceClient();
  const results: Record<string, unknown> = {};

  try {
    if (isTaskEnabled("akahu", taskFilter)) {
      results.akahu = await runAkahuSync(client);
    }

    if (isTaskEnabled("envelopes", taskFilter)) {
      results.envelopes = await runEnvelopeRecalculation(client);
    }

    if (isTaskEnabled("pay-plan", taskFilter)) {
      results.payPlan = await runPayPlanSync(client);
    }

    if (isTaskEnabled("chore-schedules", taskFilter)) {
      results.choreSchedules = await runChoreScheduleGenerator(client);
    }

    return NextResponse.json({ ok: true, task: taskFilter, results });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Job failure",
        task: taskFilter,
        partial: results,
      },
      { status: 500 },
    );
  }
}
