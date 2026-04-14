import { describe, it, expect, vi, beforeEach } from "vitest";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiClient: {
    POST: postMock,
    GET: getMock,
  },
}));

vi.mock("@/services/auth/tokenStorage", () => ({
  getAccessToken: () => "tok",
}));

import {
  listNotificationsApi,
  markNotificationReadApi,
} from "@/services/notifications/notificationsApi";

describe("notificationsApi", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("listNotificationsApi returns {items, unread}", async () => {
    const payload = { items: [{ id: "n1" }], unread: 1 };
    getMock.mockResolvedValue({ data: payload, error: undefined });

    const result = await listNotificationsApi();

    expect(result).toEqual(payload);
    expect(getMock).toHaveBeenCalledWith("/me/notifications", expect.any(Object));
  });

  it("listNotificationsApi throws on error", async () => {
    getMock.mockResolvedValue({ data: undefined, error: { detail: "nope" } });

    await expect(listNotificationsApi()).rejects.toThrow("Failed to list notifications");
  });

  it("markNotificationReadApi posts with notification_id path param", async () => {
    postMock.mockResolvedValue({ error: undefined });

    await markNotificationReadApi("abc-123");

    const [path, options] = postMock.mock.calls[0];
    expect(path).toBe("/me/notifications/{notification_id}/read");
    expect(options.params.path.notification_id).toBe("abc-123");
  });

  it("markNotificationReadApi throws when API returns an error", async () => {
    postMock.mockResolvedValue({ error: { detail: "x" } });

    await expect(markNotificationReadApi("id")).rejects.toThrow(
      "Failed to mark notification as read",
    );
  });
});
