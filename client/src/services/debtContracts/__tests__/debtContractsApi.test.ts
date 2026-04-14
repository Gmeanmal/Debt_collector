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
  getAccessToken: () => "test-token",
}));

import {
  proposeAsGoddessApi,
  simulateDraftApi,
  type DebtContractCreate,
} from "@/services/debtContracts/debtContractsApi";

const draft: DebtContractCreate = {
  principal_amount: 100,
  interest_rate_pct: 10,
  interest_period: "monthly",
  payment_frequency: "monthly",
  duration_periods: 6,
  late_penalty_severity: "mild",
  mid_contract_addition_mode: "reset",
  start_date: "2026-04-14",
} as unknown as DebtContractCreate;

describe("debtContractsApi", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("proposeAsGoddessApi posts to correct path with sub_id param and body", async () => {
    postMock.mockResolvedValue({ data: { id: "c1" }, error: undefined });

    await proposeAsGoddessApi("sub-123", draft);

    expect(postMock).toHaveBeenCalledTimes(1);
    const [path, options] = postMock.mock.calls[0];
    expect(path).toBe("/goddess/subs/{sub_id}/debts");
    expect(options.params.path.sub_id).toBe("sub-123");
    expect(options.body).toBe(draft);
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("proposeAsGoddessApi throws with fallback message on error", async () => {
    postMock.mockResolvedValue({ data: undefined, error: { detail: "boom" } });

    await expect(proposeAsGoddessApi("sub-1", draft)).rejects.toThrow("boom");
  });

  it("proposeAsGoddessApi throws fallback when error has no message/detail", async () => {
    postMock.mockResolvedValue({ data: undefined, error: {} });

    await expect(proposeAsGoddessApi("sub-1", draft)).rejects.toThrow("Failed to propose contract");
  });

  it("simulateDraftApi posts draft body to /debts/simulate", async () => {
    postMock.mockResolvedValue({ data: { periods: [] }, error: undefined });

    await simulateDraftApi(draft);

    const [path, options] = postMock.mock.calls[0];
    expect(path).toBe("/debts/simulate");
    expect(options.body).toBe(draft);
  });

  it("simulateDraftApi throws on error", async () => {
    postMock.mockResolvedValue({ data: undefined, error: { message: "bad" } });

    await expect(simulateDraftApi(draft)).rejects.toThrow("bad");
  });
});
