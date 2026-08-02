import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from
  }
}));

import { InventoryService } from "./InventoryService";

const input = {
  name: "Harina 0000",
  quantity: 25,
  unit: "kg",
  minLimit: 5,
  provider: "Molino local",
  costPerUnit: 1200
};

describe("InventoryService", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.from.mockReset();
  });

  it("does not write inventory from a local or expired session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await InventoryService.createItem(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain("no está autenticada");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns the row confirmed by Supabase", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    const single = vi.fn().mockResolvedValue({
      error: null,
      data: {
        id: "ins-1",
        name: input.name,
        quantity: 25,
        unit: "kg",
        min_limit: 5,
        provider: input.provider,
        expiration_date: null,
        cost_per_unit: 1200
      }
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });

    const result = await InventoryService.createItem(input);

    expect(result.success).toBe(true);
    expect(result.item).toEqual(expect.objectContaining({ name: input.name, costPerUnit: 1200 }));
    expect(mocks.from).toHaveBeenCalledWith("insumos");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ quantity: 25, min_limit: 5 }));
  });

  it("explains an RLS rejection", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security policy" }
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });

    const result = await InventoryService.createItem(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain("no tiene permisos");
  });
});
