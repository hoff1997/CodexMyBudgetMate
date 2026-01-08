"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShopItemCard } from "@/components/avatar-shop/shop-item-card";
import { PurchaseCelebration } from "@/components/avatar-shop/purchase-celebration";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { ArrowLeft, Star } from "lucide-react";
import { cn } from "@/lib/cn";

const HELP_CONTENT = {
  tips: [
    "Check out the different tiers - legendary items cost more but are super cool",
    "Filter by category to find exactly what you want",
    "Save your stars if you're eyeing something special",
  ],
  features: [
    "Browse avatars, clothing, room items, pets, and accessories",
    "See how many stars each item costs",
    "Filter by category to find what you want",
    "Items you own are marked so you know what you have",
  ],
  faqs: [
    {
      question: "How do I earn more stars?",
      answer: "Complete chores and get them approved by your parent! Each chore can earn you stars.",
    },
    {
      question: "What are the different tiers?",
      answer: "Items are grouped by rarity: Starter, Cool, Rare, Epic, and Legendary. The rarer the item, the more stars it costs!",
    },
    {
      question: "Can I get a refund?",
      answer: "Once you buy an item, it's yours forever! Make sure you really want it before purchasing.",
    },
  ],
};

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  star_balance: number;
}

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

interface AvatarShopClientProps {
  child: ChildProfile;
  initialItems: ShopItem[];
}

const CATEGORIES = [
  { value: "all", label: "All Items", emoji: "🎁" },
  { value: "avatar", label: "Avatars", emoji: "🧍" },
  { value: "clothing", label: "Clothing", emoji: "👕" },
  { value: "room", label: "Room Items", emoji: "🏠" },
  { value: "pet", label: "Pets", emoji: "🐾" },
  { value: "accessory", label: "Accessories", emoji: "👑" },
];

export function AvatarShopClient({
  child,
  initialItems,
}: AvatarShopClientProps) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [items, setItems] = useState<ShopItem[]>(initialItems);
  const [starBalance, setStarBalance] = useState(child.star_balance || 0);
  const [purchasedItem, setPurchasedItem] = useState<ShopItem | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  // Group by tier
  const itemsByTier = useMemo(() => {
    const grouped: Record<number, ShopItem[]> = {};
    filteredItems.forEach((item) => {
      const tier = item.tier || 1;
      if (!grouped[tier]) {
        grouped[tier] = [];
      }
      grouped[tier].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const tierLabels: Record<number, string> = {
    1: "Starter Items",
    2: "Cool Stuff",
    3: "Rare Items",
    4: "Epic Items",
    5: "Legendary Items",
  };

  const handlePurchase = async (itemId: string) => {
    try {
      const res = await fetch("/api/avatar-shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: child.id,
          item_id: itemId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.celebration) {
        const purchasedItemData = items.find((i) => i.id === itemId);
        if (purchasedItemData) {
          setPurchasedItem(purchasedItemData);
          setStarBalance(data.new_balance);
          setShowCelebration(true);

          // Update items to show as owned
          setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, owned: true } : i))
          );
        }
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch (error) {
      console.error("Purchase error:", error);
    }
  };

  const handleContinueShopping = () => {
    setShowCelebration(false);
    setPurchasedItem(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gold-light to-white">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
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
            <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center">
              <span className="text-3xl">🏪</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Star Shop</h1>
              <p className="text-text-medium">Spend your stars on cool stuff!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gold rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-white fill-white" />
                <span className="text-xl font-bold text-white">{starBalance}</span>
              </div>
            </div>
            <RemyHelpButton title="Star Shop" content={HELP_CONTENT} />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                categoryFilter === cat.value
                  ? "bg-sage text-white"
                  : "bg-white text-text-medium hover:bg-silver-light border border-silver-light"
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items by Tier */}
        {Object.keys(itemsByTier).length === 0 ? (
          <div className="text-center py-12 text-text-medium">
            No items in this category yet.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(itemsByTier)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([tier, tierItems]) => (
                <div key={tier}>
                  <h2 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
                    {"⭐".repeat(Number(tier))}
                    <span>{tierLabels[Number(tier)] || `Tier ${tier}`}</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {tierItems.map((item) => (
                      <ShopItemCard
                        key={item.id}
                        item={item}
                        starBalance={starBalance}
                        onPurchase={handlePurchase}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Purchase Celebration */}
        <PurchaseCelebration
          item={purchasedItem}
          newBalance={starBalance}
          open={showCelebration}
          onOpenChange={setShowCelebration}
          onContinueShopping={handleContinueShopping}
        />
      </div>
    </div>
  );
}
