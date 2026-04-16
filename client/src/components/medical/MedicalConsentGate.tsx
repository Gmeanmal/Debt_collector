import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptMedicalConsent } from "@/services/medical/medicalApi";

interface MedicalConsentGateProps {
  bodyMd: string;
  consentTextId: string;
  onAccepted: () => void;
}

export function MedicalConsentGate({ bodyMd, consentTextId, onAccepted }: MedicalConsentGateProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleAccept() {
    setIsPending(true);
    try {
      await acceptMedicalConsent(consentTextId);
      toast.success("Consent recorded. You may now access your medical information.");
      onAccepted();
    } catch {
      toast.error("Failed to record consent. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-pink-primary">Medical information consent</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-base-text-muted">
          Before accessing or updating your medical information, you must accept the following
          consent.
        </p>
        <pre className="whitespace-pre-wrap text-sm text-base-text bg-base-surface-raised rounded-md p-4 border border-base-border overflow-auto max-h-64">
          {bodyMd}
        </pre>
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            disabled={isPending}
            onClick={() => void handleAccept()}
          >
            {isPending ? "Recording…" : "I accept"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
