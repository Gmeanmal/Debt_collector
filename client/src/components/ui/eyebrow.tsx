import * as React from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "accent";
}

export function Eyebrow({ tone = "default", className, children, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em]",
        tone === "accent" ? "text-accent-deep" : "text-text-faint",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
