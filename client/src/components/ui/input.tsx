import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text shadow-[0_1px_0_rgba(244,237,225,0.04)_inset] transition-all duration-200 placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:bg-base-surface-raised focus:outline-none focus:ring-2 focus:ring-pink-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
