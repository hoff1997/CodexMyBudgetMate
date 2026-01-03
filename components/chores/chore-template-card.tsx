"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  default_currency_type: string;
  default_currency_amount: number;
  estimated_minutes: number | null;
  is_system: boolean;
}

interface ChoreTemplateCardProps {
  template: ChoreTemplate;
  onClick: () => void;
}

const CURRENCY_ICONS = {
  stars: { icon: Star, color: "text-gold", label: "stars" },
  screen_time: { icon: Clock, color: "text-blue", label: "min" },
  money: { icon: DollarSign, color: "text-sage", label: "" },
};

export function ChoreTemplateCard({ template, onClick }: ChoreTemplateCardProps) {
  const currency = CURRENCY_ICONS[template.default_currency_type as keyof typeof CURRENCY_ICONS] || CURRENCY_ICONS.stars;
  const CurrencyIcon = currency.icon;

  const ageRange = template.recommended_age_min || template.recommended_age_max
    ? `${template.recommended_age_min || "?"}–${template.recommended_age_max || "?"}y`
    : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-sage transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0">{template.icon || "📋"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-text-dark truncate">
                {template.name}
              </h4>
              {!template.is_system && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Custom
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-text-medium line-clamp-2 mb-2">
                {template.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className={cn("flex items-center gap-1", currency.color)}>
                <CurrencyIcon className="h-4 w-4" />
                <span className="font-medium">
                  {template.default_currency_type === "money" && "$"}
                  {template.default_currency_amount}
                  {currency.label && ` ${currency.label}`}
                </span>
              </div>
              {template.estimated_minutes && (
                <div className="flex items-center gap-1 text-text-light">
                  <Clock className="h-3 w-3" />
                  <span>{template.estimated_minutes}m</span>
                </div>
              )}
              {ageRange && (
                <div className="text-text-light">
                  Ages {ageRange}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
