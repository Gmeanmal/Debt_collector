import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: "sm" | "md";
  className?: string;
}

export function BrandMark({ size = "md", className }: BrandMarkProps) {
  const dims = size === "sm" ? "h-7 w-7 text-[12px]" : "h-[34px] w-[34px] text-[15px]";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full border border-accent bg-accent-trace text-accent grid place-items-center font-serif italic font-medium",
        dims,
        className,
      )}
    >
      M
    </div>
  );
}

interface BrandLockupProps {
  small?: boolean;
}

export function BrandLockup({ small }: BrandLockupProps) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={small ? "sm" : "md"} />
      <div className="leading-none">
        <div
          className={cn(
            "font-serif italic font-normal text-text tracking-[0.01em]",
            small ? "text-[15px]" : "text-[17px]",
          )}
        >
          Mean Mal
        </div>
        <div className="mt-[3px] font-mono text-[9px] uppercase tracking-[0.14em] text-text-faint">
          The Ledger
        </div>
      </div>
    </div>
  );
}
