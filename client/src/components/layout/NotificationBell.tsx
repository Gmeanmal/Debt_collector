import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type NotificationOut,
} from "@/services/notifications/notificationsApi";
import { FILTER_KINDS, type ChipId } from "@/services/notifications/notificationKinds";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useNotificationsSocket } from "@/hooks/useNotificationsSocket";
import { queryKeys } from "@/lib/queryKeys";
import { NotificationFilterChips } from "@/components/layout/NotificationFilterChips";
import { NotificationItem } from "@/components/layout/NotificationItem";

interface NotificationBellProps {
  enabled: boolean;
}

const VISIBLE_LIMIT = 20;

function filterByChip(items: NotificationOut[], chip: ChipId): NotificationOut[] {
  if (chip === "all") return items;
  const types = FILTER_KINDS[chip];
  return items.filter((n) => (types as string[]).includes(n.type));
}

export function NotificationBell({ enabled }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<ChipId>("all");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items = useNotificationsStore((s) => s.items);
  const unread = useNotificationsStore((s) => s.unread);
  const replaceAll = useNotificationsStore((s) => s.replaceAll);
  const markReadLocal = useNotificationsStore((s) => s.markRead);

  useNotificationsSocket(enabled);

  const seedQuery = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: listNotificationsApi,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (seedQuery.data) replaceAll(seedQuery.data.items, seedQuery.data.unread);
  }, [seedQuery.data, replaceAll]);

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

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

  const filtered = filterByChip(items, activeChip).slice(0, VISIBLE_LIMIT);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unread > 0 ? `Notifications · ${unread} unread` : "Notifications · no unread"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-elev border border-line text-text-mute hover:text-text hover:border-line-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unread > 0 && (
          <span
            role="status"
            aria-label={`${unread} unread notifications`}
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-bg"
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-bg-elev border border-line rounded-[10px] shadow-md z-50"
        >
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <span className="font-serif italic text-[18px] leading-none text-text">
              Notifications
            </span>
            <button
              type="button"
              disabled={unread === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-text-mute hover:text-accent-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {markAllMutation.isPending && (
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              )}
              Mark all read
            </button>
          </div>

          <NotificationFilterChips activeChip={activeChip} items={items} onChange={setActiveChip} />

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-sm text-center text-text-mute">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul>
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onSelect={(item) => {
                    void handleSelect(item);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
