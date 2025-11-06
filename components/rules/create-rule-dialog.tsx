"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, GitBranch } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  merchant_name: string;
}

interface Envelope {
  id: string;
  name: string;
  icon?: string | null;
}

interface CreateRuleDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRuleDialog({
  transaction,
  open,
  onOpenChange,
}: CreateRuleDialogProps) {
  const [pattern, setPattern] = useState(transaction.merchant_name);
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const [matchType, setMatchType] = useState<string>("contains");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [errors, setErrors] = useState<{ pattern?: string; envelopeId?: string }>({});

  const queryClient = useQueryClient();

  const { data: envelopesData } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const envelopes = envelopesData?.envelopes ?? [];

  const createRuleMutation = useMutation({
    mutationFn: async (data: {
      pattern: string;
      envelopeId: string;
      matchType: string;
      caseSensitive: boolean;
    }) => {
      const response = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create rule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/category-rules"] });
      onOpenChange(false);
      // Reset form
      setPattern(transaction.merchant_name);
      setEnvelopeId("");
      setMatchType("contains");
      setCaseSensitive(false);
      setErrors({});

      toast.success("Rule created", {
        description: `Future transactions from "${transaction.merchant_name}" will be automatically assigned to the selected envelope.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to create rule. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { pattern?: string; envelopeId?: string } = {};
    if (!pattern.trim()) {
      newErrors.pattern = "Pattern is required";
    }
    if (!envelopeId) {
      newErrors.envelopeId = "Envelope is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createRuleMutation.mutate({
      pattern: pattern.trim(),
      envelopeId,
      matchType,
      caseSensitive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <DialogTitle>Create Merchant Rule</DialogTitle>
          </div>
          <DialogDescription>
            Create an automatic rule to assign transactions from this merchant to
            a specific envelope.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pattern Input */}
          <div className="space-y-2">
            <Label htmlFor="pattern">Merchant Pattern</Label>
            <Input
              id="pattern"
              value={pattern}
              onChange={(e) => {
                setPattern(e.target.value);
                setErrors((prev) => ({ ...prev, pattern: undefined }));
              }}
              placeholder="Merchant name or pattern..."
            />
            {errors.pattern && (
              <p className="text-sm text-destructive">{errors.pattern}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This pattern will be used to match merchant names automatically.
            </p>
          </div>

          {/* Match Type Select */}
          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select value={matchType} onValueChange={setMatchType}>
              <SelectTrigger id="matchType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="exact">Exact Match</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {matchType === "contains" && "Matches if merchant name contains this pattern"}
              {matchType === "starts_with" && "Matches if merchant name starts with this pattern"}
              {matchType === "exact" && "Matches only if merchant name is exactly this pattern"}
            </p>
          </div>

          {/* Case Sensitive Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="caseSensitive"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(checked === true)}
            />
            <Label
              htmlFor="caseSensitive"
              className="text-sm font-normal cursor-pointer"
            >
              Case sensitive matching
            </Label>
          </div>

          {/* Envelope Select */}
          <div className="space-y-2">
            <Label htmlFor="envelopeId">Default Envelope</Label>
            <Select
              value={envelopeId}
              onValueChange={(value) => {
                setEnvelopeId(value);
                setErrors((prev) => ({ ...prev, envelopeId: undefined }));
              }}
            >
              <SelectTrigger id="envelopeId">
                <SelectValue placeholder="Select envelope..." />
              </SelectTrigger>
              <SelectContent>
                {envelopes.map((envelope) => (
                  <SelectItem key={envelope.id} value={envelope.id}>
                    {envelope.icon && `${envelope.icon} `}
                    {envelope.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.envelopeId && (
              <p className="text-sm text-destructive">{errors.envelopeId}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRuleMutation.isPending}>
              {createRuleMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Rule
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
