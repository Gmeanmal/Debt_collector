import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-base-border bg-base-surface-raised text-base-text-muted",
        primary: "border-pink-primary/30 bg-pink-primary/10 text-pink-primary",
        success: "border-status-success/30 bg-status-success/10 text-status-success",
        warning: "border-status-warning/30 bg-status-warning/10 text-status-warning",
        danger: "border-status-danger/30 bg-status-danger/10 text-status-danger",
        info: "border-status-info/30 bg-status-info/10 text-status-info",
        debt: "border-debt-primary/30 bg-debt-primary/10 text-debt-primary",
        gold: "border-gold-accent/30 bg-gold-accent/10 text-gold-accent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
