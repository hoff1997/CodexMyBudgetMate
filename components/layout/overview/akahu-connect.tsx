"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  hasConnection: boolean;
  connectUrl?: string;
}

export function AkahuConnect({ hasConnection, connectUrl }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!connectUrl) {
      toast.error("Akahu link unavailable. Check environment variables.");
      return;
    }
    setLoading(true);
    window.location.href = connectUrl;
  };

  if (hasConnection) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        Bank connection active. Transactions will sync every 15 minutes once the webhook job is configured.
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={loading}>
      {loading ? "Redirecting to Akahu…" : "Connect your bank with Akahu"}
    </Button>
  );
}
