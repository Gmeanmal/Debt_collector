import { Link } from "react-router-dom";
import { SubRollingSection } from "@/components/subDetail/SubRollingSection";
import { SubContractsSection } from "@/components/subDetail/SubContractsSection";
import { SubPaymentsSection } from "@/components/subDetail/SubPaymentsSection";
import { TributeGauge } from "@/components/goddess/TributeGauge";
import { SessionCompleteToggle } from "@/components/goddess/SessionCompleteToggle";
import { MedicalRevealPanel } from "@/components/goddess/MedicalRevealPanel";

interface Props {
  subId: string;
  status: string;
}

export function SubOverviewTab({ subId, status }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <TributeGauge subId={subId} />
      {status === "active" && (
        <div className="flex items-center justify-end gap-3">
          <SessionCompleteToggle subId={subId} />
          <Link
            to={`/goddess/subs/${subId}/breach`}
            className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            Breach sub
          </Link>
        </div>
      )}
      <MedicalRevealPanel subId={subId} />
      <SubRollingSection subId={subId} />
      <SubContractsSection subId={subId} />
      <SubPaymentsSection subId={subId} />
    </div>
  );
}
