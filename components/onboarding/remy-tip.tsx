"use client";

import Image from "next/image";

type RemyPose = "welcome" | "encouraging" | "thinking" | "celebrating" | "small";

interface RemyTipProps {
  children: React.ReactNode;
  pose?: RemyPose;
  className?: string;
}

/**
 * RemyTip - A tip box with Remy's avatar and message
 * Used throughout onboarding to provide guidance in Remy's warm Kiwi voice
 */
export function RemyTip({ children, pose = "encouraging", className = "" }: RemyTipProps) {
  return (
    <div className={`flex items-start gap-4 p-4 bg-sage-very-light rounded-xl border border-sage-light ${className}`}>
      <div className="relative w-20 h-20 md:w-[72px] md:h-[72px] rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-sage-light">
        <Image
          src={`/Images/remy-${pose}.png`}
          alt="Remy"
          fill
          className="object-cover object-top"
          quality={100}
          unoptimized
          style={{ imageRendering: "auto" }}
        />
      </div>
      <div className="flex-1">
        <div className="text-sm text-sage-dark leading-relaxed">
          {children}
        </div>
        <p className="text-xs text-sage mt-2 font-medium">Remy</p>
      </div>
    </div>
  );
}

interface RemyAvatarProps {
  pose?: RemyPose;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * RemyAvatar - Standalone Remy avatar for headers
 * Sizes increased by ~0.5cm and larger on mobile for better visibility
 * Uses unoptimized + quality=100 for sharp rendering
 */
export function RemyAvatar({ pose = "welcome", size = "md", className = "" }: RemyAvatarProps) {
  // Mobile sizes are larger for better visibility
  const sizeClasses = {
    sm: "w-16 h-16 md:w-14 md:h-14",    // 64px mobile, 56px desktop (was 48px)
    md: "w-20 h-20 md:w-[72px] md:h-[72px]",  // 80px mobile, 72px desktop (was 64px)
    lg: "w-24 h-24 md:w-[88px] md:h-[88px]",  // 96px mobile, 88px desktop (was 80px)
    xl: "w-28 h-28 md:w-[104px] md:h-[104px]", // 112px mobile, 104px desktop (was 96px)
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-sage-very-light shadow-lg bg-sage-light ${className}`}>
      <Image
        src={`/Images/remy-${pose}.png`}
        alt="Remy"
        fill
        className="object-cover object-top"
        quality={100}
        unoptimized
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
