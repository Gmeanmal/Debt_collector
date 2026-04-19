import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { getWeeklyPaymentDetailApi, type WeeklyPaymentDetail } from "@/services/goddess/weeklyApi";
import { listGoddessSubsApi, type DeclarationSource } from "@/services/payments/paymentsApi";
import { buildWeeklyCsvBlob, weeklyCsvFilename } from "@/services/goddess/weeklyCsv";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";

function formatMondayLabel(weekStart: string): string {
  return formatLondon(weekStart, "date");
}

function triggerCsvDownload(payments: WeeklyPaymentDetail[], weekStart: string) {
  const blob = buildWeeklyCsvBlob(payments);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = weeklyCsvFilename(weekStart);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map((p) => p.charAt(0).toUpperCase()).join("");
  return chars || "·";
}

function sumByPredicate(
  payments: WeeklyPaymentDetail[],
  predicate: (source: DeclarationSource) => boolean,
): number {
  return payments.reduce((acc, p) => (predicate(p.source) ? acc + Number(p.amount) : acc), 0);
}

interface SubRowData {
  subId: string;
  displayName: string;
  username: string | undefined;
  total: number;
  count: number;
}

function groupBySub(
  payments: WeeklyPaymentDetail[],
  usernameById: Map<string, string>,
): SubRowData[] {
  const map = new Map<string, SubRowData>();
  for (const p of payments) {
    const existing = map.get(p.sub_id);
    const amount = Number(p.amount);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      map.set(p.sub_id, {
        subId: p.sub_id,
        displayName: p.sub_display_name ?? "Unknown sub",
        username: usernameById.get(p.sub_id),
        total: amount,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

interface WeeklyDetailPanelProps {
  weekStart: string;
  bucketTotal: string;
  bucketCount: number;
  onClose?: () => void;
}

export function WeeklyDetailPanel({ weekStart, bucketTotal, bucketCount }: WeeklyDetailPanelProps) {
  const headerId = `weekly-detail-header-${weekStart}`;
  const mondayLabel = formatMondayLabel(weekStart);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.weeklyPaymentsDetail(weekStart),
    queryFn: () => getWeeklyPaymentDetailApi(weekStart),
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
    staleTime: 60_000,
  });

  const usernameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subs) map.set(s.id, s.username);
    return map;
  }, [subs]);

  const payments = useMemo<WeeklyPaymentDetail[]>(() => data ?? [], [data]);
  const canExport = payments.length > 0;

  const declaredTotal = useMemo(
    () => sumByPredicate(payments, (s) => s === "sub_declared" || s === "ingested"),
    [payments],
  );
  const recordedTotal = useMemo(
    () => sumByPredicate(payments, (s) => s === "goddess_recorded"),
    [payments],
  );
  const subRows = useMemo(() => groupBySub(payments, usernameById), [payments, usernameById]);
  const intakeValue = Number(bucketTotal);

  function handleExport() {
    if (canExport) triggerCsvDownload(payments, weekStart);
  }

  return (
    <section
      aria-labelledby={headerId}
      className="bg-bg-elev border border-line rounded-[10px] p-5 flex flex-col gap-5"
    >
      <header className="flex flex-col gap-2">
        <Eyebrow tone="accent">The ledger</Eyebrow>
        <h2
          id={headerId}
          className="font-display italic text-[22px] tracking-[-0.01em] text-text leading-[1.1]"
        >
          Week of {mondayLabel}
        </h2>
        <p className="text-sm text-text-mute">
          {bucketCount} {bucketCount === 1 ? "payment" : "payments"} this week
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Intake" value={<Money value={intakeValue} big />} />
        <Stat label="Declared" value={<Money value={declaredTotal} big />} />
        <Stat
          label="Recorded"
          value={<Money value={recordedTotal} big tone="accent" />}
          tone="accent"
        />
      </div>

      {isLoading && <ListSkeleton rows={3} />}

      {isError && (
        <ErrorState
          title="Failed to load week detail"
          message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
        />
      )}

      {!isLoading && !isError && payments.length === 0 && (
        <EmptyState
          title="No tributes this week."
          message="Nothing has been validated inside this week yet."
        />
      )}

      {!isLoading && !isError && payments.length > 0 && (
        <>
          <Divider label="Per sub" />
          <ul className="flex flex-col gap-2">
            {subRows.map((row) => (
              <SubSummaryRow key={row.subId} row={row} />
            ))}
          </ul>
        </>
      )}

      <div className="flex justify-end pt-2 border-t border-line">
        <Button variant="soft" size="sm" onClick={handleExport} disabled={!canExport}>
          Export CSV
        </Button>
      </div>
    </section>
  );
}

interface SubSummaryRowProps {
  row: SubRowData;
}

function SubSummaryRow({ row }: SubSummaryRowProps) {
  const countLabel = `${row.count} ${row.count === 1 ? "payment" : "payments"}`;

  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initialsFor(row.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="font-display italic text-[15px] text-text truncate">
            {row.displayName}
          </span>
          {row.username && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              @{row.username}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <Money value={row.total} />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-mute">
          {countLabel}
        </span>
      </div>
    </li>
  );
}
