import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revealSubMedicalApi, type SubMedicalRevealOut } from "@/services/medical/medicalApi";
import { formatLondon } from "@/services/format/datetime";

interface MedicalRevealPanelProps {
  subId: string;
}

function RevealedField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-[0.08em] text-base-text-subtle">{label}</span>
      <span className="text-sm text-base-text">
        {value ?? <span className="text-base-text-muted italic">Not provided</span>}
      </span>
    </div>
  );
}

export function MedicalRevealPanel({ subId }: MedicalRevealPanelProps) {
  const [isPending, setIsPending] = useState(false);
  const [revealed, setRevealed] = useState<SubMedicalRevealOut | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleReveal() {
    setIsPending(true);
    setNotFound(false);
    try {
      const data = await revealSubMedicalApi(subId);
      setRevealed(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setNotFound(true);
      } else {
        toast.error("Failed to retrieve medical information.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Medical information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-status-warning border border-status-warning/30 bg-status-warning/10 rounded-md px-3 py-2">
          Revealing this information is logged. Use only when medically necessary.
        </p>

        {!revealed && (
          <div className="flex justify-start">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => void handleReveal()}
              aria-label="Reveal medical information"
            >
              {isPending ? "Retrieving…" : "Reveal medical info"}
            </Button>
          </div>
        )}

        {notFound && (
          <p className="text-sm text-base-text-muted">
            This sub has not yet submitted any medical information.
          </p>
        )}

        {revealed && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RevealedField label="Blood type" value={revealed.blood_type} />
              <RevealedField label="Emergency contact" value={revealed.emergency_contact} />
              <RevealedField label="Allergies" value={revealed.allergies} />
              <RevealedField label="Medications" value={revealed.medications} />
            </div>
            <RevealedField label="Additional notes" value={revealed.medical_notes} />
            <p className="text-xs text-base-text-subtle">
              Last updated: {formatLondon(revealed.updated_at, "datetime")}
            </p>
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(null)}
                aria-label="Hide medical information"
              >
                Hide
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
