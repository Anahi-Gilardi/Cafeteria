import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase", () => ({
  supabase: { rpc }
}));

import { CashShiftService } from "./CashShiftService";

describe("CashShiftService", () => {
  beforeEach(() => rpc.mockReset());

  it("does not open a local shift when Supabase rejects it", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "already open", code: "23505" } });
    const result = await CashShiftService.openShift();
    expect(result.success).toBe(false);
    expect(result.error).toContain("23505");
  });

  it("maps a remotely confirmed open shift", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        total_collected: 0,
        cash: 0,
        card: 0,
        mercadopago: 0,
        transactions: [],
        is_open: true,
        opened_at: "2026-08-02T10:00:00.000Z"
      }
    });
    const result = await CashShiftService.openShift();
    expect(result.success).toBe(true);
    expect(result.ledger?.isOpen).toBe(true);
  });

  it("keeps the shift open when the remote close fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "network", code: "503" } });
    const result = await CashShiftService.closeShift(1000, "Arqueo");
    expect(result.success).toBe(false);
    expect(result.error).toContain("503");
  });

  it("rejects an invalid declared amount before calling Supabase", async () => {
    const result = await CashShiftService.closeShift(-1, "");
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
