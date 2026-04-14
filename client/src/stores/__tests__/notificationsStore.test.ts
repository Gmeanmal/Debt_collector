import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationsStore } from "@/stores/notificationsStore";
import type { NotificationOut } from "@/services/notifications/notificationsApi";

function makeNotification(overrides: Partial<NotificationOut> = {}): NotificationOut {
  return {
    id: overrides.id ?? "n1",
    type: "contract_proposed",
    title: "t",
    body: "b",
    created_at: overrides.created_at ?? "2026-04-14T10:00:00Z",
    read_at: overrides.read_at ?? null,
    ...overrides,
  } as unknown as NotificationOut;
}

describe("notificationsStore", () => {
  beforeEach(() => {
    useNotificationsStore.setState({ items: [], unread: 0 });
  });

  it("add prepends an unread notification and bumps unread count", () => {
    const n = makeNotification({ id: "a" });
    useNotificationsStore.getState().add(n);

    const state = useNotificationsStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.id).toBe("a");
    expect(state.unread).toBe(1);
  });

  it("add dedupes by id", () => {
    const n = makeNotification({ id: "dup" });
    const api = useNotificationsStore.getState();
    api.add(n);
    api.add(n);

    const state = useNotificationsStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.unread).toBe(1);
  });

  it("add does not bump unread when read_at is set", () => {
    const n = makeNotification({ id: "read", read_at: "2026-04-14T11:00:00Z" });
    useNotificationsStore.getState().add(n);

    expect(useNotificationsStore.getState().unread).toBe(0);
  });

  it("add sorts items newest first", () => {
    const older = makeNotification({ id: "old", created_at: "2026-04-10T00:00:00Z" });
    const newer = makeNotification({ id: "new", created_at: "2026-04-14T00:00:00Z" });
    const api = useNotificationsStore.getState();
    api.add(older);
    api.add(newer);

    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual(["new", "old"]);
  });

  it("replaceAll replaces items and unread", () => {
    useNotificationsStore.getState().add(makeNotification({ id: "first" }));

    const replacements = [
      makeNotification({ id: "x", created_at: "2026-04-13T00:00:00Z" }),
      makeNotification({ id: "y", created_at: "2026-04-14T00:00:00Z" }),
    ];
    useNotificationsStore.getState().replaceAll(replacements, 7);

    const state = useNotificationsStore.getState();
    expect(state.items.map((n) => n.id)).toEqual(["y", "x"]);
    expect(state.unread).toBe(7);
  });

  it("markRead stamps read_at and decrements unread", () => {
    const n = makeNotification({ id: "m" });
    const api = useNotificationsStore.getState();
    api.add(n);
    api.markRead("m");

    const state = useNotificationsStore.getState();
    expect(state.items[0]?.read_at).not.toBeNull();
    expect(state.unread).toBe(0);
  });

  it("markRead is a no-op when id is unknown or already read", () => {
    const n = makeNotification({ id: "m", read_at: "2026-04-14T12:00:00Z" });
    useNotificationsStore.setState({ items: [n], unread: 0 });

    useNotificationsStore.getState().markRead("m");
    expect(useNotificationsStore.getState().unread).toBe(0);

    useNotificationsStore.getState().markRead("does-not-exist");
    expect(useNotificationsStore.getState().unread).toBe(0);
  });

  it("markRead never drives unread below zero", () => {
    const n = makeNotification({ id: "m" });
    useNotificationsStore.setState({ items: [n], unread: 0 });

    useNotificationsStore.getState().markRead("m");
    expect(useNotificationsStore.getState().unread).toBe(0);
  });
});
