import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

interface PorchLayoutProps {
  entryTributeAmount: string | number | null | undefined;
}

export function PorchLayout({ entryTributeAmount }: PorchLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const formattedAmount =
    entryTributeAmount != null ? GBP.format(Number(entryTributeAmount)) : null;

  function handleDeclare() {
    navigate("/sub/payments/new?kind=entry_tribute");
  }

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="luxe-surface rounded-lg p-8 flex flex-col gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full border border-pink-primary/40 bg-pink-primary/10 flex items-center justify-center">
              <span className="font-display text-2xl text-pink-primary">G</span>
            </div>
            <p className="font-display text-[10px] tracking-[0.3em] uppercase text-pink-primary/70">
              Mean Mal
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="font-display text-2xl font-bold text-base-text tracking-wide">
              Pay your entry tribute
            </h1>
            {formattedAmount != null ? (
              <p className="text-base-text-muted text-base">
                <span className="text-pink-primary font-semibold text-lg">{formattedAmount}</span>{" "}
                to enter Mean Mal&apos;s house
              </p>
            ) : (
              <p className="text-base-text-muted text-base">to enter Mean Mal&apos;s house</p>
            )}
            {user && (
              <p className="text-base-text-subtle text-sm">
                Welcome,{" "}
                <span className="text-pink-primary font-semibold">{user.display_name}</span>.
                Declare your entry tribute below to unlock full access.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-base-border">
            <button
              type="button"
              onClick={handleDeclare}
              className="w-full bg-pink-primary text-pink-foreground font-semibold py-3 px-6 rounded-md hover:bg-pink-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring"
              aria-label="Declare entry tribute"
            >
              Declare entry tribute
            </button>
            <p className="text-xs text-base-text-subtle">
              Once your declaration is validated by Goddess, you will be granted full access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
