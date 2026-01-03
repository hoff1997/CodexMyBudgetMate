"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { Wallet, PiggyBank, TrendingUp, Heart } from "lucide-react";

interface MoneyEnvelopeCardProps {
  type: "spend" | "save" | "invest" | "give";
  balance: number;
  percentage: number;
}

const ENVELOPE_CONFIG = {
  spend: {
    label: "Spending",
    icon: Wallet,
    emoji: "💰",
    color: "text-blue",
    bgColor: "bg-blue-light",
    borderColor: "border-blue",
  },
  save: {
    label: "Saving",
    icon: PiggyBank,
    emoji: "🏦",
    color: "text-sage",
    bgColor: "bg-sage-very-light",
    borderColor: "border-sage",
  },
  invest: {
    label: "Investing",
    icon: TrendingUp,
    emoji: "📈",
    color: "text-gold",
    bgColor: "bg-gold-light",
    borderColor: "border-gold",
  },
  give: {
    label: "Giving",
    icon: Heart,
    emoji: "💝",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-300",
  },
};

export function MoneyEnvelopeCard({
  type,
  balance,
  percentage,
}: MoneyEnvelopeCardProps) {
  const config = ENVELOPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "p-4 border-2 transition-all hover:shadow-md",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <h3 className="font-semibold text-text-dark">{config.label}</h3>
        </div>
        <span className="text-xs text-text-medium font-medium px-2 py-0.5 bg-white rounded-full">
          {percentage}%
        </span>
      </div>
      <div className={cn("text-3xl font-bold mb-2", config.color)}>
        ${balance.toFixed(2)}
      </div>
      <Progress value={percentage} className="h-2" />
    </Card>
  );
}
