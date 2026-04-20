import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Money } from "@/components/ui/money";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import type {
  DeclarationSource,
  PaymentCategory,
  PaymentOut,
} from "@/services/payments/paymentsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";
import { cn } from "@/lib/utils";

const CATEGORIES: PaymentCategory[] = ["entry", "tribute"];

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
  ingested: "Auto-ingested",
};

type SourceVariant = "pink" | "ink" | "neutral";

const SOURCE_VARIANT: Record<DeclarationSource, SourceVariant> = {
  sub_declared: "pink",
  goddess_recorded: "ink",
  ingested: "neutral",
};

function formatDate(dt: string) {
  return formatLondon(dt, "datetime");
}

function formatAmount(amount: string): string {
  return formatGBP(amount);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

interface PendingValidationRowProps {
  declaration: PaymentOut;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  recategoriseValue: string;
  onRecategoriseChange: (id: string, value: string) => void;
  onValidate: (id: string) => void;
  onReject: (declaration: PaymentOut) => void;
  onOpenProof: (declaration: PaymentOut) => void;
  validateDisabled: boolean;
}

export function PendingValidationRow({
  declaration,
  selected,
  onToggleSelect,
  recategoriseValue,
  onRecategoriseChange,
  onValidate,
  onReject,
  onOpenProof,
  validateDisabled,
}: PendingValidationRowProps) {
  const subName = declaration.sub_display_name ?? "sub";
  const amountLabel = formatAmount(declaration.amount);
  const rowDescriptor = `${subName} for ${amountLabel}`;
  const sourceLabel = SOURCE_LABEL[declaration.source as DeclarationSource] ?? declaration.source;
  const sourceVariant = SOURCE_VARIANT[declaration.source as DeclarationSource] ?? "neutral";
  const proofUrl = declaration.proof_presigned_url ?? null;
  const amountNumber = Number.parseFloat(declaration.amount);

  return (
    <div
      className={cn(
        "bg-bg-elev border border-line rounded-[10px] p-4 flex flex-col gap-3 transition-colors",
        selected && "border-l-2 border-l-accent bg-accent-trace/40",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(declaration.id)}
          aria-label={`Select declaration from ${rowDescriptor}`}
          className="mt-1 accent-accent cursor-pointer"
        />

        {proofUrl ? (
          <button
            type="button"
            onClick={() => onOpenProof(declaration)}
            aria-label={`View proof for ${subName}'s ${amountLabel} declaration`}
            className="shrink-0 rounded-[6px] overflow-hidden border border-line hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            <img
              src={proofUrl}
              alt={`Proof thumbnail for ${subName}'s ${amountLabel} declaration`}
              loading="lazy"
              decoding="async"
              className="h-[72px] w-[72px] object-cover bg-bg-sunken"
            />
          </button>
        ) : (
          <div
            aria-label="No proof attached"
            className="shrink-0 h-[72px] w-[72px] rounded-[6px] border border-dashed border-line bg-bg-sunken/40 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.14em] text-text-faint"
          >
            no proof
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex items-start gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initialsFromName(subName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex flex-col gap-1">
                <span className="font-display italic text-[16px] text-text leading-tight">
                  {subName}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
                  {declaration.category.replace(/_/g, " ")}
                </span>
                <div className="inline-flex items-center gap-2 flex-wrap">
                  <Badge variant={sourceVariant}>{sourceLabel}</Badge>
                  {declaration.method_name && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-mute">
                      {declaration.method_type && (
                        <MethodIcon type={declaration.method_type} size="sm" />
                      )}
                      {declaration.method_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {Number.isFinite(amountNumber) ? (
                <Money value={amountNumber} big tone="accent" />
              ) : (
                <span className="font-display italic text-[18px] text-accent-deep">
                  {amountLabel}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                {formatDate(declaration.declared_at)}
              </span>
            </div>
          </div>

          {declaration.note && (
            <p className="font-serif italic text-sm text-text-mute">{declaration.note}</p>
          )}

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <select
              value={recategoriseValue}
              onChange={(e) => onRecategoriseChange(declaration.id, e.target.value)}
              aria-label="Recategorise before validating"
              className="h-8 bg-bg-elev border border-line rounded-[6px] px-2 text-xs text-text focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <option value="">Keep category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  → {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <Button
              type="button"
              onClick={() => onValidate(declaration.id)}
              disabled={validateDisabled}
              variant="primary"
              size="sm"
            >
              Approve
            </Button>
            <Button type="button" onClick={() => onReject(declaration)} variant="soft" size="sm">
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
