import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover shadow-[0_0_0_1px_rgba(201,169,97,0.3)_inset,0_8px_24px_-12px_rgba(201,169,97,0.4)] hover:shadow-[0_0_0_1px_rgba(201,169,97,0.5)_inset,0_12px_32px_-12px_rgba(201,169,97,0.55)] active:translate-y-px",
        secondary:
          "bg-base-surface-raised text-base-text border border-base-border hover:border-pink-primary/40 hover:text-pink-primary",
        ghost: "text-base-text-muted hover:text-base-text hover:bg-base-surface-raised/60",
        outline:
          "border border-base-border bg-transparent text-base-text hover:bg-base-surface-raised hover:border-pink-primary/50",
        destructive:
          "bg-debt-primary text-base-text hover:bg-debt-primary-hover shadow-[0_0_0_1px_rgba(168,50,50,0.4)_inset]",
        link: "text-pink-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
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

export { buttonVariants };
