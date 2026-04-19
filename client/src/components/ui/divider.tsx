import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <div className={cn("h-px w-full bg-line my-5", className)} role="separator" />;
  }

  return (
    <div className={cn("flex items-center gap-3 my-5", className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
