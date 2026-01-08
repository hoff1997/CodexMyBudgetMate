"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BookSpineProps {
  name: string;
  color: string;
  recipeCount: number;
  onClick?: () => void;
  index?: number; // For stagger animation
}

/**
 * Adjust brightness of hex color
 * Used to create shadow (darker) and highlight (lighter) on book spine
 */
function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function BookSpine({
  name,
  color,
  recipeCount,
  onClick,
  index = 0,
}: BookSpineProps) {
  const shadowColor = adjustBrightness(color, -40); // Darker shadow
  const highlightColor = adjustBrightness(color, 40); // Brighter highlight

  // Slight random tilt based on index (max 2 degrees either way)
  const tiltDegree = ((index % 5) - 2) * 0.5; // -1, -0.5, 0, 0.5, 1 degrees

  // Vary book width slightly based on recipe count (thicker = more recipes) - HALF SIZE
  const bookWidth = recipeCount > 10 ? 90 : recipeCount > 5 ? 80 : 70;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer flex-shrink-0",
        "h-[140px]", // Half height
        "transition-all duration-300 ease-in-out",
        "hover:scale-105 hover:z-10 hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
      )}
      style={{
        width: `${bookWidth}px`,
        transform: `rotate(${tiltDegree}deg)`,
        transformOrigin: "bottom center",
      }}
    >
      {/* Main book spine */}
      <div
        className="absolute inset-0 rounded-[4px] overflow-hidden"
        style={{
          background: `linear-gradient(90deg,
            ${shadowColor} 0%,
            ${adjustBrightness(color, -10)} 20%,
            ${color} 50%,
            ${adjustBrightness(color, 10)} 80%,
            ${highlightColor} 100%)`,
          boxShadow: `
            inset -10px 0 15px rgba(0, 0, 0, 0.3),
            inset 10px 0 15px rgba(255, 255, 255, 0.1),
            -5px 5px 20px rgba(0, 0, 0, 0.4),
            inset 0 0 50px rgba(0, 0, 0, 0.05)
          `,
        }}
      >
        {/* Decorative top line */}
        <div
          className="absolute top-3 left-2 right-2 h-[1px] rounded-full"
          style={{
            background: "rgba(255, 255, 255, 0.3)",
            boxShadow: "0 1px 1px rgba(0, 0, 0, 0.2)",
          }}
        />

        {/* Spine binding dots */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 flex flex-col justify-evenly items-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-[3px] rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                boxShadow: "0 1px 1px rgba(0, 0, 0, 0.3)",
              }}
            />
          ))}
        </div>

        {/* Book title (vertical text) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-white font-serif font-bold text-xs md:text-sm tracking-wider px-1"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              textShadow: `
                1px 1px 2px rgba(0, 0, 0, 0.5),
                -1px -1px 1px rgba(255, 255, 255, 0.2)
              `,
              letterSpacing: "0.1em",
            }}
          >
            {name.length > 14 ? name.slice(0, 14).toUpperCase() : name.toUpperCase()}
          </div>
        </div>

        {/* Recipe count badge - smaller design */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: `
              0 1px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 1px rgba(255, 255, 255, 0.2)
            `,
          }}
        >
          {recipeCount}
        </div>

        {/* Decorative bottom line */}
        <div
          className="absolute bottom-7 left-2 right-2 h-[1px]"
          style={{
            background: "rgba(255, 255, 255, 0.2)",
          }}
        />
      </div>

      {/* Book edge (right side) - shows depth */}
      <div
        className="absolute top-0 right-0 w-[5px] h-full rounded-r-[3px]"
        style={{
          background: `linear-gradient(90deg,
            ${adjustBrightness(color, -60)} 0%,
            ${adjustBrightness(color, -40)} 50%,
            ${adjustBrightness(color, -30)} 100%)`,
          boxShadow: `
            inset -1px 0 2px rgba(0, 0, 0, 0.4),
            1px 0 4px rgba(0, 0, 0, 0.3)
          `,
        }}
      />

      {/* Page edges (cream color on right) */}
      <div
        className="absolute top-[1px] bottom-[1px] right-[5px] w-[2px] rounded-r-sm"
        style={{
          background: `linear-gradient(180deg,
            #F5F1E8 0%,
            #EDE7D9 50%,
            #E5DCC8 100%)`,
          boxShadow: "inset -1px 0 1px rgba(0, 0, 0, 0.1)",
        }}
      />

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `
            0 0 30px rgba(255, 255, 255, 0.3),
            0 15px 40px rgba(0, 0, 0, 0.5)
          `,
        }}
      />
    </motion.button>
  );
}

/**
 * Mini book spine for preview in dialogs
 */
export function MiniBookSpine({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  const shadowColor = adjustBrightness(color, -40);
  const highlightColor = adjustBrightness(color, 40);

  return (
    <div className="relative w-[90px] h-[140px]">
      {/* Main spine */}
      <div
        className="absolute inset-0 rounded-[3px]"
        style={{
          background: `linear-gradient(90deg,
            ${shadowColor} 0%,
            ${color} 50%,
            ${highlightColor} 100%)`,
          boxShadow: `
            inset -6px 0 10px rgba(0, 0, 0, 0.3),
            inset 6px 0 10px rgba(255, 255, 255, 0.1),
            4px 4px 15px rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {/* Top line */}
        <div
          className="absolute top-3 left-2 right-2 h-[1px]"
          style={{ background: "rgba(255, 255, 255, 0.3)" }}
        />

        {/* Binding dots */}
        <div className="absolute left-1/2 -translate-x-1/2 top-8 bottom-8 flex flex-col justify-evenly items-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-[3px] rounded-full bg-white/40"
            />
          ))}
        </div>

        {/* Title */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-white font-serif font-semibold text-sm tracking-wide"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
            }}
          >
            {name.length > 12
              ? name.slice(0, 12).toUpperCase()
              : name.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Edge */}
      <div
        className="absolute top-0 right-0 w-[6px] h-full rounded-r-[3px]"
        style={{
          background: `linear-gradient(90deg, ${adjustBrightness(color, -60)}, ${adjustBrightness(color, -40)})`,
        }}
      />

      {/* Pages */}
      <div
        className="absolute top-[1px] bottom-[1px] right-[6px] w-[2px]"
        style={{
          background: "#F5F1E8",
        }}
      />
    </div>
  );
}
