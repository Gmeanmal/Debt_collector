import { cn } from "@/lib/utils";

type MoneyTone = "default" | "accent" | "bad" | "ok";

interface MoneyProps {
  value: number;
  currency?: string;
  mute?: boolean;
  big?: boolean;
  tone?: MoneyTone;
  className?: string;
}

const toneClass: Record<MoneyTone, string> = {
  default: "text-text",
  accent: "text-accent-deep",
  bad: "text-bad-ink",
  ok: "text-ok-ink",
};

export function Money({
  value,
  currency = "£",
  mute,
  big,
  tone = "default",
  className,
}: MoneyProps) {
  const [intPart, decPart] = value.toFixed(2).split(".");
  const colour = mute ? "text-text-mute" : toneClass[tone];

  return (
    <span
      className={cn(
        "font-display italic font-medium tracking-[-0.01em] tabular-nums whitespace-nowrap",
        big ? "text-[24px]" : "text-[15px]",
        colour,
        className,
      )}
    >
      <span className="font-sans text-[0.72em] opacity-70 mr-[2px]">{currency}</span>
      {intPart}
      <span className="opacity-55">.{decPart}</span>
    </span>
  );
}
