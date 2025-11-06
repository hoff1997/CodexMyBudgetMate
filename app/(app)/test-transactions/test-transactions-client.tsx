"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import NewTransactionDialog from "@/components/transactions/new-transaction-dialog";
import { EnhancedTransactionDialog } from "@/components/transactions/enhanced-transaction-dialog";

interface Props {
  userId: string;
  username: string;
}

export function TestTransactionsClient({ userId, username }: Props) {
  const router = useRouter();
  const [newDialogOpen, setNewDialogOpen] = useState(false);

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
            <h1 className="text-3xl font-bold">Transaction Dialogs Test</h1>
            <p className="text-muted-foreground">
              Test page for New and Enhanced Transaction Dialog components
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
                  <strong>Note:</strong> Make sure you have envelopes and accounts created before testing the transaction dialogs.
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="font-medium mb-2">New Transaction Dialog Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Quick add form (simplified)</li>
                  <li>Merchant memory with auto-suggestions</li>
                  <li>Single envelope assignment</li>
                  <li>Receipt upload (optional)</li>
                  <li>Description field (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Enhanced Transaction Dialog Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Full transaction editing with all fields</li>
                  <li>Transaction splitting across multiple envelopes</li>
                  <li>Visual allocation tracking (remaining/over allocated)</li>
                  <li>Status selection (pending/approved)</li>
                  <li>Calendar date picker</li>
                  <li>Description textarea</li>
                  <li>Receipt upload</li>
                  <li>Real-time validation of split amounts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">API Endpoints Used:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><code>GET /api/envelopes</code> - Fetch user&apos;s envelopes</li>
                  <li><code>GET /api/accounts</code> - Fetch user&apos;s accounts</li>
                  <li><code>GET /api/merchant-memory?merchant=...</code> - Get envelope suggestion</li>
                  <li><code>POST /api/transactions</code> - Create new transaction</li>
                  <li><code>PATCH /api/transactions/[id]</code> - Update transaction</li>
                  <li><code>POST /api/transactions/[id]/split</code> - Save transaction splits</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Current User:</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>ID:</strong> {userId}
                  <br />
                  <strong>Username:</strong> {username}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Dialogs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Transaction Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>New Transaction Dialog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simple, quick-entry dialog for adding transactions with a single envelope assignment.
              </p>

              <Button onClick={() => setNewDialogOpen(true)}>
                Open New Transaction Dialog
              </Button>

              <NewTransactionDialog
                open={newDialogOpen}
                onOpenChange={setNewDialogOpen}
              />
            </CardContent>
          </Card>

          {/* Enhanced Transaction Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Transaction Dialog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Advanced dialog with transaction splitting, full editing capabilities, and visual allocation tracking.
              </p>

              <EnhancedTransactionDialog title="Add Transaction with Splits">
                <Button>Open Enhanced Transaction Dialog</Button>
              </EnhancedTransactionDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
