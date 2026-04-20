import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium tracking-[0.01em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink border border-accent hover:bg-pink-500 hover:border-pink-500 active:translate-y-px",
        secondary: "bg-bg-sunken text-text border border-line hover:border-line-strong",
        ghost: "bg-transparent text-text-mute hover:text-text hover:bg-bg-sunken/60",
        outline: "bg-transparent text-text border border-line-strong hover:bg-bg-sunken",
        destructive: "bg-transparent text-bad-ink border border-bad-ink hover:bg-bad-bg",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto bg-transparent border-0",
        soft: "bg-accent-trace text-accent-deep border border-transparent hover:bg-accent-soft",
        ink: "bg-ink-400 text-white border border-ink-400 hover:bg-ink-300",
        danger: "bg-transparent text-bad-ink border border-bad-ink hover:bg-bad-bg",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-[13px]",
        lg: "h-11 px-5 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";
