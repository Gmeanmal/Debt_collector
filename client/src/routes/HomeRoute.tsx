import { useAuth } from "@/services/auth/useAuth";

export function HomeRoute() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="bg-base-surface border border-base-border rounded-lg p-8 text-center flex flex-col gap-4">
        <h1 className="font-display text-2xl text-pink-primary">Debt Collector</h1>
        {user && (
          <p className="text-base-text">
            Hello, <span className="text-pink-primary font-semibold">{user.display_name}</span>
          </p>
        )}
        <button
          onClick={logout}
          className="mt-2 text-sm text-base-text-muted hover:text-pink-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
