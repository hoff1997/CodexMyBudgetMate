"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Gift, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { WishlistList, AddWishlistDialog } from "@/components/wishlist";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { RemyTip } from "@/components/onboarding/remy-tip";
import type { TeenWishlistItem } from "@/lib/types/wishlist";

// Kid-friendly help content
const HELP_CONTENT = {
  coaching: [
    "Your wishlist is where you can dream about things you want!",
    "When you're ready to save up for something, tap 'Save for This'.",
    "Putting the most important things at the top helps you decide what to save for first.",
  ],
  tips: [
    "Add a picture so you can see what you're saving for",
    "Include how much it costs so you know your target",
    "Drag items up if they're more important to you",
    "Only start saving when you really want something!",
  ],
  features: [
    "Add things you want with pictures and prices",
    "Drag to put your favourites at the top",
    "Tap 'Save for This' to start a savings goal",
    "See which items you're already saving for",
  ],
  faqs: [
    {
      question: "What does 'Save for This' do?",
      answer: "It creates a new savings goal with the price as your target. You'll see a progress bar as you save up!",
    },
    {
      question: "Can I remove something from my wishlist?",
      answer: "Yes! Tap the bin icon to delete it. If you started saving for it, your goal stays - only the wishlist item goes away.",
    },
    {
      question: "How do I change the order?",
      answer: "Hold and drag the dots on the left side of any item to move it up or down.",
    },
  ],
};

type FilterType = "all" | "active" | "converted";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_emoji: string | null;
  star_balance: number;
}

interface TeenWishlistItemWithGoal extends TeenWishlistItem {
  converted_goal: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
  } | null;
}

interface KidWishlistClientProps {
  child: ChildProfile;
  items: TeenWishlistItemWithGoal[];
}

export function KidWishlistClient({ child, items: initialItems }: KidWishlistClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<TeenWishlistItemWithGoal[]>(initialItems);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TeenWishlistItemWithGoal | null>(null);
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
        const res = await fetch(`/api/kids/${child.id}/wishlist/${editingItem.id}`, {
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
        toast.success("Item updated!");
      } else {
        // Create new item
        const res = await fetch(`/api/kids/${child.id}/wishlist`, {
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
        toast.success("Added to wishlist!");
      }

      setEditingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      throw error; // Re-throw to keep dialog open
    }
  };

  const handleReorder = async (reorderedItems: TeenWishlistItemWithGoal[]) => {
    // Optimistic update
    setItems(reorderedItems);

    // Save new order to server
    const orderData = reorderedItems.map((item, index) => ({
      id: item.id,
      priority: index,
    }));

    try {
      const res = await fetch(`/api/kids/${child.id}/wishlist/reorder`, {
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
      const res = await fetch(`/api/kids/${child.id}/wishlist/${id}`, {
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
        `Start saving for "${item.name}"?\n\nThis will create a new savings goal with a target of $${(item.estimated_cost || 0).toFixed(2)}.`
      )
    ) {
      return;
    }

    setConvertingId(id);

    try {
      const res = await fetch(`/api/kids/${child.id}/wishlist/${id}/convert`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to convert");
      }

      const { wishlistItem, goalId, message } = await res.json();

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "converted" as const,
                converted_goal_id: goalId,
                converted_goal: wishlistItem.converted_goal,
              }
            : i
        )
      );

      toast.success(message, {
        action: {
          label: "View Goal",
          onClick: () => router.push(`/kids/${child.id}/goals`),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to convert");
    } finally {
      setConvertingId(null);
    }
  };

  const handleEdit = (item: TeenWishlistItemWithGoal) => {
    setEditingItem(item);
    setShowAddDialog(true);
  };

  // Map TeenWishlistItemWithGoal to the expected format for WishlistList
  const mappedItems = filteredItems.map((item) => ({
    ...item,
    user_id: child.id, // Use child id as user_id for compatibility
    converted_envelope_id: item.converted_goal_id || null,
    converted_envelope: item.converted_goal
      ? {
          id: item.converted_goal.id,
          name: item.converted_goal.name,
          current_balance: item.converted_goal.current_amount,
          target_amount: item.converted_goal.target_amount,
        }
      : null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <Link
          href={`/kids/${child.id}/dashboard`}
          className="inline-flex items-center gap-2 text-text-medium hover:text-text-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-3xl border-4 border-sage">
              {child.avatar_url ? (
                <Image
                  src={child.avatar_url}
                  alt={child.name}
                  width={64}
                  height={64}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                child.avatar_emoji || "👤"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                {child.name}'s Wishlist
              </h1>
              <p className="text-text-medium">Things I want to save for</p>
            </div>
          </div>
          <RemyHelpButton title="My Wishlist" content={HELP_CONTENT} />
        </div>

        {/* Stats Cards */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-text-dark">{activeCount}</div>
                <div className="text-xs text-text-medium">On My List</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-sage">{convertedCount}</div>
                <div className="text-xs text-text-medium">Saving For</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-text-dark">
                  ${totalValue.toLocaleString()}
                </div>
                <div className="text-xs text-text-medium">Total</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as FilterType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items ({items.length})</SelectItem>
              <SelectItem value="active">On List ({activeCount})</SelectItem>
              <SelectItem value="converted">Saving ({convertedCount})</SelectItem>
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
                Add things you want and when you're ready, start saving for them!
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-sage hover:bg-sage-dark"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Add Something You Want
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filtered Empty State */}
        {items.length > 0 && filteredItems.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-text-medium">
                No {filter === "active" ? "active" : "saving"} items found.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Wishlist Items */}
        {filteredItems.length > 0 && (
          <WishlistList
            items={mappedItems as any} // Type compatibility handled above
            onReorder={handleReorder as any}
            onEdit={handleEdit as any}
            onDelete={handleDelete}
            onConvert={handleConvert}
            convertingId={convertingId}
            deletingId={deletingId}
            convertButtonLabel="Save for This"
            isKidsMode
          />
        )}

        {/* Remy Tip for first-time users */}
        {items.length > 0 && items.length <= 3 && activeCount > 0 && (
          <RemyTip pose="encouraging">
            Drag items to put your favourites at the top. When you're ready to start
            saving, tap "Save for This" to create a goal!
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
          editItem={editingItem as any}
        />
      </div>
    </div>
  );
}
