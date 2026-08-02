import { afterEach, describe, expect, it, vi } from "vitest";
import { ThermalPrinterService } from "./ThermalPrinterService";

const websocketConfig = JSON.stringify({
  paperWidth: "80mm",
  printerType: "websocket",
  websocketUrl: "ws://localhost:9100",
  autoCut: true,
  kickDrawer: true
});

describe("ThermalPrinterService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports success only after the WebSocket payload was sent", async () => {
    const send = vi.fn();
    class SuccessfulSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        queueMicrotask(() => this.onopen?.());
      }
      send = send;
      close() {}
    }
    vi.stubGlobal("localStorage", { getItem: () => websocketConfig });
    vi.stubGlobal("window", { setTimeout, open: vi.fn() });
    vi.stubGlobal("WebSocket", SuccessfulSocket);

    await expect(ThermalPrinterService.printRawText("ticket", "Prueba")).resolves.toBe(true);
    expect(send).toHaveBeenCalledOnce();
  });

  it("falls back and reports failure when the WebSocket and print window are unavailable", async () => {
    class FailedSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        queueMicrotask(() => this.onerror?.());
      }
      send() {}
      close() {}
    }
    const open = vi.fn(() => null);
    vi.stubGlobal("localStorage", { getItem: () => websocketConfig });
    vi.stubGlobal("window", { setTimeout, open });
    vi.stubGlobal("WebSocket", FailedSocket);

    await expect(ThermalPrinterService.printRawText("ticket")).resolves.toBe(false);
    expect(open).toHaveBeenCalledOnce();
  });
});
