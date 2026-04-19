import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] font-mono",
  {
    variants: {
      variant: {
        default: "bg-bg-inset border-transparent text-text-mute",
        neutral: "bg-bg-inset border-transparent text-text-mute",
        primary: "bg-accent-trace border-transparent text-accent-deep",
        pink: "bg-accent-trace border-transparent text-accent-deep",
        success: "bg-ok-bg border-transparent text-ok-ink",
        ok: "bg-ok-bg border-transparent text-ok-ink",
        warning: "bg-warn-bg border-transparent text-warn-ink",
        warn: "bg-warn-bg border-transparent text-warn-ink",
        danger: "bg-bad-bg border-transparent text-bad-ink",
        bad: "bg-bad-bg border-transparent text-bad-ink",
        debt: "bg-bad-bg border-transparent text-bad-ink",
        info: "bg-bg-inset border-transparent text-text-mute",
        gold: "bg-signal-soft border-transparent text-signal-ink",
        ink: "bg-ink-400 border-transparent text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
