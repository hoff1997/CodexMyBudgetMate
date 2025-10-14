"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4">
          <form
            className="w-full max-w-2xl space-y-4 rounded-3xl border bg-background p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              if (!file) {
                setError("Choose a CSV file to import");
                return;
              }
              setLoading(true);
              setError(null);
              setTimeout(() => {
                setLoading(false);
                onOpenChange(false);
                setFile(null);
              }, 1500);
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-secondary">Import transactions via CSV</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Future sprint: map columns and push to Supabase. For now this mirrors the Replit modal UI.
            </Dialog.Description>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Upload bank CSV exports (ASB, ANZ, BNZ, and more). Duplicate detection and memo capture
                  will run after import.
                </p>
                <Input type="file" accept="text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                {file ? <p className="text-xs text-muted-foreground">Selected: {file.name}</p> : null}
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-secondary">Tips:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Ensure headers include date, description, and amount.</li>
                  <li>Debit amounts should be negative, credits positive.</li>
                  <li>Bank memo and reference fields will show beside each transaction.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Importing…" : "Import CSV"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
