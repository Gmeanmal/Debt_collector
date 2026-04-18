import { Badge } from "@/components/ui/badge";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import type {
  DeclarationSource,
  PaymentCategory,
  PaymentOut,
} from "@/services/payments/paymentsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

const CATEGORIES: PaymentCategory[] = ["entry", "tribute"];

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
  ingested: "Auto-ingested",
};

type BadgeVariant = "default" | "primary" | "debt";

const SOURCE_VARIANT: Record<DeclarationSource, BadgeVariant> = {
  sub_declared: "default",
  goddess_recorded: "debt",
  ingested: "default",
};

function formatDate(dt: string) {
  return formatLondon(dt, "datetime");
}

function formatAmount(amount: string): string {
  return formatGBP(amount);
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
  const sourceVariant = SOURCE_VARIANT[declaration.source as DeclarationSource] ?? "default";
  const proofUrl = declaration.proof_presigned_url ?? null;

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(declaration.id)}
          aria-label={`Select declaration from ${rowDescriptor}`}
          className="mt-1 accent-pink-primary cursor-pointer"
        />

        {proofUrl ? (
          <button
            type="button"
            onClick={() => onOpenProof(declaration)}
            aria-label={`View proof for ${subName}'s ${amountLabel} declaration`}
            className="shrink-0 rounded overflow-hidden border border-base-border hover:border-pink-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary transition-colors"
          >
            <img
              src={proofUrl}
              alt={`Proof thumbnail for ${subName}'s ${amountLabel} declaration`}
              loading="lazy"
              decoding="async"
              className="h-[72px] w-[72px] object-cover bg-base-surface-raised"
            />
          </button>
        ) : (
          <div
            aria-label="No proof attached"
            className="shrink-0 h-[72px] w-[72px] rounded border border-dashed border-base-border bg-base-surface-raised flex items-center justify-center text-[10px] uppercase tracking-wider text-base-text-subtle"
          >
            no proof
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-base-text text-sm">
                {subName} — {amountLabel}
              </p>
              <p className="text-xs text-base-text-muted capitalize mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
                <span>
                  {declaration.category.replace(/_/g, " ")} · {formatDate(declaration.declared_at)}
                </span>
                {declaration.method_name && (
                  <span className="inline-flex items-center gap-1.5">
                    ·
                    {declaration.method_type && (
                      <MethodIcon type={declaration.method_type} size="sm" />
                    )}
                    {declaration.method_name}
                  </span>
                )}
              </p>
              <Badge variant={sourceVariant} className="mt-1">
                {sourceLabel}
              </Badge>
              {declaration.note && (
                <p className="text-xs text-base-text-subtle italic mt-1">{declaration.note}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 items-end">
              <select
                value={recategoriseValue}
                onChange={(e) => onRecategoriseChange(declaration.id, e.target.value)}
                aria-label="Recategorise before validating"
                className="bg-base-surface-raised border border-base-border rounded px-2 py-1 text-xs text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
              >
                <option value="">Keep category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    → {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onValidate(declaration.id)}
                  disabled={validateDisabled}
                  className="px-3 py-1 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
                >
                  Validate
                </button>
                <button
                  type="button"
                  onClick={() => onReject(declaration)}
                  className="px-3 py-1 text-xs bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
