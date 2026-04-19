import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { MedicalConsentGate } from "@/components/medical/MedicalConsentGate";
import { MedicalEditForm } from "@/components/medical/MedicalEditForm";
import { getOwnMedical, medicalKey } from "@/services/medical/medicalApi";
import { ConsentRequiredError } from "@/api/medical";
import { MEDICAL_FEATURE_ENABLED } from "@/services/featureFlags";

interface ConsentState {
  bodyMd: string;
  consentTextId: string;
}

export function MedicalRoute() {
  if (!MEDICAL_FEATURE_ENABLED) {
    return <MedicalPlaceholder />;
  }
  return <MedicalRouteBody />;
}

function MedicalPlaceholder() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Profile · Medical"]}
          title="Medical information"
        />
        <div className="bg-bg-sunken border border-line rounded-[10px] p-[18px]">
          <p className="text-text">
            Medical module coming soon — your data has not been collected.
          </p>
        </div>
      </div>
    </div>
  );
}

function MedicalRouteBody() {
  const [consentState, setConsentState] = useState<ConsentState | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: medicalKey.own(),
    queryFn: getOwnMedical,
    retry: false,
    throwOnError: false,
  });

  const consentError = error instanceof ConsentRequiredError ? error : null;

  function handleConsentAccepted() {
    setConsentState(null);
    setConsentAccepted(true);
    void refetch();
  }

  const resolvedConsentState =
    consentState ??
    (consentError
      ? { bodyMd: consentError.detail.bodyMd, consentTextId: consentError.detail.consentTextId }
      : null);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Profile · Medical"]}
          title="Medical information"
          description="Your encrypted health details — accessible to your goddess only in an emergency."
        />

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
              <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <MedicalEditForm current={data} />
          </div>
        )}
      </div>
    </div>
  );
}
