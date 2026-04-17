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
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
      <div
        role="region"
        aria-label="Bulk validation actions"
        className="pointer-events-auto bg-base-surface border border-base-border rounded-full shadow-[var(--shadow-card)] px-4 py-2 flex items-center gap-3"
      >
        <span className="text-xs text-base-text-muted">{selectedCount} selected</span>
        <button
          type="button"
          onClick={onValidateSelected}
          disabled={isPending}
          className="px-4 py-1.5 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded-full font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
        >
          {label}
        </button>
      </div>
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
    <div className="sticky top-0 z-20 bg-base-bg/95 backdrop-blur-sm border-b border-base-border py-2 flex items-center gap-3">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected && !allSelected;
        }}
        onChange={(e) => handleChange(e.target.checked)}
        aria-label="Select all pending declarations"
        className="accent-pink-primary cursor-pointer"
      />
      <span className="text-xs text-base-text-muted">
        {selectedCount > 0 ? `${selectedCount} of ${totalCount} selected` : `${totalCount} pending`}
      </span>
    </div>
  );
}
