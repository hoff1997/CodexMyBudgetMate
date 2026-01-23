/**
 * Household Types
 * Multi-adult household support for family budget management
 */

export type HouseholdRole = "owner" | "partner" | "member";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  display_name: string | null;
  joined_at: string;
  invited_by: string | null;
  // Joined profile info
  profile?: {
    full_name: string | null;
    preferred_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface HouseholdInvitation {
  id: string;
  household_id: string;
  email: string;
  invited_by: string;
  role: HouseholdRole;
  token: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  // Joined info
  household?: Household;
  inviter?: {
    full_name: string | null;
    preferred_name: string | null;
  };
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
  children_count?: number;
}

export interface CreateHouseholdRequest {
  name: string;
}

export interface InvitePartnerRequest {
  email: string;
  role?: HouseholdRole;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface HouseholdSummary {
  household: Household | null;
  role: HouseholdRole | null;
  members: HouseholdMember[];
  pendingInvitations: HouseholdInvitation[];
  hasPartner: boolean;
}

// Type guard
export function isHouseholdOwner(member: HouseholdMember | null): boolean {
  return member?.role === "owner";
}

export function isHouseholdPartner(member: HouseholdMember | null): boolean {
  return member?.role === "partner";
}

export function canManageHousehold(member: HouseholdMember | null): boolean {
  return member?.role === "owner" || member?.role === "partner";
}
