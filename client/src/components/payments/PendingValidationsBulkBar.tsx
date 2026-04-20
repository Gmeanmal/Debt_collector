import { Button } from "@/components/ui/button";

interface PendingValidationsBulkBarProps {
  selectedCount: number;
  onValidateSelected: () => void;
  isPending: boolean;
}

export function PendingValidationsBulkBar({
  selectedCount,
  onValidateSelected,
  isPending,
}: PendingValidationsBulkBarProps) {
  if (selectedCount === 0) return null;

  const label = isPending ? `Validating ${selectedCount}…` : `Validate selected (${selectedCount})`;

  return (
    <div
      role="region"
      aria-label="Bulk validation actions"
      className="bg-bg-elev border border-line rounded-[10px] px-4 py-2 flex items-center gap-3"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
        Selected
      </span>
      <span className="font-mono text-[11px] text-text tabular-nums">{selectedCount}</span>
      <Button
        type="button"
        onClick={onValidateSelected}
        disabled={isPending}
        variant="primary"
        size="sm"
      >
        {label}
      </Button>
    </div>
  );
}

interface PendingValidationsSelectAllProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (next: boolean) => void;
  totalCount: number;
  selectedCount: number;
}

export function PendingValidationsSelectAll({
  allSelected,
  someSelected,
  onToggleAll,
  totalCount,
  selectedCount,
}: PendingValidationsSelectAllProps) {
  function handleChange(next: boolean) {
    onToggleAll(next);
  }

  return (
    <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-line py-2 flex items-center gap-3">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected && !allSelected;
        }}
        onChange={(e) => handleChange(e.target.checked)}
        aria-label="Select all pending declarations"
        className="accent-accent cursor-pointer"
      />
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
        {selectedCount > 0 ? `${selectedCount} of ${totalCount} selected` : `${totalCount} pending`}
      </span>
    </div>
  );
}
