"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

interface CalendarConnectionCardProps {
  connection: {
    id: string;
    calendar_name: string;
    owner_name: string;
    color_hex: string;
    is_visible: boolean;
  };
  onToggleVisibility: (id: string, visible: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CalendarConnectionCard({
  connection,
  onToggleVisibility,
  onDelete,
}: CalendarConnectionCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggleVisibility(connection.id, checked);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${connection.calendar_name}" from the hub?`)) return;
    setDeleting(true);
    try {
      await onDelete(connection.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full shrink-0"
          style={{ backgroundColor: connection.color_hex }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-dark truncate">
            {connection.calendar_name}
          </h3>
          <p className="text-sm text-text-medium truncate">
            {connection.owner_name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-text-medium" />
          ) : (
            <>
              <Switch
                checked={connection.is_visible}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
              {connection.is_visible ? (
                <Eye className="h-4 w-4 text-sage" />
              ) : (
                <EyeOff className="h-4 w-4 text-text-light" />
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-text-light hover:text-red-600"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
