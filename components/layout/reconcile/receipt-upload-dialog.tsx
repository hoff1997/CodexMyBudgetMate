"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  transactionId: string | null;
}

export function ReceiptUploadDialog({ open, onOpenChange, transactionId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4">
          <form
            className="w-full max-w-md space-y-4 rounded-3xl border bg-background p-6 shadow-xl"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!transactionId) {
                setError("Open a transaction to attach a receipt");
                return;
              }
              if (!file) {
                setError("Select a file to upload");
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                setError("File must be 5MB or less");
                return;
              }
              if (!/(pdf|image)/i.test(file.type)) {
                setError("Only image or PDF files are allowed");
                return;
              }

              setLoading(true);
              setError(null);

              try {
                const presignResponse = await fetch(
                  `/api/transactions/${transactionId}/receipt`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
                  },
                );

                if (!presignResponse.ok) {
                  const payload = await presignResponse
                    .json()
                    .catch(() => ({ error: "Unable to upload receipt" }));
                  throw new Error(payload.error ?? "Unable to upload receipt");
                }

                const { uploadUrl, receiptPath, headers } = (await presignResponse.json()) as {
                  uploadUrl: string;
                  receiptPath: string;
                  headers?: Record<string, string>;
                };

                const uploadHeaders: Record<string, string> = {
                  "Content-Type": file.type,
                  ...(headers ?? {}),
                };

                const upload = await fetch(uploadUrl, {
                  method: "PUT",
                  headers: uploadHeaders,
                  body: file,
                });

                if (!upload.ok) {
                  throw new Error("Storage rejected the file upload");
                }

                const finalize = await fetch(`/api/transactions/${transactionId}/receipt`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ receiptPath }),
                });

                if (!finalize.ok) {
                  throw new Error("Unable to attach receipt to transaction");
                }

                toast.success("Receipt uploaded");
                onOpenChange(false);
                setFile(null);
                router.refresh();
              } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "Unable to upload receipt");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-secondary">Upload receipt</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Attach a PDF or image under 5MB. Files are stored securely in Supabase Storage and linked to the transaction automatically.
            </Dialog.Description>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="text-xs text-muted-foreground">
                  <p>Selected: {file.name}</p>
                  <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Uploading…" : "Upload receipt"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
