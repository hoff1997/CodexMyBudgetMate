"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import BankConnectionManager from "@/components/bank/bank-connection-manager";

interface Props {
  userId: string;
  username: string;
}

export function TestBankManagerClient({ userId, username }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold">Bank Connection Manager Test</h1>
            <p className="text-muted-foreground">
              Test page for the Bank Connection Manager component with Akahu integration
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> To test the full OAuth flow, you need Akahu API credentials configured in your environment variables:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><code>AKAHU_APP_TOKEN</code></li>
                    <li><code>AKAHU_CLIENT_ID</code></li>
                    <li><code>AKAHU_CLIENT_SECRET</code></li>
                    <li><code>AKAHU_REDIRECT_URI</code></li>
                    <li><code>NEXT_PUBLIC_AKAHU_AUTH_URL</code></li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="font-medium mb-2">Features to Test:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Connect Bank button (redirects to Akahu OAuth)</li>
                  <li>View connected bank accounts with status indicators</li>
                  <li>Manual sync trigger (refresh button)</li>
                  <li>Disconnect functionality</li>
                  <li>Settings dialog with 4 tabs:
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li>Sync Settings (frequency, duplicate detection)</li>
                      <li>Account Selection (filter by account type)</li>
                      <li>Security (connection status, privacy settings)</li>
                      <li>Advanced (import/export, health monitoring, danger zone)</li>
                    </ul>
                  </li>
                  <li>Last sync timestamp display</li>
                  <li>Connection health indicators</li>
                  <li>Optional 2FA validation flow</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">API Endpoints Used:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><code>GET /api/bank-connections</code> - Fetch user&apos;s bank connections</li>
                  <li><code>POST /api/akahu/connection</code> (action: refresh) - Refresh connection</li>
                  <li><code>POST /api/akahu/connection</code> (action: disconnect) - Disconnect bank</li>
                  <li><code>POST /api/akahu/link</code> - OAuth callback handler</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Connection Manager Component */}
        <BankConnectionManager userId={userId} username={username} />
      </div>
    </div>
  );
}
