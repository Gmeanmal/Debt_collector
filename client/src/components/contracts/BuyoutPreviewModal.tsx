import { useMutation } from "@tanstack/react-query";
import { ConfirmActionModal } from "@/components/shared/ConfirmActionModal";
import { buyoutPreviewApi, type BuyoutPreviewOut } from "@/services/debtContracts/debtContractsApi";

interface Props {
  contractSlug: string;
  onClose: () => void;
  onBanner?: (msg: string, kind: "success" | "error") => void;
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PreviewContent({ data }: { data: BuyoutPreviewOut }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-base-text-muted">Current balance</span>
        <span className="font-semibold text-base-text">{fmtGbp(data.current_balance)}</span>
      </div>
      <div className="flex justify-between text-pink-primary">
        <span>Exit discount</span>
        <span className="font-semibold">- {fmtGbp(data.payoff_delta)}</span>
      </div>
      <div className="flex justify-between border-t border-base-border pt-1.5 mt-0.5">
        <span className="text-base-text font-medium">Exit amount to pay</span>
        <span className="font-bold text-pink-primary">{fmtGbp(data.exit_amount)}</span>
      </div>
    </div>
  );
}

function BuyoutInstructions() {
  return (
    <p className="text-xs text-base-text-muted mt-1">
      Pay this amount externally, then declare a <span className="font-semibold">buyout</span>{" "}
      payment for your Goddess to validate.
    </p>
  );
}

export function BuyoutPreviewModal({ contractSlug, onClose, onBanner }: Props) {
  const previewMutation = useMutation<BuyoutPreviewOut, Error>({
    mutationFn: () => buyoutPreviewApi(contractSlug),
  });

  const preview = previewMutation.data;

  // Show initial "get quote" state before preview is loaded
  if (!preview && !previewMutation.isPending) {
    return (
      <ConfirmActionModal
        kind="simple"
        title="Request buyout"
        description="Request a current exit-amount quote. This does not settle the debt — you must then declare a buyout payment for your Goddess to validate."
        confirmLabel="Get quote"
        onConfirm={() => previewMutation.mutate()}
        onClose={onClose}
        isLoading={previewMutation.isPending}
        error={previewMutation.isError ? previewMutation.error.message : null}
      />
    );
  }

  if (previewMutation.isPending) {
    return (
      <ConfirmActionModal
        kind="simple"
        title="Request buyout"
        description="Computing exit amount…"
        confirmLabel="Get quote"
        onConfirm={() => undefined}
        onClose={onClose}
        isLoading
      />
    );
  }

  if (preview) {
    return (
      <ConfirmActionModal
        kind="preview"
        title="Buyout quote"
        description={<BuyoutInstructions />}
        previewContent={<PreviewContent data={preview} />}
        confirmLabel="Close"
        cancelLabel="Cancel"
        onConfirm={() => {
          onBanner?.("Quote noted. Declare your buyout payment when ready.", "success");
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  return null;
}
