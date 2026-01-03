"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  star_cost: number;
  tier: number;
  unlock_requirement: string | null;
  category: string;
  owned: boolean;
}

interface ShopItemCardProps {
  item: ShopItem;
  starBalance: number;
  onPurchase: (itemId: string) => Promise<void>;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  avatar: "🧍",
  clothing: "👕",
  room: "🏠",
  pet: "🐾",
  accessory: "👑",
};

export function ShopItemCard({
  item,
  starBalance,
  onPurchase,
}: ShopItemCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const canAfford = starBalance >= item.star_cost;
  const isLocked = !!item.unlock_requirement && !item.owned;

  const handlePurchase = async () => {
    if (isPurchasing || item.owned || !canAfford || isLocked) return;
    setIsPurchasing(true);
    try {
      await onPurchase(item.id);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Card
      className={cn(
        "p-3 transition-all hover:shadow-md",
        item.owned && "bg-sage-very-light border-sage"
      )}
    >
      {/* Item Image */}
      <div className="aspect-square bg-silver-very-light rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-4xl">
            {CATEGORY_EMOJIS[item.category] || "🎁"}
          </span>
        )}
      </div>

      {/* Item Info */}
      <h3 className="font-semibold text-text-dark text-sm mb-1 truncate">
        {item.name}
      </h3>
      {item.description && (
        <p className="text-xs text-text-medium mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Price and Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-gold fill-gold" />
          <span className="font-bold text-text-dark">{item.star_cost}</span>
        </div>

        {item.owned ? (
          <div className="flex items-center gap-1 text-xs text-sage font-medium">
            <Check className="h-3 w-3" />
            Owned
          </div>
        ) : isLocked ? (
          <div className="flex items-center gap-1 text-xs text-text-medium">
            <Lock className="h-3 w-3" />
            Locked
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handlePurchase}
            disabled={!canAfford || isPurchasing}
            className={cn(
              "text-xs h-7",
              canAfford
                ? "bg-sage hover:bg-sage-dark"
                : "bg-silver-light text-text-medium"
            )}
          >
            {isPurchasing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : canAfford ? (
              "Buy"
            ) : (
              "Need more"
            )}
          </Button>
        )}
      </div>

      {/* Lock Requirement */}
      {isLocked && item.unlock_requirement && (
        <div className="mt-2 text-xs text-text-medium bg-silver-very-light p-2 rounded">
          🔒 {item.unlock_requirement}
        </div>
      )}
    </Card>
  );
}
