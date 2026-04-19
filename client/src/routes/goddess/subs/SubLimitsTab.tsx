import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { queryKeys } from "@/lib/queryKeys";
import {
  getSubLimitsForGoddess,
  getSubTriggersForGoddess,
  getSubSafewordForGoddess,
  type SubSafeword,
} from "@/services/goddessSubDetail/goddessSubDetailApi";
import type { LimitItem, TriggerItem } from "@/services/limits/limitsApi";

interface Props {
  subId: string;
}

function SafewordCard({ safeword }: { safeword: SubSafeword | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Safeword</CardTitle>
      </CardHeader>
      <CardContent>
        {safeword ? (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-base-text-muted w-36 shrink-0">Word</dt>
              <dd className="text-base-text font-medium">{safeword.word}</dd>
            </div>
            {safeword.signal && (
              <div className="flex gap-2">
                <dt className="text-base-text-muted w-36 shrink-0">Physical signal</dt>
                <dd className="text-base-text">{safeword.signal}</dd>
              </div>
            )}
            {safeword.emergency_contact_name && (
              <div className="flex gap-2">
                <dt className="text-base-text-muted w-36 shrink-0">Emergency contact</dt>
                <dd className="text-base-text">{safeword.emergency_contact_name}</dd>
              </div>
            )}
            {safeword.emergency_contact_phone && (
              <div className="flex gap-2">
                <dt className="text-base-text-muted w-36 shrink-0">Contact phone</dt>
                <dd className="text-base-text">{safeword.emergency_contact_phone}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-base-text-muted italic">No safeword set yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LimitsCard({ limits }: { limits: LimitItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Limits</CardTitle>
      </CardHeader>
      <CardContent>
        {limits.length === 0 ? (
          <p className="text-sm text-base-text-muted italic">No limits declared.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {limits.map((l) => (
              <li key={l.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={l.kind === "hard" ? "danger" : "default"}>{l.kind}</Badge>
                  <Badge variant="default">{l.severity}</Badge>
                  {l.acknowledged_by_goddess_at ? (
                    <Badge variant="success">acknowledged</Badge>
                  ) : (
                    <Badge variant="warning">pending ack</Badge>
                  )}
                </div>
                <p className="text-sm text-base-text whitespace-pre-wrap">{l.body}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TriggersCard({ triggers }: { triggers: TriggerItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Triggers</CardTitle>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-sm text-base-text-muted italic">No triggers declared.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {triggers.map((t) => (
              <li key={t.id} className="flex flex-col gap-1">
                <Badge variant="default" className="w-fit">
                  {t.severity}
                </Badge>
                <p className="text-sm text-base-text">{t.trigger_text}</p>
                {t.notes && <p className="text-xs text-base-text-muted">{t.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SubLimitsTab({ subId }: Props) {
  const limitsQuery = useQuery({
    queryKey: queryKeys.subLimits.forSub(subId),
    queryFn: () => getSubLimitsForGoddess(subId),
    enabled: subId.length > 0,
  });

  const triggersQuery = useQuery({
    queryKey: queryKeys.subLimits.triggersForSub(subId),
    queryFn: () => getSubTriggersForGoddess(subId),
    enabled: subId.length > 0,
  });

  const safewordQuery = useQuery({
    queryKey: queryKeys.subLimits.safewordForSub(subId),
    queryFn: () => getSubSafewordForGoddess(subId),
    enabled: subId.length > 0,
    retry: false,
  });

  const isLoading = limitsQuery.isLoading || triggersQuery.isLoading || safewordQuery.isLoading;
  const error = limitsQuery.error ?? triggersQuery.error;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-base-border bg-base-surface-raised animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4">
        <ErrorState
          title="Could not load limits"
          message={error instanceof Error ? error.message : "Unknown error"}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <SafewordCard safeword={safewordQuery.data ?? null} />
      <LimitsCard limits={limitsQuery.data ?? []} />
      <TriggersCard triggers={triggersQuery.data ?? []} />
    </div>
  );
}
