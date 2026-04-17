import { Avatar } from "@/components/profile/Avatar";

// TODO(backend): no list-by-sub photos endpoint exists yet (GET /goddess/subs/{sub_id}/photos).
// When B5 list-by-sub is shipped, fetch the most recent approved photo and render it here.

// TODO(backend): GoddessSub from listGoddessSubsApi does not expose real_name.
// When the backend exposes it, add it to the identity strip below (goddess-only mask).

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-status-success/15 text-status-success border-status-success/30",
  blacklisted: "bg-debt-muted text-status-danger border-debt-ring",
  pending_entry_tribute: "bg-status-warning/15 text-status-warning border-status-warning/30",
  deleted: "bg-base-surface-raised text-base-text-muted border-base-border",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

interface SubProfileCardProps {
  sub: {
    display_name: string;
    username: string;
    status: string;
    avatar_key?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  isLoading?: boolean;
}

export function SubProfileCard({ sub, isLoading = false }: SubProfileCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-base-surface-raised animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 rounded bg-base-surface-raised animate-pulse" />
          <div className="h-4 w-24 rounded bg-base-surface-raised animate-pulse" />
        </div>
      </div>
    );
  }

  const statusClass = STATUS_CLASSES[sub.status] ?? "";

  return (
    <div className="flex items-start gap-4">
      <Avatar user={sub} size="lg" />
      <div className="flex flex-col gap-1.5 min-w-0">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider truncate">
          {sub.display_name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-base-text-muted">@{sub.username}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusClass}`}
          >
            {statusLabel(sub.status)}
          </span>
        </div>
        {(sub.first_name ?? sub.last_name) && (
          <p className="text-sm text-base-text-muted">
            {[sub.first_name, sub.last_name].filter(Boolean).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}
