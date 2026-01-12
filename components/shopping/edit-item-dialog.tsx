"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  aisle: string | null;
  category_id: string | null;
  estimated_price: number | null;
  notes: string | null;
  checked: boolean;
  photo_url: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShoppingItem | null;
  categories?: Category[];
  listId?: string;
  onSave: (itemId: string, updates: Partial<ShoppingItem>) => Promise<void>;
  onCreate?: (data: { name: string; quantity: number; estimated_price: number | null; notes: string | null; aisle: string | null }) => Promise<void>;
}

// Default categories if none provided
const DEFAULT_CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Seafood",
  "Bakery",
  "Frozen",
  "Deli",
  "Beverages",
  "Snacks",
  "Pantry",
  "Household",
  "Health & Beauty",
  "Baby",
  "Pet",
  "Uncategorised",
];

// Default icons for standard categories
const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥬",
  "Bakery": "🥖",
  "Deli": "🧀",
  "Meat": "🥩",
  "Seafood": "🐟",
  "Dairy": "🥛",
  "Frozen": "🧊",
  "Pantry": "🥫",
  "Snacks": "🍿",
  "Beverages": "🥤",
  "Health & Beauty": "🧴",
  "Cleaning": "🧹",
  "Household": "🧹",
  "Baby": "👶",
  "Pet": "🐾",
  "Uncategorised": "📦",
};

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  categories = [],
  onSave,
  onCreate,
}: EditItemDialogProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [estimatedPrice, setEstimatedPrice] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [aisle, setAisle] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const isNewItem = item?.id === "new";

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity || 1);
      setEstimatedPrice(item.estimated_price?.toString() || "");
      setNotes(item.notes || "");
      setAisle(item.aisle || "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      if (isNewItem && onCreate) {
        // Create new item
        await onCreate({
          name: name.trim(),
          quantity,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
          notes: notes.trim() || null,
          aisle: aisle || null,
        });
      } else {
        // Update existing item
        await onSave(item.id, {
          name: name.trim(),
          quantity,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
          notes: notes.trim() || null,
          aisle: aisle || null,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) return null;

  // Build category options from provided categories or defaults
  const categoryOptions = categories.length > 0
    ? categories.map(c => ({ name: c.name, icon: c.icon || DEFAULT_CATEGORY_ICONS[c.name] || "📦" }))
    : DEFAULT_CATEGORIES.map(name => ({ name, icon: DEFAULT_CATEGORY_ICONS[name] || "📦" }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNewItem ? "Add Item" : "Edit Item"}</DialogTitle>
          <DialogDescription>
            {isNewItem ? "Customise the item before adding" : "Update the item details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          {/* Category/Aisle */}
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <Select value={aisle} onValueChange={setAisle}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="item-quantity">Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <Input
                id="item-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Estimated Price */}
          <div className="space-y-2">
            <Label htmlFor="item-price">Estimated Price (NZD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">$</span>
              <Input
                id="item-price"
                type="number"
                min={0}
                step={0.01}
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-text-medium">
              Optional - helps track your shopping budget
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="item-notes">Notes</Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., get the blue one, check expiry date"
              rows={2}
            />
            <p className="text-xs text-text-medium">
              Add reminders or details about this item
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-sage hover:bg-sage-dark"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isNewItem ? "Add Item" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
