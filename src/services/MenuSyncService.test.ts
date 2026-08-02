import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  supabase: mocks
}));

import { MenuSyncService } from "./MenuSyncService";

describe("MenuSyncService", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.channel.mockReset();
    mocks.removeChannel.mockReset();
  });

  it("loads the canonical catalog and applies a custom Supabase image", async () => {
    const menuRows = [{
      id: "cafe-1",
      name: "Café",
      price: 3500,
      takeaway_price: 3400,
      delivery_price: 3700,
      description: "Espresso",
      category: "Cafetería",
      tags: [],
      image: "catalog.jpg",
      customizable: false,
      calories: 0,
      allergens: [],
      stock: 10,
      is_offer: false,
      offer_price: null,
      recipe: []
    }];
    const secondOrder = vi.fn().mockResolvedValue({ data: menuRows, error: null });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const menuSelect = vi.fn(() => ({ order: firstOrder }));
    const imageSelect = vi.fn().mockResolvedValue({
      data: [{ product_id: "cafe-1", image_base64: "custom-image" }],
      error: null
    });
    mocks.from.mockImplementation((table: string) =>
      table === "menu_items" ? { select: menuSelect } : { select: imageSelect }
    );

    const result = await MenuSyncService.fetchCanonicalMenu();

    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].price).toBe(3500);
    expect(result.items[0].image).toBe("custom-image");
  });

  it("does not replace a valid catalog with fabricated data after a database error", async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "network unavailable", code: "503" }
    });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    mocks.from.mockReturnValue({ select: vi.fn(() => ({ order: firstOrder })) });

    const result = await MenuSyncService.fetchCanonicalMenu();

    expect(result.items).toEqual([]);
    expect(result.error).toContain("network unavailable");
  });

  it("subscribes to both product and image changes and removes the channel", () => {
    const subscribe = vi.fn().mockReturnValue({ id: "channel" });
    const on = vi.fn();
    const channelBuilder: any = { on, subscribe };
    on.mockReturnValue(channelBuilder);
    mocks.channel.mockReturnValue(channelBuilder);

    const unsubscribe = MenuSyncService.subscribe(vi.fn());
    unsubscribe();

    expect(on).toHaveBeenCalledTimes(2);
    expect(on.mock.calls[0][1]).toMatchObject({ table: "menu_items" });
    expect(on.mock.calls[1][1]).toMatchObject({ table: "product_images" });
    expect(mocks.removeChannel).toHaveBeenCalledWith({ id: "channel" });
  });
});
