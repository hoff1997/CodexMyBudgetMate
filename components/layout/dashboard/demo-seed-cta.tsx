"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DemoSeedCtaProps {
  disabled?: boolean;
}

export function DemoSeedCta({ disabled = false }: DemoSeedCtaProps) {
  const [isPending, startTransition] = useTransition();
  const [seeded, setSeeded] = useState(false);

  const handleSeed = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/seed", { method: "POST" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Failed to seed demo data" }));
          throw new Error(payload.error ?? "Failed to seed demo data");
        }
        toast.success("Demo data added to your account");
        setSeeded(true);
        window.location.reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to add demo data. Please try again shortly.";
        toast.error(message);
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleSeed}
      disabled={disabled || isPending || seeded}
    >
      {seeded ? "Demo data ready" : isPending ? "Adding demo data…" : "Add demo data"}
    </Button>
  );
}
