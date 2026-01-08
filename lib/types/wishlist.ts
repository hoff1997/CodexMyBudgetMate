/**
 * Wishlist Types for My Budget Mate
 * Supports both adult wishlists and teen/kids wishlists
 */

export type WishlistStatus = "active" | "converted" | "purchased";

/**
 * Adult wishlist item
 */
export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  estimated_cost: number | null;
  image_url: string | null;
  link_url: string | null;
  priority: number;
  status: WishlistStatus;
  converted_envelope_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Teen/Kids wishlist item
 */
export interface TeenWishlistItem {
  id: string;
  child_profile_id: string;
  name: string;
  description: string | null;
  estimated_cost: number | null;
  image_url: string | null;
  link_url: string | null;
  priority: number;
  status: WishlistStatus;
  converted_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create/Update wishlist item payload
 */
export interface WishlistItemPayload {
  name: string;
  description?: string | null;
  estimated_cost?: number | null;
  image_url?: string | null;
  link_url?: string | null;
}

/**
 * Reorder payload for drag-and-drop
 */
export interface WishlistReorderPayload {
  items: Array<{
    id: string;
    priority: number;
  }>;
}

/**
 * Convert to goal response
 */
export interface ConvertToGoalResponse {
  success: boolean;
  wishlistItem: WishlistItem | TeenWishlistItem;
  envelopeId?: string;
  goalId?: string;
  message: string;
}

/**
 * Wishlist with converted envelope details (for display)
 */
export interface WishlistItemWithEnvelope extends WishlistItem {
  converted_envelope?: {
    id: string;
    name: string;
    current_balance: number;
    target_amount: number | null;
  } | null;
}

/**
 * Teen wishlist with converted goal details (for display)
 */
export interface TeenWishlistItemWithGoal extends TeenWishlistItem {
  converted_goal?: {
    id: string;
    name: string;
    current_amount: number;
    target_amount: number | null;
  } | null;
}
