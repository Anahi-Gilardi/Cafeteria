export interface PrinterConfig {
  paperWidth: "80mm" | "58mm";
  printerType: "webusb" | "webbluetooth" | "websocket" | "browser_print";
  websocketUrl: string;
  autoCut: boolean;
  kickDrawer: boolean;
}

export class ThermalPrinterService {
  private static CONFIG_KEY = "resto_bar_printer_config";

  public static getConfig(): PrinterConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load printer config, using defaults.");
    }
    return {
      paperWidth: "80mm",
      printerType: "browser_print",
      websocketUrl: "ws://localhost:9100",
      autoCut: true,
      kickDrawer: true
    };
  }

  public static saveConfig(config: PrinterConfig): void {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Generates ESC/POS byte sequence for opening cash drawer (Kick Drawer)
   */
  public static getDrawerKickCommand(): Uint8Array {
    return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  }

  /**
   * Generates ESC/POS byte sequence for paper cut
   */
  public static getPaperCutCommand(): Uint8Array {
    return new Uint8Array([0x1d, 0x56, 0x42, 0x00]);
  }

  /**
   * Connects to Bluetooth ESC/POS printer directly
   */
  public static async printDirectBluetooth(textData: string): Promise<boolean> {
    if (!("bluetooth" in navigator)) {
      console.warn("WebBluetooth not supported in this browser.");
      return false;
    }
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["00001101-0000-1000-8000-00805f9b34fb"]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("00001101-0000-1000-8000-00805f9b34fb");
      const characteristic = await service.getCharacteristic("00001101-0000-1000-8000-00805f9b34fb");
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(textData));
      return true;
    } catch (err) {
      console.error("Bluetooth print error:", err);
      return false;
    }
  }

  /**
   * Sends raw print job to thermal printer or browser fallback
   */
  public static async printRawText(text: string, title: string = "Ticket"): Promise<boolean> {
    const config = this.getConfig();

    if (config.printerType === "webbluetooth") {
      const success = await this.printDirectBluetooth(text);
      if (success) return true;
    }

    if (config.printerType === "websocket") {
      try {
        const socket = new WebSocket(config.websocketUrl);
        socket.onopen = () => {
          socket.send(JSON.stringify({ text, title, config }));
          socket.close();
        };
        return true;
      } catch (e) {
        console.warn("WebSocket print error, falling back to browser window.print()", e);
      }
    }

    // Fallback: Use standard clean browser print window
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (printWindow) {
      const widthPx = config.paperWidth === "58mm" ? "220px" : "300px";
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { margin: 0; size: auto; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: ${widthPx};
                margin: 0 auto;
                padding: 10px;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                background: #fff;
              }
              h2, h3, h4 { text-align: center; margin: 4px 0; }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .line { border-top: 1px dashed #000; margin: 6px 0; }
              .double-line { border-top: 2px solid #000; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; margin: 4px 0; }
              th, td { text-align: left; padding: 2px 0; vertical-align: top; }
            </style>
          </head>
          <body>
            ${text}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    }

    return false;
  }
}
