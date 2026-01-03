import { cn } from "@/lib/cn";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 2 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-silver-light rounded-xl p-4 animate-pulse",
        className
      )}
    >
      <div className="h-4 bg-silver-light rounded w-3/4 mb-3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-silver-very-light rounded mb-2"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-silver-light animate-pulse",
        sizeClasses[size]
      )}
    />
  );
}
