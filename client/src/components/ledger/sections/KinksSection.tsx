import { useQuery } from "@tanstack/react-query";
import {
  getKinkMatrix,
  kinksKey,
  type KinkMatrix,
  type KinkRating,
} from "@/services/kinks/kinksApi";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

const RATING_LABEL: Record<KinkRating, string> = {
  hard_limit: "Hard limit",
  soft_limit: "Soft limit",
  curious: "Curious",
  loves: "Loves",
  fetish_need: "Fetish / need",
  not_set: "Not set",
  prefer_not_to_say: "Prefer not to say",
};

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "debt";

const RATING_VARIANT: Record<KinkRating, BadgeVariant> = {
  hard_limit: "danger",
  soft_limit: "warning",
  curious: "info",
  loves: "primary",
  fetish_need: "primary",
  not_set: "default",
  prefer_not_to_say: "default",
};

const EXCLUDED_RATINGS = new Set<KinkRating>(["not_set"]);

interface RatedRow {
  label: string;
  category: string;
  rating: KinkRating;
  safety_flag: boolean;
  needs_confirmation: boolean;
}

function flattenRated(matrixData: KinkMatrix): RatedRow[] {
  const rows: RatedRow[] = [];
  for (const cat of matrixData.categories) {
    for (const item of cat.items) {
      if (EXCLUDED_RATINGS.has(item.rating)) continue;
      rows.push({
        label: item.label,
        category: cat.label,
        rating: item.rating,
        safety_flag: item.safety_flag,
        needs_confirmation: item.needs_confirmation,
      });
    }
  }
  return rows;
}

function KinkRow({ row }: { row: RatedRow }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 border-b border-base-border/40 last:border-b-0">
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-base-text">{row.label}</span>
        <span className="text-xs text-base-text-muted">{row.category}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row.safety_flag && (
          <Badge variant="warning" aria-label="Safety-flagged kink">
            Safety
          </Badge>
        )}
        <Badge variant={RATING_VARIANT[row.rating]}>{RATING_LABEL[row.rating]}</Badge>
      </div>
    </li>
  );
}

export function KinksSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: kinksKey,
    queryFn: getKinkMatrix,
  });

  const rows = data ? flattenRated(data) : [];
  const pendingConfirmations = rows.filter((r) => r.needs_confirmation).length;

  return (
    <LedgerSection title="Kinks">
      {isLoading && <LedgerLoading label="Loading kinks…" />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && rows.length === 0 && (
        <LedgerEmpty message="You have not rated any kinks yet." />
      )}
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingConfirmations > 0 && (
            <p className="text-xs text-status-warning">
              {pendingConfirmations} rating{pendingConfirmations === 1 ? "" : "s"} still need your
              explicit consent acknowledgement.
            </p>
          )}
          <ul className="flex flex-col">
            {rows.map((row) => (
              <KinkRow key={`${row.category}-${row.label}`} row={row} />
            ))}
          </ul>
        </div>
      )}
    </LedgerSection>
  );
}
