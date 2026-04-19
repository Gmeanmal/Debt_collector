import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  onReady: (dataUrl: string) => void;
  disabled?: boolean;
}

function resolveTextColor(): string {
  // CSS var always defined by tokens.css; empty string lets the library fall back to its own default.
  return getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
}

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
    <Card className="flex flex-col gap-4 w-fit">
      <div className="border border-line rounded-[6px] bg-bg-sunken overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor={resolveTextColor()}
          canvasProps={{ width: 600, height: 200, className: "block" }}
        />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={disabled}
        >
          Save signature
        </Button>
      </div>
    </Card>
  );
}
