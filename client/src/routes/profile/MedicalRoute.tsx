import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { MedicalConsentGate } from "@/components/medical/MedicalConsentGate";
import { MedicalEditForm } from "@/components/medical/MedicalEditForm";
import { getOwnMedical, medicalKey } from "@/services/medical/medicalApi";
import { ConsentRequiredError } from "@/api/medical";

interface ConsentState {
  bodyMd: string;
  consentTextId: string;
}

export function MedicalRoute() {
  const [consentState, setConsentState] = useState<ConsentState | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: medicalKey.own(),
    queryFn: getOwnMedical,
    retry: false,
    throwOnError: false,
  });

  const consentError =
    error instanceof ConsentRequiredError ? error : null;

  function handleConsentAccepted() {
    setConsentState(null);
    setConsentAccepted(true);
    void refetch();
  }

  const resolvedConsentState = consentState ?? (consentError
    ? { bodyMd: consentError.detail.bodyMd, consentTextId: consentError.detail.consentTextId }
    : null);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Medical information
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Your encrypted health details — accessible to your goddess only in an emergency.
          </p>
        </div>

        {isLoading && <ListSkeleton rows={5} />}

        {!isLoading && !consentAccepted && resolvedConsentState && (
          <MedicalConsentGate
            bodyMd={resolvedConsentState.bodyMd}
            consentTextId={resolvedConsentState.consentTextId}
            onAccepted={handleConsentAccepted}
          />
        )}

        {isError && !consentError && (
          <ErrorState
            title="Failed to load medical information"
            message={error instanceof Error ? error.message : "An unexpected error occurred."}
            cta={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && <MedicalEditForm current={data} />}
      </div>
    </div>
  );
}
