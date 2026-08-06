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
   * Opens a clean thermal print window containing ONLY the order receipt ticket.
   * Prevents full-page browser printing (modals, web app UI, buttons, etc.).
   */
  public static printOrderThermalReceipt(order: any): void {
    if (!order) return;
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;

    const tableStr = order.tableNumber
      ? (order.tableNumber.toLowerCase().startsWith("mesa") ? order.tableNumber : `Mesa ${order.tableNumber}`)
      : order.type || "Mesa";

    const isCae = Boolean(
      order.fiscal?.cae &&
      order.fiscal.cae !== "SIN_AUTORIZACION_FISCAL" &&
      ["authorized", "observed"].includes(order.fiscal.status || "")
    );

    const isFacturaA = order.fiscal?.invoiceType === "A";

    const itemsHtml = (order.items || []).map((it: any) => `
      <tr>
        <td style="padding: 3px 0; font-weight: bold;">${it.quantity}x</td>
        <td style="padding: 3px 0; padding-right: 4px;">
          ${it.name}
          ${it.customizationSummary ? `<br/><span style="font-size: 9px; font-style: italic; color: #555;">(${it.customizationSummary})</span>` : ""}
        </td>
        <td style="padding: 3px 0; text-align: right; font-weight: bold; font-family: monospace;">$${(it.price * it.quantity).toLocaleString("es-AR")}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket #${order.id.slice(-6).toUpperCase()}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 10px 4px;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .double-line { border-top: 2px double #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10px; }
            th { border-bottom: 1px dashed #000; text-align: left; padding-bottom: 4px; font-size: 10px; }
            @media print {
              body { width: 100%; margin: 0; padding: 0; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(function(){ window.close(); }, 500);">
          <div class="center bold" style="font-size: 13px;">*** ${order.fiscal?.issuerName || "RESTO BAR DEL TEATRO"} ***</div>
          <div class="center" style="font-size: 9px; margin-top: 2px;">
            ${isCae ? `CUIT: ${order.fiscal?.issuerCuit || ""}<br/>${order.fiscal?.issuerAddress || ""}` : "DOCUMENTO NO FISCAL"}
          </div>

          <div class="line"></div>
          <div style="font-size: 10px;">
            <div>FECHA: ${new Date(order.createdAt).toLocaleDateString("es-AR")} ${new Date(order.createdAt).toLocaleTimeString("es-AR")}</div>
            <div>TICKET FACTURA NRO: ${order.fiscal?.invoiceNumber || order.id}</div>
            <div>ORIGEN: ${order.tableNumber ? `SALÓN - ${tableStr}` : order.type}</div>
            <div>PAGO: ${order.paymentMethod?.toUpperCase() || "EFECTIVO"}</div>
          </div>

          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Cant</th>
                <th style="width: 55%;">Detalle</th>
                <th style="width: 30%; text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="line"></div>
          <div style="font-size: 11px;">
            <div style="display: flex; justify-content: space-between;">
              <span>SUBTOTAL:</span>
              <span>$${(order.subtotal || order.total).toLocaleString("es-AR")}</span>
            </div>
            ${isFacturaA ? `
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span>IVA (21%):</span>
                <span>$${(order.tax || 0).toLocaleString("es-AR")}</span>
              </div>
            ` : ""}
            <div class="bold" style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px;">
              <span>TOTAL ARS:</span>
              <span>$${order.total.toLocaleString("es-AR")}</span>
            </div>
          </div>

          ${isCae ? `
            <div class="double-line"></div>
            <div class="center bold" style="font-size: 9px;">COMPROBANTE ELECTRÓNICO AUTORIZADO POR ARCA</div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 2px;">
              <span>CAE: ${order.fiscal?.cae || ""}</span>
              <span>VTO: ${order.fiscal?.caeExpiration || ""}</span>
            </div>
          ` : ""}

          <div class="line"></div>
          <div class="center" style="font-size: 9px; margin-top: 6px;">
            *** ¡Muchas gracias por su visita! ***<br/>
            ${!isCae ? "DOCUMENTO NO FISCAL · SIN CAE" : ""}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      const sent = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (success: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(success);
        };
        const timeoutId = window.setTimeout(() => finish(false), 3000);

        try {
          const socket = new WebSocket(config.websocketUrl);
          socket.onopen = () => {
            try {
              socket.send(JSON.stringify({ text, title, config }));
              socket.close();
              finish(true);
            } catch (error) {
              console.warn("WebSocket print send failed:", error);
              finish(false);
            }
          };
          socket.onerror = () => finish(false);
          socket.onclose = () => {
            if (!settled) finish(false);
          };
        } catch (error) {
          console.warn("WebSocket print connection failed:", error);
          finish(false);
        }
      });
      if (sent) return true;
      console.warn("WebSocket printer unavailable, falling back to browser printing.");
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
