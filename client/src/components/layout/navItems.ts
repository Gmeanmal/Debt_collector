import { MEDICAL_FEATURE_ENABLED } from "@/services/featureFlags";

export interface NavItem {
  to: string;
  label: string;
}

export const GODDESS_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/goddess/subs", label: "Subs" },
  { to: "/goddess/invitations", label: "Invitations" },
  { to: "/goddess/validations", label: "Validations" },
  { to: "/goddess/review-queue", label: "Review queue" },
  { to: "/goddess/photo-queue", label: "Photo queue" },
  { to: "/goddess/kinks", label: "Kinks" },
  { to: "/goddess/payments/record", label: "Record" },
  { to: "/goddess/payment-methods", label: "Methods" },
  { to: "/goddess/debts", label: "Contracts" },
  { to: "/goddess/payments/weekly", label: "Weekly" },
  { to: "/goddess/late", label: "Late" },
  { to: "/goddess/merits", label: "Rewards & Punishments" },
  { to: "/goddess/penalty-rules", label: "Penalty rules" },
];

export const SUB_NAV: NavItem[] = [
  { to: "/today", label: "Today" },
  { to: "/", label: "Dashboard" },
  { to: "/sub/payments", label: "My payments" },
  { to: "/sub/payments/new", label: "Declare" },
  { to: "/sub/debts", label: "Contracts" },
  { to: "/profile/kinks", label: "Kinks" },
  { to: "/profile/limits", label: "Limits" },
  { to: "/sub/journal", label: "Journal" },
  { to: "/sub/profile/inventory", label: "Inventory" },
  { to: "/profile/aftercare", label: "Aftercare" },
  ...(MEDICAL_FEATURE_ENABLED ? [{ to: "/profile/medical", label: "Medical" }] : []),
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/admin", label: "Console" },
  { to: "/admin/cron", label: "Cron" },
];
