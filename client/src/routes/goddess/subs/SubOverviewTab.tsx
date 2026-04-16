import { Link } from "react-router-dom";
import { SubRollingSection } from "@/components/subDetail/SubRollingSection";
import { SubContractsSection } from "@/components/subDetail/SubContractsSection";
import { SubPaymentsSection } from "@/components/subDetail/SubPaymentsSection";
import { TributeGauge } from "@/components/goddess/TributeGauge";

interface Props {
  subId: string;
  status: string;
}

export function SubOverviewTab({ subId, status }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <TributeGauge subId={subId} />
      {status === "active" && (
        <div className="flex justify-end">
          <Link
            to={`/goddess/subs/${subId}/breach`}
            className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            Breach sub
          </Link>
        </div>
      )}
      <SubRollingSection subId={subId} />
      <SubContractsSection subId={subId} />
      <SubPaymentsSection subId={subId} />
    </div>
  );
}
