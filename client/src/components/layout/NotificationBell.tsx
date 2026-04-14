import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  listNotificationsApi,
  markNotificationReadApi,
  type NotificationOut,
} from "@/services/notifications/notificationsApi";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useNotificationsSocket } from "@/hooks/useNotificationsSocket";

interface NotificationBellProps {
  enabled: boolean;
}

const VISIBLE_LIMIT = 20;

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

export function NotificationBell({ enabled }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const items = useNotificationsStore((s) => s.items);
  const unread = useNotificationsStore((s) => s.unread);
  const replaceAll = useNotificationsStore((s) => s.replaceAll);
  const markReadLocal = useNotificationsStore((s) => s.markRead);

  useNotificationsSocket(enabled);

  const seedQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotificationsApi,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (seedQuery.data) replaceAll(seedQuery.data.items, seedQuery.data.unread);
  }, [seedQuery.data, replaceAll]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleSelect(n: NotificationOut): Promise<void> {
    if (!n.read_at) {
      markReadLocal(n.id);
      try {
        await markNotificationReadApi(n.id);
      } catch {
        // best-effort — local state already updated
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  const visible = items.slice(0, VISIBLE_LIMIT);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-base-text-muted hover:text-pink-primary hover:bg-base-surface-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            role="status"
            aria-label={`${unread} unread notifications`}
            className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-pink-primary text-pink-foreground text-[0.65rem] font-bold flex items-center justify-center"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-base-surface border border-base-border rounded-lg shadow-xl z-50"
        >
          <div className="px-4 py-3 border-b border-base-border flex items-center justify-between">
            <span className="font-semibold text-base-text">Notifications</span>
            <span className="text-xs text-base-text-subtle">{unread} unread</span>
          </div>
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-sm text-center text-base-text-muted">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-base-border">
              {visible.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSelect(n);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-base-surface-raised focus-visible:outline-none focus-visible:bg-base-surface-raised ${
                      n.read_at ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <span
                          aria-hidden="true"
                          className="mt-1.5 w-2 h-2 rounded-full bg-pink-primary flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`text-sm truncate ${
                              n.read_at ? "text-base-text-muted" : "text-base-text font-semibold"
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="text-[0.7rem] text-base-text-subtle flex-shrink-0">
                            {formatRelative(n.created_at)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-base-text-muted line-clamp-2">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
