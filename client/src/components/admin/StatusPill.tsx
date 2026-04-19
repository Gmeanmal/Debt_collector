import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeTone = NonNullable<BadgeProps["variant"]>;

const STATUS_TONES: Record<string, BadgeTone> = {
  active: "ok",
  pending_entry_tribute: "warn",
  pending_validation: "warn",
  blacklisted: "bad",
  deleted: "neutral",
};

interface Props {
  value: unknown;
}

export function StatusPill({ value }: Props) {
  const str = value == null ? "" : String(value);
  const tone: BadgeTone = STATUS_TONES[str] ?? "neutral";
  return <Badge variant={tone}>{str || "—"}</Badge>;
}
