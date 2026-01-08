"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  ExternalLink,
  Pencil,
  Trash2,
  Target,
  MoreVertical,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { WishlistItemWithEnvelope } from "@/lib/types/wishlist";

interface WishlistCardProps {
  item: WishlistItemWithEnvelope;
  onEdit: (item: WishlistItemWithEnvelope) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  isConverting?: boolean;
  isDeleting?: boolean;
  disabled?: boolean;
  convertButtonLabel?: string;
  isKidsMode?: boolean;
}

export function WishlistCard({
  item,
  onEdit,
  onDelete,
  onConvert,
  isConverting,
  isDeleting,
  disabled,
  convertButtonLabel = "Make it a Goal",
  isKidsMode,
}: WishlistCardProps) {
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isConverted = item.status === "converted";
  const isPurchased = item.status === "purchased";

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return null;
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
    }).format(price);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-sage",
        isConverted && "bg-sage-very-light/50 opacity-75",
        isPurchased && "bg-silver-very-light opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "flex items-center cursor-grab active:cursor-grabbing",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <GripVertical className="h-5 w-5 text-silver" />
          </div>

          {/* Image */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-silver-very-light">
            {item.image_url && !imageError ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🎁
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-text-dark truncate">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-sm text-text-medium line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              {isConverted && (
                <Badge
                  variant="outline"
                  className="bg-sage-very-light text-sage-dark border-sage-light flex-shrink-0"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {isKidsMode ? "Saving!" : "Goal Created"}
                </Badge>
              )}
              {isPurchased && (
                <Badge
                  variant="outline"
                  className="bg-silver-very-light text-text-medium border-silver-light flex-shrink-0"
                >
                  Purchased
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              {/* Price */}
              <div className="flex items-center gap-2">
                {item.estimated_cost !== null && (
                  <span className="text-lg font-semibold text-text-dark">
                    {formatPrice(item.estimated_cost)}
                  </span>
                )}
                {item.link_url && (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:text-blue-dark"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Convert to Goal button - only for active items */}
                {!isConverted && !isPurchased && (
                  <Button
                    size="sm"
                    onClick={() => onConvert(item.id)}
                    disabled={isConverting || isDeleting}
                    className="bg-sage hover:bg-sage-dark text-white"
                  >
                    {isConverting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-1" />
                        {convertButtonLabel}
                      </>
                    )}
                  </Button>
                )}

                {/* View Goal link - for converted items */}
                {isConverted && item.converted_envelope && !isKidsMode && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/allocation?highlight=${item.converted_envelope.id}`}>
                      View Goal
                    </Link>
                  </Button>
                )}

                {/* More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isConverting || isDeleting}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(item.id)}
                      className="text-red-600"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
