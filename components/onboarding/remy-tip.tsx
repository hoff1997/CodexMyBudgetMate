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
      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-sage-light">
        <Image
          src={`/Images/remy-${pose}.png`}
          alt="Remy"
          fill
          className="object-cover object-top"
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
 */
export function RemyAvatar({ pose = "welcome", size = "md", className = "" }: RemyAvatarProps) {
  const sizeClasses = {
    sm: "w-12 h-12",    // 48px - sidebar/small contexts
    md: "w-16 h-16",    // 64px - onboarding dialogs
    lg: "w-20 h-20",    // 80px - onboarding pages
    xl: "w-24 h-24",    // 96px - celebration modals
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-sage-very-light shadow-lg bg-sage-light ${className}`}>
      <Image
        src={`/Images/remy-${pose}.png`}
        alt="Remy"
        fill
        className="object-cover object-top"
      />
    </div>
  );
}
