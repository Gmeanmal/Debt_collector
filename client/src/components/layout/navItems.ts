import { MEDICAL_FEATURE_ENABLED } from "@/services/featureFlags";

export type NavBadgeTone = "accent" | "warn" | "bad";

export interface NavItem {
  to: string;
  label: string;
  badge?: number;
  tone?: NavBadgeTone;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const GODDESS_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [{ to: "/goddess/dashboard", label: "Dashboard" }],
  },
  {
    group: "People",
    items: [
      { to: "/goddess/subs", label: "Subs" },
      { to: "/goddess/invitations", label: "Invitations" },
      { to: "/goddess/blacklist", label: "Blacklist" },
    ],
  },
  {
    group: "Money",
    items: [
      { to: "/goddess/validations", label: "Validations" },
      { to: "/goddess/debts", label: "Contracts" },
      { to: "/goddess/payments/weekly", label: "Weekly intake" },
      { to: "/goddess/late", label: "Late", tone: "warn" },
      { to: "/goddess/payment-methods", label: "Payment methods" },
      { to: "/goddess/payments/record", label: "Record payment" },
    ],
  },
  {
    group: "Moderation",
    items: [
      { to: "/goddess/review-queue", label: "Review queue" },
      { to: "/goddess/photo-queue", label: "Photo queue" },
      { to: "/goddess/profile-change-requests", label: "Profile changes" },
    ],
  },
  {
    group: "Rules",
    items: [
      { to: "/goddess/kinks", label: "Kinks" },
      { to: "/goddess/rituals", label: "Rituals" },
      { to: "/goddess/merits", label: "Rewards & punishments" },
      { to: "/goddess/penalty-rules", label: "Penalty rules" },
    ],
  },
];

export const SUB_NAV: NavGroup[] = [
  {
    group: "Today",
    items: [
      { to: "/sub/today", label: "Today" },
      { to: "/sub/dashboard", label: "Dashboard" },
    ],
  },
  {
    group: "Money",
    items: [
      { to: "/sub/payments", label: "My payments" },
      { to: "/sub/payments/new", label: "Declare" },
      { to: "/sub/debts", label: "Contracts" },
      { to: "/sub/ledger", label: "Ledger" },
    ],
  },
  {
    group: "Profile",
    items: [
      { to: "/profile", label: "Profile" },
      { to: "/sub/profile/kinks", label: "Kinks" },
      { to: "/sub/profile/limits", label: "Limits" },
      { to: "/sub/journal", label: "Journal" },
      { to: "/sub/profile/inventory", label: "Inventory" },
      { to: "/sub/profile/aftercare", label: "Aftercare" },
      ...(MEDICAL_FEATURE_ENABLED ? [{ to: "/sub/profile/medical", label: "Medical" }] : []),
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    group: "System",
    items: [
      { to: "/admin", label: "Console" },
      { to: "/admin/cron", label: "Cron" },
    ],
  },
];
