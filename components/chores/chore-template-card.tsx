"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Flame, Receipt, Pencil, CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  is_expected?: boolean;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  currency_type: string | null;
  currency_amount: number | null;
  estimated_minutes: number | null;
  is_preset: boolean;
  max_per_week?: number | null;
  allowed_days?: number[] | null;
  auto_approve?: boolean;
}

interface ChoreTemplateCardProps {
  template: ChoreTemplate;
  onClick: () => void;
  onEdit?: () => void;
}

export function ChoreTemplateCard({ template, onClick, onEdit }: ChoreTemplateCardProps) {
  const isExpected = template.is_expected === true;

  const ageRange = template.recommended_age_min || template.recommended_age_max
    ? `${template.recommended_age_min || "?"}–${template.recommended_age_max || "?"}y`
    : null;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

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
              {/* Expected vs Extra badge */}
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs gap-1",
                  isExpected
                    ? "border-gold bg-gold-light text-gold-dark"
                    : "border-sage bg-sage-very-light text-sage-dark"
                )}
              >
                {isExpected ? (
                  <>
                    <Flame className="h-3 w-3" />
                    Expected
                  </>
                ) : (
                  <>
                    <Receipt className="h-3 w-3" />
                    Extra
                  </>
                )}
              </Badge>
              {template.auto_approve && (
                <Badge variant="outline" className="shrink-0 text-xs border-blue bg-blue-light text-blue gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Auto
                </Badge>
              )}
              {!template.is_preset && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Custom
                </Badge>
              )}
              {/* Edit button */}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto shrink-0"
                  onClick={handleEditClick}
                >
                  <Pencil className="h-3.5 w-3.5 text-text-light hover:text-sage" />
                </Button>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-text-medium line-clamp-2 mb-2">
                {template.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {/* Show earnable amount only for Extra chores */}
              {!isExpected && template.currency_amount && (
                <div className="flex items-center gap-1 text-sage">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    {template.currency_amount.toFixed(2)}
                  </span>
                </div>
              )}
              {/* Expected chores show "Streak tracking" */}
              {isExpected && (
                <div className="flex items-center gap-1 text-gold">
                  <Flame className="h-4 w-4" />
                  <span className="font-medium">Streak tracking</span>
                </div>
              )}
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
              {template.max_per_week && (
                <div className="text-text-light">
                  Max {template.max_per_week}/wk
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
