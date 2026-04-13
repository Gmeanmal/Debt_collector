import { Link } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";

export function PendingEntryTributeRoute() {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-8">
      <div className="w-full max-w-md mx-auto">
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
            <Link
              to="/sub/payments/new"
              className="block w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors"
            >
              Declare payment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
