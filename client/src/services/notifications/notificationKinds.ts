import { BadgeCheck, Bell, Clock, FileText, Heart, type LucideIcon } from "lucide-react";

import type { NotificationType } from "@/services/notifications/notificationsApi";

export type ChipId = "all" | "validations" | "late" | "kink_updates" | "contract_events";

// Maps each chip to the NotificationType values it covers.
// Chips with no matching types on the enum are excluded — we only list types that exist.
export const FILTER_KINDS: Record<Exclude<ChipId, "all">, NotificationType[]> = {
  validations: ["payment_pending", "payment_validated", "payment_rejected"],
  late: ["rolling_late", "contract_late_penalty", "contract_surprise_penalty"],
  kink_updates: [],
  contract_events: [
    "contract_proposed",
    "contract_countered",
    "contract_counter_accepted",
    "contract_counter_rejected",
    "contract_signed",
    "contract_needs_resignature",
    "contract_adjustment_proposed",
    "contract_adjustment_accepted",
    "contract_adjustment_refused",
    "contract_buyout_requested",
    "contract_buyout_paid",
    "contract_breached",
    "contract_forgiven",
    "contract_renewed",
  ],
};

// kink_updates has no matching NotificationType value on the current enum — chip is hidden.
export const HIDDEN_CHIPS: ChipId[] = ["kink_updates"];

export function chipForKind(kind: NotificationType): ChipId | null {
  for (const [chip, types] of Object.entries(FILTER_KINDS) as [
    Exclude<ChipId, "all">,
    NotificationType[],
  ][]) {
    if ((types as string[]).includes(kind)) return chip;
  }
  return null;
}

const ICON_MAP: Partial<Record<NotificationType, LucideIcon>> = {
  payment_pending: BadgeCheck,
  payment_validated: BadgeCheck,
  payment_rejected: BadgeCheck,
  rolling_late: Clock,
  contract_late_penalty: Clock,
  contract_surprise_penalty: Clock,
  contract_proposed: FileText,
  contract_countered: FileText,
  contract_counter_accepted: FileText,
  contract_counter_rejected: FileText,
  contract_signed: FileText,
  contract_needs_resignature: FileText,
  contract_adjustment_proposed: FileText,
  contract_adjustment_accepted: FileText,
  contract_adjustment_refused: FileText,
  contract_buyout_requested: FileText,
  contract_buyout_paid: FileText,
  contract_breached: FileText,
  contract_forgiven: FileText,
  contract_renewed: FileText,
  journal_comment: Heart,
  goddess_message: Heart,
};

export function iconForKind(kind: NotificationType): LucideIcon {
  return ICON_MAP[kind] ?? Bell;
}

// Returns a Tailwind left-border color class for the kind accent.
export function accentClassForKind(kind: NotificationType): string {
  if (["payment_validated"].includes(kind)) return "border-l-status-success";
  if (["payment_rejected", "contract_breached"].includes(kind)) return "border-l-status-danger";
  if (["rolling_late", "contract_late_penalty", "contract_surprise_penalty"].includes(kind))
    return "border-l-status-warning";
  if (["journal_comment", "goddess_message"].includes(kind)) return "border-l-pink-primary";
  if (
    [
      "contract_proposed",
      "contract_countered",
      "contract_counter_accepted",
      "contract_counter_rejected",
      "contract_signed",
      "contract_needs_resignature",
      "contract_adjustment_proposed",
      "contract_adjustment_accepted",
      "contract_adjustment_refused",
      "contract_buyout_requested",
      "contract_buyout_paid",
      "contract_forgiven",
      "contract_renewed",
    ].includes(kind)
  )
    return "border-l-violet-primary";
  return "border-l-base-border";
}
