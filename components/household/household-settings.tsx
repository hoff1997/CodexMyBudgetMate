"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHousehold } from "@/lib/hooks/use-household";
import { Users, UserPlus, Mail, Copy, Check, LogOut, Home, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export function HouseholdSettings() {
  const {
    household,
    role,
    members,
    pendingInvitations,
    hasPartner,
    isLoading,
    createHousehold,
    leaveHousehold,
    invitePartner,
    cancelInvitation,
  } = useHousehold();

  const [householdName, setHouseholdName] = useState("Our Household");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateHousehold = async () => {
    try {
      setError(null);
      await createHousehold.mutateAsync(householdName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create household");
    }
  };

  const handleInvitePartner = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setError(null);
      const result = await invitePartner.mutateAsync({ email: inviteEmail.trim() });
      setInviteLink(result.inviteLink);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    const fullUrl = `${window.location.origin}${inviteLink}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveHousehold = async () => {
    try {
      setError(null);
      await leaveHousehold.mutateAsync();
      setShowLeaveDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave household");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not in a household yet
  if (!household) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Create Your Household
          </CardTitle>
          <CardDescription>
            Set up a household to share budgets and lists with your partner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="household-name">Household Name</Label>
            <Input
              id="household-name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="e.g., The Smiths"
            />
          </div>
          <Button
            onClick={handleCreateHousehold}
            disabled={createHousehold.isPending}
            className="bg-sage hover:bg-sage-dark"
          >
            {createHousehold.isPending ? "Creating..." : "Create Household"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Household Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {household.name}
              </CardTitle>
              <CardDescription>
                {hasPartner ? "You and your partner" : "Just you for now"}
              </CardDescription>
            </div>
            <Badge variant={role === "owner" ? "default" : "secondary"}>
              {role === "owner" ? "Owner" : role === "partner" ? "Partner" : "Member"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-text-medium">Household Members</h4>
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-silver-light/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {(member.profile?.preferred_name || member.profile?.full_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-text-dark">
                    {member.display_name ||
                      member.profile?.preferred_name ||
                      member.profile?.full_name ||
                      "Unknown"}
                  </p>
                  <p className="text-sm text-text-medium capitalize">{member.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-text-medium">Pending Invitations</h4>
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gold-light/30 border border-gold-light"
                >
                  <Mail className="h-5 w-5 text-gold" />
                  <div className="flex-1">
                    <p className="font-medium text-text-dark">{invitation.email}</p>
                    <p className="text-sm text-text-medium">
                      Expires{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvitation.mutate(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Partner */}
      {!hasPartner && (role === "owner" || role === "partner") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Your Partner
            </CardTitle>
            <CardDescription>
              Send an invitation to add your partner to the household
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@email.com"
                className="flex-1"
              />
              <Button
                onClick={handleInvitePartner}
                disabled={invitePartner.isPending || !inviteEmail.trim()}
                className="bg-sage hover:bg-sage-dark"
              >
                {invitePartner.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>

            {inviteLink && (
              <div className="p-4 rounded-lg bg-sage-very-light border border-sage-light">
                <p className="text-sm text-text-medium mb-2">
                  Invitation sent! You can also share this link:
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}${inviteLink}`}
                    className="flex-1 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Household */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowLeaveDialog(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave Household
          </Button>
        </CardContent>
      </Card>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Household?</AlertDialogTitle>
            <AlertDialogDescription>
              {role === "owner" && members.length > 1
                ? "You are the owner. Transfer ownership to another member before leaving."
                : "Are you sure you want to leave this household? You'll need a new invitation to rejoin."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveHousehold}
              disabled={role === "owner" && members.length > 1}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Household
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
