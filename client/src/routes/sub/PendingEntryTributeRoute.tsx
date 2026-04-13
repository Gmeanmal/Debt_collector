import { useAuth } from "@/services/auth/useAuth";

export function PendingEntryTributeRoute() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-8 shadow-[var(--shadow-card)] flex flex-col gap-6 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-base-text font-semibold text-lg">Account pending</p>
            {user && (
              <p className="text-base-text-muted text-sm">
                Welcome,{" "}
                <span className="text-pink-primary font-semibold">{user.display_name}</span>.
              </p>
            )}
            <p className="text-base-text-muted text-sm">
              Your account is awaiting your entry tribute. Once your payment is declared and
              validated by Goddess, you will be granted full access.
            </p>
          </div>

          <div className="border-t border-base-border pt-4">
            <p className="text-base-text-subtle text-xs mb-4">
              Payment declaration is available in the next phase.
            </p>
            <button
              disabled
              className="w-full bg-pink-muted text-pink-primary font-semibold py-2 px-4 rounded-md opacity-50 cursor-not-allowed"
              aria-label="Declare payment — coming soon"
            >
              Declare payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
