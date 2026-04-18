import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SafewordRecord } from "@/services/safeword/safewordApi";
import type { LimitItem, TriggerItem } from "@/services/limits/limitsApi";

interface Props {
  safeword: SafewordRecord | undefined;
  limits: LimitItem[];
  triggers: TriggerItem[];
}

function SafewordPreview({ safeword }: { safeword: SafewordRecord | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-base-text-muted">
        Safeword
      </p>
      {safeword ? (
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="text-base-text-muted w-32 shrink-0">Word</dt>
            <dd className="text-base-text font-medium">{safeword.word}</dd>
          </div>
          {safeword.signal && (
            <div className="flex gap-2">
              <dt className="text-base-text-muted w-32 shrink-0">Physical signal</dt>
              <dd className="text-base-text">{safeword.signal}</dd>
            </div>
          )}
          {safeword.emergency_contact_name && (
            <div className="flex gap-2">
              <dt className="text-base-text-muted w-32 shrink-0">Emergency contact</dt>
              <dd className="text-base-text">{safeword.emergency_contact_name}</dd>
            </div>
          )}
          {safeword.emergency_contact_phone && (
            <div className="flex gap-2">
              <dt className="text-base-text-muted w-32 shrink-0">Contact phone</dt>
              <dd className="text-base-text">{safeword.emergency_contact_phone}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-base-text-muted italic">No safeword set yet.</p>
      )}
    </div>
  );
}

function LimitsPreview({ limits }: { limits: LimitItem[] }) {
  if (limits.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-base-text-muted">
          Limits
        </p>
        <p className="text-sm text-base-text-muted italic">No limits added yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-base-text-muted">
        Limits
      </p>
      <ul className="flex flex-col gap-2">
        {limits.map((l) => (
          <li key={l.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={l.kind === "hard" ? "destructive" : "secondary"}>
                {l.kind}
              </Badge>
              <Badge variant="outline">{l.severity}</Badge>
              {l.acknowledged_by_goddess_at && (
                <Badge variant="outline" className="text-status-success border-status-success/50">
                  acknowledged
                </Badge>
              )}
            </div>
            <p className="text-sm text-base-text whitespace-pre-wrap">{l.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TriggersPreview({ triggers }: { triggers: TriggerItem[] }) {
  if (triggers.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-base-text-muted">
          Triggers
        </p>
        <p className="text-sm text-base-text-muted italic">No triggers added yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-base-text-muted">
        Triggers
      </p>
      <ul className="flex flex-col gap-2">
        {triggers.map((t) => (
          <li key={t.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t.severity}</Badge>
            </div>
            <p className="text-sm text-base-text">{t.trigger_text}</p>
            {t.notes && <p className="text-xs text-base-text-muted">{t.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GoddessPreviewPanel({ safeword, limits, triggers }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What your goddess sees</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SafewordPreview safeword={safeword} />
        <div className="border-t border-base-border/40" />
        <LimitsPreview limits={limits} />
        <div className="border-t border-base-border/40" />
        <TriggersPreview triggers={triggers} />
      </CardContent>
    </Card>
  );
}
