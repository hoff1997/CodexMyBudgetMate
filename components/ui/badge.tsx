import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-sage-very-light border-sage-light text-sage-dark",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        destructive: "bg-destructive text-destructive-foreground shadow-sm border-transparent",
        outline: "text-text-medium border-silver",
        // Style Guide Variants
        positive: "bg-sage-very-light border-sage-light text-sage-dark",
        negative: "bg-blue-light border-blue text-[#4A7BA8]",
        celebration: "bg-gold-light border-gold text-[#8B7035]",
        info: "bg-blue-light border-blue text-[#4A7BA8]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
