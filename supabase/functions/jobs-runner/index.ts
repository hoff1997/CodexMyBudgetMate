import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const target = Deno.env.get("JOB_TARGET_URL") ?? "";
const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

if (!target) {
  console.error("JOB_TARGET_URL is not configured");
}

if (!cronSecret) {
  console.error("CRON_SECRET is not configured in jobs-runner function");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payloadText = await req.text();
  let task = "all";
  if (payloadText) {
    try {
      const parsed = JSON.parse(payloadText);
      if (parsed && typeof parsed.task === "string") {
        task = parsed.task;
      }
    } catch (error) {
      console.error("Failed to parse cron payload", error);
    }
  }

  if (!target) {
    return new Response("Target URL not configured", { status: 500 });
  }

  const url = new URL(target);
  if (task && task !== "all") {
    url.searchParams.set("task", task);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    console.error("Failed to trigger job", error);
    return new Response("Failed to trigger job", { status: 500 });
  }
});
