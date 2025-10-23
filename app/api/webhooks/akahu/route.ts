import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { logAuditEvent } from "@/lib/audit/log";

type AkahuWebhookPayload = {
  event?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  user?: string;
  user_id?: string;
  data?: { status?: string; provider?: string };
  connection?: { status?: string; provider?: string };
  [key: string]: unknown;
};

function extractUserId(payload: AkahuWebhookPayload): string | null {
  const metadataUser = payload.metadata?.user_id;
  if (typeof metadataUser === "string") return metadataUser;
  if (typeof payload.user_id === "string") return payload.user_id;
  if (typeof payload.user === "string") return payload.user;
  return null;
}

export async function POST(request: Request) {
  const signature = headers().get("x-akahu-signature");
  const secret = process.env.AKAHU_WEBHOOK_SECRET;

  if (secret && signature !== secret) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: AkahuWebhookPayload;
  try {
    payload = (await request.json()) as AkahuWebhookPayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = extractUserId(payload);
  const eventType = payload.event ?? payload.type ?? "unknown";

  const client = createServiceClient();

  const { error: insertError } = await client.from("akahu_webhook_events").insert({
    user_id: userId,
    event_type: eventType,
    payload,
  });

  if (insertError) {
    console.error("Failed to log Akahu webhook", insertError);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  if (userId) {
    const status = payload.connection?.status ?? payload.data?.status ?? null;
    const provider = payload.connection?.provider ?? payload.data?.provider ?? "Akahu";
    const nowIso = new Date().toISOString();

    if (status) {
      const { error: updateError } = await client
        .from("bank_connections")
        .upsert(
          {
            user_id: userId,
            provider,
            status,
            last_synced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id,provider" },
        );

      if (updateError) {
        console.error("Failed to update connection from webhook", updateError);
      }
    }

    await logAuditEvent(client, {
      userId,
      action: `akahu.webhook.${eventType}`,
      metadata: { provider, status },
    });
  }

  return NextResponse.json({ ok: true });
}
