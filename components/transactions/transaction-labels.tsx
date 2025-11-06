"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Plus, Tag, Check } from "lucide-react";
import { toast } from "sonner";

interface Label {
  id: string;
  name: string;
  colour: string | null;
}

interface TransactionLabelsProps {
  transactionId: string;
  className?: string;
}

export default function TransactionLabels({
  transactionId,
  className,
}: TransactionLabelsProps) {
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const queryClient = useQueryClient();

  const { data: allLabelsData } = useQuery<{ labels: Label[] }>({
    queryKey: ["/api/labels"],
    queryFn: async () => {
      const response = await fetch("/api/labels");
      if (!response.ok) throw new Error("Failed to fetch labels");
      return response.json();
    },
  });

  const allLabels = allLabelsData?.labels ?? [];

  const { data: transactionLabelsData } = useQuery<{ labels: Label[] }>({
    queryKey: ["/api/transactions", transactionId, "labels"],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${transactionId}/labels`);
      if (!response.ok) throw new Error("Failed to fetch transaction labels");
      return response.json();
    },
  });

  const transactionLabels = transactionLabelsData?.labels ?? [];

  const updateLabelsMutation = useMutation({
    mutationFn: async (labelNames: string[]) => {
      const response = await fetch(`/api/transactions/${transactionId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: labelNames, mode: "replace" }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update labels");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/transactions", transactionId, "labels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/transactions"],
      });
      toast.success("Labels updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update labels");
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data: { name: string; colour: string }) => {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create label");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      setNewLabelName("");
      setSelectedColor("#3b82f6");
      toast.success("Label created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create label");
    },
  });

  const handleLabelToggle = (labelName: string) => {
    const currentLabelNames = transactionLabels.map((l) => l.name);
    const isSelected = currentLabelNames.includes(labelName);

    const newLabelNames = isSelected
      ? currentLabelNames.filter((name) => name !== labelName)
      : [...currentLabelNames, labelName];

    updateLabelsMutation.mutate(newLabelNames);
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabelMutation.mutate({
        name: newLabelName.trim(),
        colour: selectedColor,
      });
    }
  };

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        {transactionLabels.map((label) => (
          <Badge
            key={label.id}
            variant="secondary"
            style={{
              backgroundColor: `${label.colour}20`,
              color: label.colour ?? "#3b82f6",
              borderColor: label.colour ?? "#3b82f6",
            }}
            className="text-xs"
          >
            {label.name}
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
              <Tag className="h-3 w-3 mr-1" />
              Labels
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Search labels..." />
              <CommandList>
                <CommandEmpty>No labels found.</CommandEmpty>
                <CommandGroup>
                  {allLabels.map((label) => {
                    const isSelected = transactionLabels.some(
                      (tl) => tl.id === label.id,
                    );
                    return (
                      <CommandItem
                        key={label.id}
                        onSelect={() => handleLabelToggle(label.name)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.colour ?? "#3b82f6" }}
                          />
                          <span>{label.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <div className="p-2 space-y-2">
                    <UILabel htmlFor="new-label" className="text-sm font-medium">
                      Create New Label
                    </UILabel>
                    <Input
                      id="new-label"
                      placeholder="Label name"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newLabelName.trim()) {
                          e.preventDefault();
                          handleCreateLabel();
                        }
                      }}
                    />
                    <div className="flex items-center gap-1">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedColor === color
                              ? "border-foreground"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          type="button"
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCreateLabel}
                      disabled={
                        !newLabelName.trim() || createLabelMutation.isPending
                      }
                      className="w-full h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Label
                    </Button>
                  </div>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
