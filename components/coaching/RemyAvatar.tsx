"use client";

import Image from "next/image";

export type RemyPose =
  | "welcome"
  | "celebrating"
  | "encouraging"
  | "thinking"
  | "small";

interface RemyAvatarProps {
  pose?: RemyPose;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const sizePx = {
  sm: 32,
  md: 56,
  lg: 80,
};

export function RemyAvatar({
  pose = "welcome",
  size = "md",
  className = "",
}: RemyAvatarProps) {
  return (
    <div
      className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ${className}`}
    >
      <Image
        src={`/Images/remy-${pose}.png`}
        alt="Remy"
        width={sizePx[size]}
        height={sizePx[size]}
        className="object-cover object-top"
        quality={100}
        unoptimized
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
