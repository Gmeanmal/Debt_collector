import { create } from "zustand";
import type { NotificationOut } from "@/services/notifications/notificationsApi";

interface NotificationsState {
  items: NotificationOut[];
  unread: number;
  add: (notification: NotificationOut) => void;
  replaceAll: (items: NotificationOut[], unread: number) => void;
  markRead: (id: string) => void;
}

function sortNewestFirst(items: NotificationOut[]): NotificationOut[] {
  return [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unread: 0,
  add: (notification) =>
    set((state) => {
      if (state.items.some((n) => n.id === notification.id)) return state;
      const items = sortNewestFirst([notification, ...state.items]);
      const unread = notification.read_at ? state.unread : state.unread + 1;
      return { items, unread };
    }),
  replaceAll: (items, unread) => set({ items: sortNewestFirst(items), unread }),
  markRead: (id) =>
    set((state) => {
      const target = state.items.find((n) => n.id === id);
      if (!target || target.read_at) return state;
      const now = new Date().toISOString();
      const items = state.items.map((n) => (n.id === id ? { ...n, read_at: now } : n));
      const unread = Math.max(0, state.unread - 1);
      return { items, unread };
    }),
}));
