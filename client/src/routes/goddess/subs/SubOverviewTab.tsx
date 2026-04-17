import { useState } from "react";
import { SubRollingSection } from "@/components/subDetail/SubRollingSection";
import { SubContractsSection } from "@/components/subDetail/SubContractsSection";
import { SubPaymentsSection } from "@/components/subDetail/SubPaymentsSection";
import { TributeGauge } from "@/components/goddess/TributeGauge";
import { SessionCompleteToggle } from "@/components/goddess/SessionCompleteToggle";
import { MedicalRevealPanel } from "@/components/goddess/MedicalRevealPanel";
import { DangerZonePanel } from "@/components/goddess/DangerZonePanel";
import { SurprisePenaltyFlow } from "@/components/contracts/SurprisePenaltyFlow";
import { Button } from "@/components/ui/button";
import { MEDICAL_FEATURE_ENABLED } from "@/services/featureFlags";

interface Props {
  subId: string;
  username: string;
  status: string;
}

export function SubOverviewTab({ subId, username, status }: Props) {
  const [showPenaltyFlow, setShowPenaltyFlow] = useState(false);
  const [banner, setBanner] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <TributeGauge subId={subId} />

      {status === "active" && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              type="button"
              onClick={() => setShowPenaltyFlow(true)}
              aria-label="Add surprise penalty"
            >
              Surprise penalty
            </Button>
          </div>
          <SessionCompleteToggle subId={subId} />
        </div>
      )}

      {banner && (
        <p
          role="status"
          className={`text-sm rounded-md px-4 py-2 border ${
            banner.kind === "success"
              ? "bg-status-success/10 text-status-success border-status-success/30"
              : "bg-debt-muted text-status-danger border-debt-ring"
          }`}
        >
          {banner.msg}
        </p>
      )}

      {MEDICAL_FEATURE_ENABLED && <MedicalRevealPanel subId={subId} />}
      <SubRollingSection subId={subId} username={username} />
      <SubContractsSection subId={subId} username={username} />
      <SubPaymentsSection subId={subId} />

      {status === "active" && <DangerZonePanel subId={subId} username={username} />}

      {showPenaltyFlow && (
        <SurprisePenaltyFlow
          subId={subId}
          onClose={() => setShowPenaltyFlow(false)}
          onBanner={(msg, kind) => {
            setBanner({ msg, kind });
            setTimeout(() => setBanner(null), 5000);
          }}
        />
      )}
    </div>
  );
}
