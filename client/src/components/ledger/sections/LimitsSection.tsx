import { useQuery } from "@tanstack/react-query";
import {
  getLimits,
  getTriggers,
  limitsKey,
  triggersKey,
  type LimitItem,
  type LimitKind,
  type LimitSeverity,
  type TriggerItem,
} from "@/services/limits/limitsApi";
import { getSafeword, safewordKey } from "@/services/safeword/safewordApi";
import { formatLondon } from "@/services/format/datetime";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

const KIND_LABEL: Record<LimitKind, string> = {
  hard: "Hard limit",
  soft: "Soft limit",
};

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "debt"
  | "neutral"
  | "ok"
  | "warn"
  | "bad"
  | "pink"
  | "ink"
  | "gold";

const KIND_VARIANT: Record<LimitKind, BadgeVariant> = {
  hard: "bad",
  soft: "warn",
};

const SEVERITY_LABEL: Record<LimitSeverity, string> = {
  low: "Low severity",
  medium: "Medium severity",
  high: "High severity",
};

function LimitRow({ limit }: { limit: LimitItem }) {
  return (
    <li className="flex flex-col gap-1 py-2 border-b border-line/40 last:border-b-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-text">{limit.body}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={KIND_VARIANT[limit.kind]}>{KIND_LABEL[limit.kind]}</Badge>
          <Badge variant="neutral">{SEVERITY_LABEL[limit.severity]}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-text-mute">
        {limit.acknowledged_by_goddess_at ? (
          <span className="text-ok-ink">
            Acknowledged by goddess on {formatLondon(limit.acknowledged_by_goddess_at, "date")}
          </span>
        ) : (
          <span className="text-warn-ink">Awaiting goddess acknowledgement</span>
        )}
      </div>
    </li>
  );
}

function TriggerRow({ trigger }: { trigger: TriggerItem }) {
  return (
    <li className="flex items-start justify-between gap-2 py-2 border-b border-line/40 last:border-b-0">
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-text">{trigger.trigger_text}</span>
        {trigger.notes && <span className="text-xs text-text-mute">{trigger.notes}</span>}
      </div>
      <Badge variant="warn">{SEVERITY_LABEL[trigger.severity]}</Badge>
    </li>
  );
}

export function LimitsSection() {
  const limitsQuery = useQuery({ queryKey: limitsKey, queryFn: getLimits });
  const triggersQuery = useQuery({ queryKey: triggersKey, queryFn: getTriggers });
  const safewordQuery = useQuery({
    queryKey: safewordKey,
    queryFn: getSafeword,
    retry: false,
  });

  const limits = limitsQuery.data ?? [];
  const triggers = triggersQuery.data ?? [];
  const safeword = safewordQuery.data;
  const mostRecentUpdate = [
    ...limits.map((l) => l.updated_at),
    ...triggers.map((t) => t.updated_at),
    safeword?.updated_at,
  ]
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();

  const isLoading = limitsQuery.isLoading || triggersQuery.isLoading || safewordQuery.isLoading;
  const firstError =
    (limitsQuery.error as Error | undefined) ??
    (triggersQuery.error as Error | undefined) ??
    undefined;

  return (
    <LedgerSection title="Limits, triggers & safeword" updatedAt={mostRecentUpdate}>
      {isLoading && <LedgerLoading />}
      {!isLoading && firstError && <LedgerError message={firstError.message} />}
      {!isLoading && !firstError && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-text-mute uppercase tracking-wide mb-2">Limits</p>
            {limits.length === 0 ? (
              <LedgerEmpty message="No limits recorded." />
            ) : (
              <ul className="flex flex-col">
                {limits.map((l) => (
                  <LimitRow key={l.id} limit={l} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs text-text-mute uppercase tracking-wide mb-2">Triggers</p>
            {triggers.length === 0 ? (
              <LedgerEmpty message="No triggers recorded." />
            ) : (
              <ul className="flex flex-col">
                {triggers.map((t) => (
                  <TriggerRow key={t.id} trigger={t} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs text-text-mute uppercase tracking-wide mb-2">Safeword</p>
            {!safeword ? (
              <LedgerEmpty message="No safeword set." />
            ) : (
              <div className="bg-bg-sunken border border-line rounded p-3 flex flex-col gap-1">
                <p className="text-sm text-text">
                  <span className="font-semibold">Word:</span> {safeword.word}
                </p>
                {safeword.signal && (
                  <p className="text-sm text-text-mute">
                    <span className="font-semibold">Non-verbal signal:</span> {safeword.signal}
                  </p>
                )}
                {safeword.emergency_contact_name && (
                  <p className="text-sm text-text-mute">
                    <span className="font-semibold">Emergency contact:</span>{" "}
                    {safeword.emergency_contact_name}
                    {safeword.emergency_contact_phone
                      ? ` · ${safeword.emergency_contact_phone}`
                      : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </LedgerSection>
  );
}
