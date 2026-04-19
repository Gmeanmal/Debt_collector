import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import type { KinkRating } from "@/services/kinks/kinksApi";

interface Props {
  itemLabel: string;
  pendingRating: Extract<KinkRating, "loves" | "fetish_need">;
  onConfirm: () => void;
  onCancel: () => void;
}

const RATING_DISPLAY: Record<Props["pendingRating"], string> = {
  loves: "+",
  fetish_need: "++",
};

export function ConsentAckModal({ itemLabel, pendingRating, onConfirm, onCancel }: Props) {
  const [consented, setConsented] = useState(false);

  return (
    <Modal title="Acknowledge and consent" onClose={onCancel} size="sm">
      <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-4">
        <p className="text-sm text-text-mute">
          This activity can cause permanent harm. By rating{" "}
          <strong className="text-text">{itemLabel}</strong> as{" "}
          <strong className="text-accent-deep">{RATING_DISPLAY[pendingRating]}</strong>, you confirm
          that you understand the risks and give informed consent.
        </p>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="accent-accent h-4 w-4"
            aria-label="I understand and consent"
          />
          <span className="text-sm text-text">I understand and consent</span>
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={!consented}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
