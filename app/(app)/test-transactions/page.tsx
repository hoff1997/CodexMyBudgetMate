import { createClient } from "@/lib/supabase/server";
import { TestTransactionsClient } from "./test-transactions-client";

export const metadata = {
  title: "Transaction Dialogs Test | My Budget Mate",
  description: "Test page for New Transaction Dialog component",
};

export default async function TestTransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-6 max-w-6xl">
          <p className="text-center text-muted-foreground">
            Please log in to test the Transaction Dialogs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TestTransactionsClient
      userId={user.id}
      username={user.email || "User"}
    />
  );
}
