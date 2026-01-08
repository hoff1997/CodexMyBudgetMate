"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { WishlistList, AddWishlistDialog } from "@/components/wishlist";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { RemyTip } from "@/components/onboarding/remy-tip";
import type { WishlistItemWithEnvelope, WishlistItem } from "@/lib/types/wishlist";

const HELP_CONTENT = {
  coaching: [
    "Your wishlist is a great place to park ideas before committing to save for them.",
    "Ordering your wishlist by priority helps you focus on what matters most.",
    "When you're ready to commit, convert an item to a Goal and start saving!",
  ],
  tips: [
    "Add a link to the product so you can easily find it later",
    "Include the price so you know exactly how much to save",
    "Drag items up or down to reorder by priority",
    "Only convert to a Goal when you're truly committed to saving",
  ],
  features: [
    "Add unlimited wishlist items with photos, links, and prices",
    "Drag and drop to reorder items by priority",
    "Convert any item to a savings Goal with one click",
    "Track which items you've already converted",
    "Items stay visible after conversion so you can see your progress",
  ],
  faqs: [
    {
      question: "What happens when I convert an item to a Goal?",
      answer:
        "A new envelope is created in your Goals category with the item's price as the target amount. The wishlist item stays visible but is marked as 'Converted' with a link to your goal.",
    },
    {
      question: "Can I delete a wishlist item?",
      answer:
        "Yes! Click the delete button on any item. If it was converted to a Goal, the goal envelope will remain - only the wishlist item is removed.",
    },
    {
      question: "How do I reorder my wishlist?",
      answer:
        "Grab the drag handle (six dots) on any item and drag it up or down to change its position. Your order is saved automatically.",
    },
    {
      question: "Can I edit an item after adding it?",
      answer:
        "Yes, click the edit button on any item to update its name, description, price, image, or link.",
    },
  ],
};

type FilterType = "all" | "active" | "converted";

interface WishlistClientProps {
  initialItems: WishlistItemWithEnvelope[];
}

export function WishlistClient({ initialItems }: WishlistClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItemWithEnvelope[]>(initialItems);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter items based on selected filter
  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "active") return item.status === "active";
    if (filter === "converted") return item.status === "converted";
    return true;
  });

  // Stats
  const activeCount = items.filter((i) => i.status === "active").length;
  const convertedCount = items.filter((i) => i.status === "converted").length;
  const totalValue = items
    .filter((i) => i.status === "active")
    .reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

  const handleAddOrEdit = async (data: {
    name: string;
    description: string | null;
    estimated_cost: number | null;
    image_url: string | null;
    link_url: string | null;
  }) => {
    try {
      if (editingItem) {
        // Update existing item
        const res = await fetch(`/api/wishlist/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update item");
        }

        const { item } = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, ...item } : i))
        );
        toast.success("Item updated");
      } else {
        // Create new item
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add item");
        }

        const { item } = await res.json();
        setItems((prev) => [...prev, item]);
        toast.success("Added to wishlist");
      }

      setEditingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      throw error; // Re-throw to keep dialog open
    }
  };

  const handleReorder = async (reorderedItems: WishlistItemWithEnvelope[]) => {
    // Optimistic update
    setItems(reorderedItems);

    // Save new order to server
    const orderData = reorderedItems.map((item, index) => ({
      id: item.id,
      priority: index,
    }));

    try {
      const res = await fetch("/api/wishlist/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderData }),
      });

      if (!res.ok) {
        throw new Error("Failed to save order");
      }
    } catch (error) {
      toast.error("Failed to save order");
      // Revert to original order
      setItems(initialItems);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this from your wishlist?")) {
      return;
    }

    setDeletingId(id);

    try {
      const res = await fetch(`/api/wishlist/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete item");
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvert = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (
      !confirm(
        `Convert "${item.name}" to a savings goal?\n\nThis will create a new envelope in your Goals category with a target of $${(item.estimated_cost || 0).toFixed(2)}.`
      )
    ) {
      return;
    }

    setConvertingId(id);

    try {
      const res = await fetch(`/api/wishlist/${id}/convert`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to convert");
      }

      const { wishlistItem, envelopeId, message } = await res.json();

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "converted" as const,
                converted_envelope_id: envelopeId,
                converted_envelope: wishlistItem.converted_envelope,
              }
            : i
        )
      );

      toast.success(message, {
        action: {
          label: "View Goal",
          onClick: () => router.push(`/allocation?highlight=${envelopeId}`),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to convert");
    } finally {
      setConvertingId(null);
    }
  };

  const handleEdit = (item: WishlistItemWithEnvelope) => {
    setEditingItem(item);
    setShowAddDialog(true);
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Wishlist</h1>
          <p className="text-text-medium">
            Track things you want and convert them to savings goals
          </p>
        </div>
        <RemyHelpButton title="Wishlist" content={HELP_CONTENT} />
      </div>

      {/* Stats Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-text-dark">{activeCount}</div>
              <div className="text-sm text-text-medium">Active Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-sage">{convertedCount}</div>
              <div className="text-sm text-text-medium">Goals Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-text-dark">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-text-medium">Total Value</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items ({items.length})</SelectItem>
            <SelectItem value="active">Active ({activeCount})</SelectItem>
            <SelectItem value="converted">Converted ({convertedCount})</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            setEditingItem(null);
            setShowAddDialog(true);
          }}
          className="bg-sage hover:bg-sage-dark"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <Card className="bg-sage-very-light border-sage-light">
          <CardContent className="py-12 text-center">
            <Gift className="h-16 w-16 text-sage mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-dark mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-text-medium mb-6 max-w-md mx-auto">
              Add things you want to buy and when you're ready, convert them to
              savings goals to start saving up!
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filtered Empty State */}
      {items.length > 0 && filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-text-medium">
              No {filter === "active" ? "active" : "converted"} items found.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Wishlist Items */}
      {filteredItems.length > 0 && (
        <WishlistList
          items={filteredItems}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConvert={handleConvert}
          convertingId={convertingId}
          deletingId={deletingId}
        />
      )}

      {/* Remy Tip for first-time users */}
      {items.length > 0 && items.length <= 3 && activeCount > 0 && (
        <RemyTip pose="encouraging">
          Drag items to reorder by priority. When you're ready to commit to saving
          for something, click "Make it a Goal" to create a savings envelope!
        </RemyTip>
      )}

      {/* Add/Edit Dialog */}
      <AddWishlistDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingItem(null);
        }}
        onSave={handleAddOrEdit}
        editItem={editingItem}
      />
    </div>
  );
}
