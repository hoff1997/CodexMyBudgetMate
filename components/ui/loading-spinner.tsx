import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({
  className = "",
  size = "md",
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2
        className={cn("animate-spin text-sage", sizeClasses[size])}
      />
      {text && <p className="text-sm text-text-medium">{text}</p>}
    </div>
  );
}

export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
