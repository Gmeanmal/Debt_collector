import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  onReady: (dataUrl: string) => void;
  disabled?: boolean;
}

const btnBase =
  "px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 focus-visible:ring-2";

export function SignaturePad({ onReady, disabled }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleSave = () => {
    const pad = sigRef.current;
    if (!pad || pad.isEmpty()) return;
    const dataUrl = pad.toDataURL("image/png");
    onReady(dataUrl);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="border-2 border-neutral-300 rounded bg-white inline-block w-fit">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{ width: 600, height: 200, className: "block" }}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className={`${btnBase} bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover focus-visible:ring-pink-primary`}
        >
          Save signature
        </button>
      </div>
    </div>
  );
}
