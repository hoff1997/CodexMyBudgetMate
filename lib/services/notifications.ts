import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "system_announcement"
  | "bill_reminder"
  | "goal_progress"
  | "budget_alert"
  | "kids_invoice_submitted"
  | "kids_invoice_paid"
  | "kids_chore_approved"
  | "kids_transfer_request"
  | "kids_transfer_decision";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  priority?: NotificationPriority;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a notification for a user using an admin/service Supabase client.
 * This bypasses the user-self-only limitation in the API for internal use cases.
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const {
    userId,
    type,
    title,
    message,
    icon,
    priority = "medium",
    relatedEntityType,
    relatedEntityId,
    actionUrl,
    metadata = {},
  } = params;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      icon,
      priority,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      action_url: actionUrl,
      metadata,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return { success: false, error: error.message };
  }

  return { success: true, notificationId: data?.id };
}

/**
 * Kids Module notification helpers
 */
export const KidsNotifications = {
  /**
   * Notify parent when child submits an invoice
   */
  async invoiceSubmitted(
    supabase: SupabaseClient,
    parentUserId: string,
    childName: string,
    invoiceId: string,
    totalAmount: number
  ) {
    return createNotification(supabase, {
      userId: parentUserId,
      type: "kids_invoice_submitted",
      title: "Invoice submitted",
      message: `${childName} has submitted an invoice for $${totalAmount.toFixed(2)}`,
      icon: "📄",
      priority: "medium",
      relatedEntityType: "kid_invoice",
      relatedEntityId: invoiceId,
      actionUrl: `/kids/invoices`,
    });
  },

  /**
   * Notify child when their invoice is paid
   */
  async invoicePaid(
    supabase: SupabaseClient,
    parentUserId: string, // Parent's user_id (child uses same account)
    childProfileId: string,
    childName: string,
    totalAmount: number
  ) {
    return createNotification(supabase, {
      userId: parentUserId,
      type: "kids_invoice_paid",
      title: "Invoice paid!",
      message: `${childName}'s invoice for $${totalAmount.toFixed(2)} has been paid`,
      icon: "💰",
      priority: "medium",
      relatedEntityType: "child_profile",
      relatedEntityId: childProfileId,
      actionUrl: `/kids/${childProfileId}/dashboard`,
      metadata: { childProfileId, forChild: true },
    });
  },

  /**
   * Notify parent about a new transfer request from child
   */
  async transferRequested(
    supabase: SupabaseClient,
    parentUserId: string,
    childName: string,
    childProfileId: string,
    requestId: string,
    amount: number,
    fromEnvelope: string,
    toEnvelope: string
  ) {
    return createNotification(supabase, {
      userId: parentUserId,
      type: "kids_transfer_request",
      title: "Transfer request",
      message: `${childName} wants to move $${amount.toFixed(2)} from ${fromEnvelope} to ${toEnvelope}`,
      icon: "🔄",
      priority: "medium",
      relatedEntityType: "transfer_request",
      relatedEntityId: requestId,
      actionUrl: `/kids/${childProfileId}/dashboard`,
    });
  },

  /**
   * Notify about transfer request decision (shown to parent, indicates child's request outcome)
   */
  async transferDecision(
    supabase: SupabaseClient,
    parentUserId: string,
    childName: string,
    childProfileId: string,
    approved: boolean,
    amount: number
  ) {
    return createNotification(supabase, {
      userId: parentUserId,
      type: "kids_transfer_decision",
      title: approved ? "Transfer approved" : "Transfer declined",
      message: approved
        ? `${childName}'s transfer of $${amount.toFixed(2)} was approved`
        : `${childName}'s transfer of $${amount.toFixed(2)} was declined`,
      icon: approved ? "✅" : "❌",
      priority: "low",
      relatedEntityType: "child_profile",
      relatedEntityId: childProfileId,
      metadata: { childProfileId, forChild: true },
    });
  },

  /**
   * Notify about chore approval
   */
  async choreApproved(
    supabase: SupabaseClient,
    parentUserId: string,
    childName: string,
    childProfileId: string,
    choreName: string,
    amount: number | null
  ) {
    const message = amount
      ? `${childName}'s "${choreName}" chore was approved (+$${amount.toFixed(2)})`
      : `${childName}'s "${choreName}" chore was approved`;

    return createNotification(supabase, {
      userId: parentUserId,
      type: "kids_chore_approved",
      title: "Chore approved",
      message,
      icon: "⭐",
      priority: "low",
      relatedEntityType: "child_profile",
      relatedEntityId: childProfileId,
      metadata: { childProfileId, forChild: true },
    });
  },
};
