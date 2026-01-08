"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface BookCoverProps {
  name: string;
  color: string;
  recipeCount: number;
  coverImage?: string; // Optional cover image URL
  onClick?: () => void;
  index?: number;
}

// Placeholder images for different category types
const PLACEHOLDER_IMAGES: Record<string, string> = {
  drinks: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&h=400&fit=crop", // Cocktails
  entree: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=300&h=400&fit=crop", // Bruschetta/appetizers
  mains: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=400&fit=crop",
  "world-flavours": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=400&fit=crop", // Curry
  "world flavours": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=400&fit=crop", // Curry
  bbq: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=400&fit=crop", // Grilled steak
  "salads-&-sides": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=400&fit=crop",
  "salads-sides": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=400&fit=crop",
  salads: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=400&fit=crop",
  desserts: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=400&fit=crop",
  baking: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=300&h=400&fit=crop", // Cupcakes
  soups: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=400&fit=crop",
  snacks: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=400&fit=crop",
  beverages: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&h=400&fit=crop", // Cocktails
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=400&fit=crop",
  "side-dishes": "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=300&h=400&fit=crop",
  preserves: "https://images.unsplash.com/photo-1597226051193-f3adca718dc9?w=300&h=400&fit=crop",
  default: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=300&h=400&fit=crop",
};

function getPlaceholderImage(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return PLACEHOLDER_IMAGES[slug] || PLACEHOLDER_IMAGES.default;
}

export function BookCover({
  name,
  color,
  recipeCount,
  coverImage,
  onClick,
  index = 0,
}: BookCoverProps) {
  const [imageError, setImageError] = useState(false);
  // Slight random tilt based on index
  const tiltDegree = ((index % 5) - 2) * 0.8;

  // Use custom image if provided and not errored, otherwise use placeholder
  const imageUrl = (coverImage && !imageError) ? coverImage : getPlaceholderImage(name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "relative group cursor-pointer flex-shrink-0",
        "w-[80px] h-[112px] md:w-[100px] md:h-[140px] lg:w-[120px] lg:h-[168px]",
        "transition-all duration-300 ease-in-out",
        "hover:scale-105 hover:z-10 hover:-translate-y-2",
        "focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
      )}
      style={{
        transform: `rotate(${tiltDegree}deg)`,
        transformOrigin: "bottom center",
      }}
    >
      {/* Book cover with image */}
      <div
        className="absolute inset-0 rounded-sm overflow-hidden"
        style={{
          boxShadow: `
            4px 4px 12px rgba(0, 0, 0, 0.3),
            -1px 0 3px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.05)
          `,
        }}
      >
        {/* Cover image */}
        <div className="absolute inset-0">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 120px, (min-width: 768px) 100px, 80px"
            unoptimized // Using external URLs
            onError={() => setImageError(true)}
          />
          {/* Gradient overlay for text readability */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                rgba(0,0,0,0.1) 0%,
                rgba(0,0,0,0.3) 50%,
                rgba(0,0,0,0.6) 100%)`,
            }}
          />
        </div>

        {/* Category color accent bar at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
          <h3
            className="text-white font-semibold text-xs md:text-sm lg:text-base leading-tight line-clamp-2"
            style={{
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {name}
          </h3>
          <p
            className="text-white/80 text-[10px] md:text-xs mt-0.5"
            style={{
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
          </p>
        </div>
      </div>

      {/* Book spine (left edge) */}
      <div
        className="absolute top-0 left-0 w-[4px] h-full"
        style={{
          background: `linear-gradient(90deg,
            rgba(0,0,0,0.3) 0%,
            rgba(0,0,0,0.1) 50%,
            transparent 100%)`,
        }}
      />

      {/* Page edges (right side) */}
      <div
        className="absolute top-[2px] bottom-[2px] -right-[3px] w-[3px] rounded-r-[1px]"
        style={{
          background: `linear-gradient(180deg,
            #F8F6F0 0%,
            #EDE9E0 25%,
            #E5E0D5 50%,
            #EDE9E0 75%,
            #F8F6F0 100%)`,
          boxShadow: "1px 0 2px rgba(0,0,0,0.1)",
        }}
      />

      {/* Hover effect */}
      <div
        className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `
            0 10px 30px rgba(0, 0, 0, 0.4),
            0 0 20px rgba(255, 255, 255, 0.1)
          `,
        }}
      />
    </motion.div>
  );
}

/**
 * Mini book cover for preview in dialogs
 */
export function MiniBookCover({
  name,
  color,
  coverImage,
}: {
  name: string;
  color: string;
  coverImage?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = (coverImage && !imageError) ? coverImage : getPlaceholderImage(name);

  return (
    <div
      className="relative w-[70px] h-[100px] rounded-sm overflow-hidden"
      style={{
        boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
      }}
    >
      <Image
        src={imageUrl}
        alt={name}
        fill
        className="object-cover"
        sizes="70px"
        unoptimized
        onError={() => setImageError(true)}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(0,0,0,0.1) 0%,
            rgba(0,0,0,0.5) 100%)`,
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <h3
          className="text-white font-semibold text-[10px] leading-tight line-clamp-2"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
        >
          {name}
        </h3>
      </div>
    </div>
  );
}
