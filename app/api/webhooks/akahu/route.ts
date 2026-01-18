import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { logAuditEvent } from "@/lib/audit/log";

type AkahuWebhookPayload = {
  event?: string;
  type?: string;
  webhook_type?: string;
  webhook_code?: string;
  metadata?: Record<string, unknown>;
  user?: string;
  user_id?: string;
  state?: string;
  data?: { status?: string; provider?: string };
  connection?: { status?: string; provider?: string };
  item?: { _id?: string; status?: string };
  [key: string]: unknown;
};

function extractUserId(payload: AkahuWebhookPayload): string | null {
  // Try multiple locations where user ID might be stored
  if (typeof payload.state === "string") return payload.state;
  const metadataUser = payload.metadata?.user_id;
  if (typeof metadataUser === "string") return metadataUser;
  if (typeof payload.user_id === "string") return payload.user_id;
  if (typeof payload.user === "string") return payload.user;
  return null;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * Uses timing-safe comparison to prevent timing attacks
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const headersList = await headers();
  const signature = headersList.get("x-akahu-signature");
  const secret = process.env.AKAHU_WEBHOOK_SECRET;

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify signature if secret is configured
  if (secret) {
    if (!signature) {
      console.error("Akahu webhook: Missing signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error("Akahu webhook: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: AkahuWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AkahuWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = extractUserId(payload);
  const webhookType = payload.webhook_type ?? payload.event ?? payload.type ?? "unknown";
  const webhookCode = payload.webhook_code ?? "";

  const client = createServiceClient();

  // Log all webhook events for debugging and audit
  const { error: insertError } = await client.from("akahu_webhook_events").insert({
    user_id: userId,
    event_type: `${webhookType}${webhookCode ? `:${webhookCode}` : ""}`,
    payload,
  });

  if (insertError) {
    console.error("Failed to log Akahu webhook", insertError);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  if (!userId) {
    console.warn("Akahu webhook: No user ID found in payload", { webhookType, webhookCode });
    return NextResponse.json({ ok: true, warning: "No user ID in payload" });
  }

  const nowIso = new Date().toISOString();

  // Handle specific webhook types
  switch (webhookType) {
    case "TOKEN": {
      // Handle token events (user revoked access, token expired, etc.)
      if (webhookCode === "DELETE" || webhookCode === "REVOKED") {
        console.log(`Akahu TOKEN:${webhookCode} event for user ${userId}`);

        // Delete user's Akahu tokens (they revoked access)
        const { error: deleteError } = await client
          .from("akahu_tokens")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.error("Failed to delete Akahu tokens on revocation", deleteError);
        }

        // Update bank connection status to disconnected
        const { error: updateError } = await client
          .from("bank_connections")
          .update({
            status: "disconnected",
            updated_at: nowIso,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Failed to update connection status on token revocation", updateError);
        }

        await logAuditEvent(client, {
          userId,
          action: "akahu.token.revoked",
          metadata: { webhookCode },
        });
      }
      break;
    }

    case "ACCOUNT": {
      // Handle account events (status changes, disconnections, etc.)
      const accountId = payload.item?._id;
      const accountStatus = payload.item?.status ?? payload.data?.status;
      const provider = payload.connection?.provider ?? payload.data?.provider ?? "Akahu";

      console.log(`Akahu ACCOUNT:${webhookCode} event for user ${userId}`, {
        accountId,
        accountStatus,
      });

      if (accountStatus === "INACTIVE" || webhookCode === "CANCEL") {
        // Account disconnected - mark as needing reauthorization
        const { error: updateError } = await client
          .from("bank_connections")
          .upsert(
            {
              user_id: userId,
              provider,
              status: "action_required",
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "user_id,provider" }
          );

        if (updateError) {
          console.error("Failed to update connection on account inactive", updateError);
        }
      } else if (accountStatus) {
        // Update connection with new status
        const mappedStatus =
          accountStatus === "ACTIVE" ? "connected" : accountStatus.toLowerCase();

        const { error: updateError } = await client
          .from("bank_connections")
          .upsert(
            {
              user_id: userId,
              provider,
              status: mappedStatus,
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "user_id,provider" }
          );

        if (updateError) {
          console.error("Failed to update connection status", updateError);
        }
      }

      await logAuditEvent(client, {
        userId,
        action: `akahu.account.${webhookCode?.toLowerCase() ?? "update"}`,
        metadata: { accountId, accountStatus, provider },
      });
      break;
    }

    case "TRANSACTION": {
      // Transaction events - could trigger cache invalidation
      console.log(`Akahu TRANSACTION:${webhookCode} event for user ${userId}`);

      await logAuditEvent(client, {
        userId,
        action: `akahu.transaction.${webhookCode?.toLowerCase() ?? "update"}`,
        metadata: { webhookCode },
      });
      break;
    }

    default: {
      // Generic handler for other event types
      const status = payload.connection?.status ?? payload.data?.status ?? null;
      const provider = payload.connection?.provider ?? payload.data?.provider ?? "Akahu";

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
            { onConflict: "user_id,provider" }
          );

        if (updateError) {
          console.error("Failed to update connection from webhook", updateError);
        }
      }

      await logAuditEvent(client, {
        userId,
        action: `akahu.webhook.${webhookType}`,
        metadata: { provider, status, webhookCode },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
