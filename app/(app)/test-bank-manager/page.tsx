import { createClient } from "@/lib/supabase/server";
import { TestBankManagerClient } from "./test-bank-manager-client";

export const metadata = {
  title: "Bank Connection Manager Test | My Budget Mate",
  description: "Test page for the Bank Connection Manager component with Akahu integration",
};

export default async function TestBankManagerPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-6 max-w-6xl">
          <p className="text-center text-muted-foreground">
            Please log in to test the Bank Connection Manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TestBankManagerClient
      userId={session.user.id}
      username={session.user.email || "User"}
    />
  );
}
