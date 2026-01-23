"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvitationDetails, useAcceptInvitation, useHousehold } from "@/lib/hooks/use-household";
import { Home, Users, Check, AlertTriangle, Loader2 } from "lucide-react";

interface JoinHouseholdClientProps {
  token: string | null;
}

export function JoinHouseholdClient({ token }: JoinHouseholdClientProps) {
  const router = useRouter();
  const { household: currentHousehold, isLoading: householdLoading } = useHousehold();
  const { data: invitation, isLoading, error } = useInvitationDetails(token);
  const acceptInvitation = useAcceptInvitation();

  const handleAccept = async () => {
    if (!token) return;

    try {
      await acceptInvitation.mutateAsync(token);
      router.push("/dashboard");
    } catch (err) {
      // Error is handled by the mutation
    }
  };

  const handleDecline = () => {
    router.push("/dashboard");
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gold mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-text-dark mb-2">
                Invalid Invitation Link
              </h2>
              <p className="text-text-medium mb-4">
                This link appears to be invalid or missing a token.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading || householdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-sage" />
              <p className="mt-4 text-text-medium">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already in a household
  if (currentHousehold) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Home className="h-12 w-12 text-sage mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-text-dark mb-2">
                Already in a Household
              </h2>
              <p className="text-text-medium mb-4">
                You're already a member of "{currentHousehold.name}".
                You'll need to leave your current household before joining another one.
              </p>
              <Button onClick={() => router.push("/settings")}>
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or expired
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-text-dark mb-2">
                Invitation Not Found
              </h2>
              <p className="text-text-medium mb-4">
                {error instanceof Error
                  ? error.message
                  : "This invitation may have expired or been cancelled."}
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-sage-dark" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invitation.inviter_name || "Someone"} has invited you to join their household
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-sage-very-light border border-sage-light text-center">
            <p className="text-sm text-text-medium mb-1">Household</p>
            <p className="text-xl font-semibold text-text-dark">
              {invitation.household_name || "Family Household"}
            </p>
          </div>

          <div className="text-center text-sm text-text-medium">
            <p>You'll be added as a <strong className="text-text-dark">{invitation.role}</strong></p>
            <p className="mt-1">
              This invitation expires on{" "}
              {new Date(invitation.expires_at).toLocaleDateString()}
            </p>
          </div>

          {acceptInvitation.error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {acceptInvitation.error instanceof Error
                ? acceptInvitation.error.message
                : "Failed to accept invitation"}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button
              className="flex-1 bg-sage hover:bg-sage-dark"
              onClick={handleAccept}
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accept & Join
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
