import { useQuery } from "@tanstack/react-query";
import {
  getGoddessRateLimitsApi,
  type GoddessRateLimitsOut,
} from "@/services/goddess/rateLimitsApi";
import { queryKeys } from "@/lib/queryKeys";

export type RejectKind = "payment" | "photo" | "profile_change";

const NOUN: Record<RejectKind, string> = {
  payment: "payment",
  photo: "photo",
  profile_change: "profile change",
};

function countFor(data: GoddessRateLimitsOut, kind: RejectKind): number {
  switch (kind) {
    case "payment":
      return data.payment_rejections_today;
    case "photo":
      return data.photo_rejections_today;
    case "profile_change":
      return data.profile_change_rejections_today;
  }
}

/**
 * Returns a warning string when the goddess has rejected ≥ threshold items of this
 * kind today. Returns `undefined` when the count is below threshold or data isn't
 * loaded yet. Callers pass the string straight into `<RejectModal warning={…} />`.
 */
export function useRejectWarning(kind: RejectKind): string | undefined {
  const { data } = useQuery({
    queryKey: queryKeys.goddess.rateLimits(),
    queryFn: getGoddessRateLimitsApi,
    staleTime: 30_000,
  });
  if (!data) return undefined;
  const count = countFor(data, kind);
  if (count < data.rejections_threshold) return undefined;
  const noun = NOUN[kind];
  const plural = count === 1 ? "" : "s";
  return `You've already rejected ${count} ${noun}${plural} today. Take a moment before confirming.`;
}
