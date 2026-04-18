import { cn } from "@/lib/utils";
import {
  accentClassForKind,
  iconForKind,
} from "@/services/notifications/notificationKinds";
import type { NotificationOut } from "@/services/notifications/notificationsApi";

interface Props {
  notification: NotificationOut;
  onSelect: (n: NotificationOut) => void;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

function actorLabel(n: NotificationOut): string | null {
  if (n.actor_display_name && n.actor_username) {
    return `${n.actor_display_name} (@${n.actor_username})`;
  }
  if (n.actor_display_name) return n.actor_display_name;
  if (n.actor_username) return `@${n.actor_username}`;
  return null;
}

export function NotificationItem({ notification: n, onSelect }: Props) {
  const Icon = iconForKind(n.type);
  const accent = accentClassForKind(n.type);
  const isUnread = !n.read_at;
  const actor = actorLabel(n);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(n)}
        className={cn(
          "w-full text-left px-4 py-3 border-l-2 transition-colors",
          "hover:bg-base-surface-raised focus-visible:outline-none focus-visible:bg-base-surface-raised",
          isUnread ? "bg-base-surface-raised" : "opacity-70",
          accent,
        )}
      >
        <div className="flex items-start gap-2">
          <Icon
            aria-hidden="true"
            className="w-4 h-4 mt-0.5 flex-shrink-0 text-base-text-muted"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "text-sm truncate",
                  isUnread ? "text-base-text font-semibold" : "text-base-text-muted",
                )}
              >
                {n.title}
              </span>
              <span className="text-[0.7rem] text-base-text-subtle flex-shrink-0">
                {formatRelative(n.created_at)}
              </span>
            </div>
            {actor && (
              <p className="mt-0.5 text-xs text-base-text-subtle truncate">{actor}</p>
            )}
            {n.body && (
              <p className="mt-0.5 text-xs text-base-text-muted line-clamp-2">{n.body}</p>
            )}
          </div>
          {isUnread && (
            <span
              aria-hidden="true"
              className="mt-1.5 w-2 h-2 rounded-full bg-pink-primary flex-shrink-0"
            />
          )}
        </div>
      </button>
    </li>
  );
}
