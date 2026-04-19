import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/services/auth/useAuth";
import { getSafeword, safewordKey } from "@/services/safeword/safewordApi";
import { formatGBP } from "@/services/format/currency";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";

interface PorchLayoutProps {
  entryTributeAmount: string | number | null | undefined;
}

export function PorchLayout({ entryTributeAmount }: PorchLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: safeword } = useQuery({
    queryKey: [...safewordKey],
    queryFn: getSafeword,
    retry: false,
    throwOnError: false,
  });

  const safewordMissing = !safeword?.word?.trim();
  const formattedAmount = entryTributeAmount != null ? formatGBP(entryTributeAmount) : null;

  function handleDeclare() {
    navigate("/sub/payments/new?kind=entry_tribute");
  }

  return (
    <div className="min-h-screen w-full bg-bg text-text flex items-center justify-center p-6">
      <div className="w-full max-w-[560px] bg-bg-elev border border-line rounded-[10px] shadow-md p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow tone="accent">Your position</Eyebrow>
          <h1 className="font-display italic text-[32px] leading-[1.05] tracking-[-0.02em] text-text">
            Pay your entry tribute
          </h1>
          {formattedAmount != null ? (
            <p className="font-sans text-[14.5px] leading-relaxed text-text-mute">
              <span className="font-display italic text-accent-deep">{formattedAmount}</span>{" "}
              to enter Mean Mal&apos;s house.
            </p>
          ) : (
            <p className="font-sans text-[14.5px] leading-relaxed text-text-mute">
              to enter Mean Mal&apos;s house.
            </p>
          )}
          {user && (
            <p className="font-sans text-[14.5px] leading-relaxed text-text-mute">
              Welcome,{" "}
              <span className="text-accent-deep">{user.display_name}</span>. Declare
              your entry tribute below to unlock full access.
            </p>
          )}
        </div>

        <div className="border-t border-line mt-6 pt-6 flex flex-col gap-3">
          {safewordMissing ? (
            <p className="font-sans text-sm text-warn-ink rounded-[6px] border border-warn-ink/40 bg-warn-bg px-4 py-3 text-left">
              Set a safeword below before paying your entry tribute.
            </p>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleDeclare}
              aria-label="Declare entry tribute"
              className="w-full"
            >
              Declare entry tribute
            </Button>
          )}
          <p className="font-sans text-xs text-text-faint">
            Once your declaration is validated by Goddess, you will be granted full access.
          </p>
        </div>
      </div>
    </div>
  );
}
