import { useState, useMemo, useRef } from "react";
import { Order, FiscalDetails, ClientAccount } from "../types";
import { X, Printer, Download, QrCode, CreditCard, DollarSign, Users, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TicketPreviewModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  clientAccounts: ClientAccount[];
  onUpdateClientAccounts: (accounts: ClientAccount[]) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

export default function TicketPreviewModal({
  order,
  isOpen,
  onClose,
  clientAccounts,
  onUpdateClientAccounts,
  onShowNotification
}: TicketPreviewModalProps) {
  // General view configurations
  const [invoiceType, setInvoiceType] = useState<"A" | "B" | "C" | "No Fiscal">("C");
  const [customerCuit, setCustomerCuit] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "MercadoPago" | "Fiado / Cta Cte">("Tarjeta");

  // Payment inputs
  const [receivedCash, setReceivedCash] = useState<string>("");
  const [posCoupon, setPosCoupon] = useState<string>("");
  const [selectedClientAccountId, setSelectedClientAccountId] = useState<string>("");
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientCuit, setNewClientCuit] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");
  const [showAddClientForm, setShowAddClientForm] = useState<boolean>(false);

  // Split-bill state
  const [splitType, setSplitType] = useState<"none" | "equal" | "items">("none");
  const [splitCount, setSplitCount] = useState<number>(2);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<number[]>([]);

  // Simulation steps
  const [isCaeAuthorized, setIsCaeAuthorized] = useState<boolean>(true);
  const [simulatedCae, setSimulatedCae] = useState<string>(() => "CAE-" + Math.floor(Math.random() * 90000000000000 + 10000000000000));
  const [simulatedCaeVto, setSimulatedCaeVto] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toLocaleDateString("es-AR");
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  const calibration = useMemo(() => {
    try {
      const calibStr = localStorage.getItem("puglia_calibration");
      return calibStr ? JSON.parse(calibStr) : {
        gramosIn: 18,
        mililitrosOut: 36,
        tiempo: 27,
        temperatura: 92,
        clima: "Despejado y Seco"
      };
    } catch (e) {
      return {
        gramosIn: 18,
        mililitrosOut: 36,
        tiempo: 27,
        temperatura: 92,
        clima: "Despejado y Seco"
      };
    }
  }, [isOpen]);

  const hasCoffee = useMemo(() => {
    return order.items.some(it => 
      it.name.toLowerCase().includes("café") || 
      it.name.toLowerCase().includes("cortado") || 
      it.name.toLowerCase().includes("lágrima") || 
      it.name.toLowerCase().includes("espresso") || 
      it.name.toLowerCase().includes("flat white") || 
      it.name.toLowerCase().includes("latte") || 
      it.name.toLowerCase().includes("submarino")
    );
  }, [order.items]);

  if (!order) return null;

  // Adapt prices based on order's original price list (or let it fall back)
  const isTakeaway = order.priceList === "Takeaway";
  const isDelivery = order.priceList === "Delivery";

  // Math totals
  const subtotal = order.subtotal;
  const tax = order.tax; // 10% or 21% based on fiscal selection
  const total = order.total;

  // Split bill totals
  const splitEqualAmount = useMemo(() => {
    return Number((total / splitCount).toFixed(2));
  }, [total, splitCount]);

  const splitItemsTotal = useMemo(() => {
    return selectedItemIndexes.reduce((sum, idx) => {
      const item = order.items[idx];
      if (item) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
  }, [selectedItemIndexes, order.items]);

  const activeBillTotal = useMemo(() => {
    if (splitType === "equal") return splitEqualAmount;
    if (splitType === "items") return splitItemsTotal;
    return total;
  }, [splitType, total, splitEqualAmount, splitItemsTotal]);

  // IVA tax calculation according to AFIP guidelines
  const afipCalculations = useMemo(() => {
    // Standard AFIP IVA rates: 21% for beverages/general, 10.5% for basic pastries/bakery
    // We break down the current bill's total into Neto, 21% IVA, and 10.5% IVA
    const netoFactor = 1.21;
    const estimatedNeto = Number((activeBillTotal / netoFactor).toFixed(2));
    const estimatedIva21 = Number((activeBillTotal - estimatedNeto).toFixed(2));
    
    // Simulate some items having 10.5% instead of 21%
    const hasPastries = order.items.some(it => it.name.toLowerCase().includes("medialuna") || it.name.toLowerCase().includes("tarta") || it.name.toLowerCase().includes("alfajor"));
    const iva105Basis = hasPastries ? Number((activeBillTotal * 0.3).toFixed(2)) : 0;
    const iva21Basis = activeBillTotal - iva105Basis;

    const net105 = Number((iva105Basis / 1.105).toFixed(2));
    const tax105 = Number((iva105Basis - net105).toFixed(2));

    const net21 = Number((iva21Basis / 1.21).toFixed(2));
    const tax21 = Number((iva21Basis - net21).toFixed(2));

    return {
      neto: Number((net21 + net105).toFixed(2)),
      iva21: tax21,
      iva105: tax105,
      total: activeBillTotal
    };
  }, [activeBillTotal, order.items]);

  // Cash change calculator
  const cashChange = useMemo(() => {
    const cash = parseFloat(receivedCash);
    if (!isNaN(cash) && cash >= activeBillTotal) {
      return Number((cash - activeBillTotal).toFixed(2));
    }
    return 0;
  }, [receivedCash, activeBillTotal]);

  // Handle adding a new fiado client
  const handleAddClient = () => {
    if (!newClientName || !newClientCuit) {
      onShowNotification("⚠️ Por favor ingresa Nombre y CUIT del cliente.", "warning");
      return;
    }
    const newClient: ClientAccount = {
      id: "client-" + Date.now(),
      name: newClientName,
      cuit: newClientCuit,
      phone: newClientPhone || "No especificado",
      balance: 0,
      creditLimit: 50000 // default $50k credit limit in ARS/USD relative limits
    };
    onUpdateClientAccounts([...clientAccounts, newClient]);
    setSelectedClientAccountId(newClient.id);
    setNewClientName("");
    setNewClientCuit("");
    setNewClientPhone("");
    setShowAddClientForm(false);
    onShowNotification(`👤 Cuenta de confianza creada para '${newClient.name}'.`, "success");
  };

  // Process payment simulation
  const handleConfirmReceiptPayment = () => {
    if (paymentMethod === "Fiado / Cta Cte" && !selectedClientAccountId) {
      onShowNotification("⚠️ Debes seleccionar un cliente para registrar el fiado.", "warning");
      return;
    }

    if (paymentMethod === "Fiado / Cta Cte") {
      const client = clientAccounts.find(c => c.id === selectedClientAccountId);
      if (client) {
        // Debit the balance
        const updatedAccounts = clientAccounts.map(c => {
          if (c.id === selectedClientAccountId) {
            const newBal = c.balance - activeBillTotal;
            if (Math.abs(newBal) > c.creditLimit) {
              onShowNotification(`🚨 Límite de crédito excedido: El límite es de $${c.creditLimit}.`, "warning");
            }
            return { ...c, balance: newBal };
          }
          return c;
        });
        onUpdateClientAccounts(updatedAccounts);
        onShowNotification(`📝 Fiado registrado en la cuenta de ${client.name}. Saldo: -$${Math.abs(client.balance - activeBillTotal).toFixed(2)}`, "success");
      }
    } else if (paymentMethod === "Tarjeta" && !posCoupon) {
      onShowNotification("⚠️ Registra el número de cupón del POSNET/Clover para conciliar la tarjeta.", "warning");
      return;
    } else if (paymentMethod === "Tarjeta") {
      onShowNotification(`💳 Cupón POSNET #${posCoupon} registrado con éxito.`, "success");
    } else if (paymentMethod === "Efectivo") {
      if (receivedCash && parseFloat(receivedCash) < activeBillTotal) {
        onShowNotification("⚠️ El monto recibido es menor al total a pagar.", "warning");
        return;
      }
      onShowNotification(`💵 Pago recibido con éxito. Cambio a devolver: $${cashChange.toFixed(2)}`, "success");
    } else if (paymentMethod === "MercadoPago") {
      onShowNotification("📱 QR Dinámico Mercado Pago escaneado y acreditado instantáneamente.", "success");
    }

    // Add transaction ledger entry
    let savedLedger: any = {};
    try {
      savedLedger = JSON.parse(localStorage.getItem("origen_cash_ledger") || "{}");
    } catch (e) {
      savedLedger = {};
    }
    const updatedLedger = {
      ...savedLedger,
      totalCollected: (savedLedger.totalCollected || 0) + activeBillTotal,
      cash: (savedLedger.cash || 0) + (paymentMethod === "Efectivo" ? activeBillTotal : 0),
      card: (savedLedger.card || 0) + (paymentMethod === "Tarjeta" ? activeBillTotal : 0),
      mercadopago: (savedLedger.mercadopago || 0) + (paymentMethod === "MercadoPago" ? activeBillTotal : 0),
      transactions: [
        {
          id: "tx-" + Date.now(),
          type: "Cobro POS",
          orderId: `PED-${order.id.substring(order.id.length - 4).toUpperCase()}`,
          total: activeBillTotal,
          method: paymentMethod,
          timestamp: "Hace instantes"
        },
        ...(savedLedger.transactions || [])
      ]
    };
    localStorage.setItem("origen_cash_ledger", JSON.stringify(updatedLedger));

    // If split bill, show separate notification or reset division
    if (splitType !== "none") {
      onShowNotification(`🍕 Cobro parcial de cuenta dividida procesado por $${activeBillTotal.toFixed(2)}.`, "info");
      if (splitType === "items") {
        // Remove paid items
        setSelectedItemIndexes([]);
      }
    } else {
      onClose();
    }
  };

  // Print function (opens a clean, beautiful thermal style printing frame)
  const handlePrint = () => {
    const printContent = ticketRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onShowNotification("⚠️ Habilita las ventanas emergentes para imprimir el ticket.", "warning");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Ticket - Café Puglia</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'JetBrains Mono', monospace;
              width: 80mm;
              margin: 0;
              padding: 10px;
              color: #000;
              font-size: 11px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .header { margin-bottom: 12px; }
            .footer { margin-top: 15px; font-size: 10px; text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 4px; }
            td { padding: 3px 0; }
            .afip-box { border: 1px solid #000; padding: 6px; margin-top: 10px; text-align: center; font-size: 9px; }
            .qr-placeholder { border: 1px solid #000; width: 60px; height: 60px; margin: 6px auto; display: flex; align-items: center; justify-content: center; font-size: 8px; }
            @media print {
              body { width: 80mm; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    onShowNotification("🖨️ Enviando comanda / ticket de compra a la impresora térmica...", "success");
  };

  // Generate plain-text file download simulating a high fidelity virtual PDF/Ticket download
  const handleDownloadPDF = () => {
    let text = `================================================\n`;
    text += `                CAFÉ PUGLIA\n`;
    text += `       Manual Operativo e Ingeniería de Procesos\n`;
    text += `       Calle 50 nro 600, La Plata, Buenos Aires\n`;
    text += `       CUIT: 30-11223344-9 - IVA Resp. Inscripto\n`;
    text += `================================================\n`;
    text += `FECHA: ${new Date(order.createdAt).toLocaleString("es-AR")}\n`;
    text += `TIENDA: Sucursal Central La Plata\n`;
    text += `TICKET COMPROBANTE Nro: 0001-${order.id.substring(order.id.length - 8).toUpperCase()}\n`;
    text += `CANAL DE VENTA: ${order.priceList.toUpperCase()}\n`;
    if (order.tableNumber) {
      text += `UBICACIÓN: ${order.tableNumber}\n`;
    }
    text += `------------------------------------------------\n`;
    text += `CANT  DESCRIPCIÓN                        IMPORTE\n`;
    text += `------------------------------------------------\n`;
    order.items.forEach(it => {
      const nameStr = it.name.substring(0, 32).padEnd(32);
      const qtyStr = it.quantity.toString().padStart(3);
      const priceStr = `$${(it.price * it.quantity).toFixed(2)}`.padStart(11);
      text += `${qtyStr}  ${nameStr}${priceStr}\n`;
      if (it.customizationSummary) {
        text += `     * (${it.customizationSummary})\n`;
      }
    });
    text += `------------------------------------------------\n`;
    text += `SUBTOTAL:                          $${subtotal.toFixed(2)}\n`;
    text += `FISCAL IMPUESTOS (IVA):            $${tax.toFixed(2)}\n`;
    text += `TOTAL COMPLETADO:                  $${total.toFixed(2)}\n`;
    if (splitType !== "none") {
      text += `------------------------------------------------\n`;
      text += `DIVISION DE CUENTA: ${splitType === "equal" ? "En partes iguales" : "Por productos"}\n`;
      text += `MONTO PARCIAL ABONADO:             $${activeBillTotal.toFixed(2)}\n`;
    }
    text += `================================================\n`;
    if (isCaeAuthorized) {
      text += `COMPROBANTE AUTORIZADO POR AFIP\n`;
      text += `TIPO COMPROBANTE: FACTURA ${invoiceType}\n`;
      text += `CAE: ${simulatedCae}\n`;
      text += `VENCIMIENTO CAE: ${simulatedCaeVto}\n`;
      text += `Cód. Barras AFIP: 30112233449010001${simulatedCae.substring(4, 12)}20260710\n`;
    }
    text += `================================================\n`;
    text += `      ¡Gracias por elegir Café Puglia!\n`;
    text += `          Disfrute su estadía en el bar.\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket_puglia_${order.id.substring(order.id.length - 6).toUpperCase()}_${invoiceType}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowNotification("📥 Ticket de compra descargado en formato fiscal digital (.txt / PDF alternativo)", "success");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-espresso/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-stone-100 rounded-3xl border border-coffee shadow-2xl max-w-5xl w-full overflow-hidden grid grid-cols-1 lg:grid-cols-12"
          >
            {/* LEFT SIDE: Fiscal & Payment Configurations (Columns: 7) */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-coffee/20 pb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-espresso">Caja Facturadora POS</h3>
                  <p className="text-xs text-espresso/60 italic">Conciliación de ticket, división de cuenta e impuestos AFIP.</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-white hover:bg-stone-200 text-espresso rounded-full transition-all border border-coffee/30 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step 1: Multiple Price list details info */}
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs font-medium">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Canal de Precios Aplicado: {order.priceList.toUpperCase()}</span>
                  <p className="mt-0.5 text-amber-800/80 leading-relaxed">
                    Este pedido se calculó bajo la tarifa de <span className="font-bold">{order.priceList === "Salon" ? "Salón (Normal)" : order.priceList === "Takeaway" ? "Mostrador / Takeaway (10% Desc.)" : "App Delivery (15% Recargo)"}</span>.
                  </p>
                </div>
              </div>

              {/* Step 2: Divide Account (Split Bill) */}
              <div className="bg-white rounded-2xl border border-coffee/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-espresso text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-caramel" /> Dividir Cuenta (Split Bill)
                  </h4>
                  <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-bold text-espresso/60 uppercase">Amigos & Colegas</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setSplitType("none"); setSelectedItemIndexes([]); }}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      splitType === "none"
                        ? "bg-espresso text-white border-espresso"
                        : "bg-stone-50 text-espresso border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    Cuenta Única
                  </button>
                  <button
                    onClick={() => setSplitType("equal")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      splitType === "equal"
                        ? "bg-espresso text-white border-espresso"
                        : "bg-stone-50 text-espresso border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    Partes Iguales
                  </button>
                  <button
                    onClick={() => setSplitType("items")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      splitType === "items"
                        ? "bg-espresso text-white border-espresso"
                        : "bg-stone-50 text-espresso border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    Por Producto
                  </button>
                </div>

                {splitType === "equal" && (
                  <div className="bg-stone-50 p-4 rounded-xl space-y-3 border border-stone-200">
                    <div className="flex justify-between text-xs font-bold text-espresso">
                      <span>Dividir entre:</span>
                      <span className="font-mono text-caramel">{splitCount} personas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="2"
                        max="10"
                        value={splitCount}
                        onChange={(e) => setSplitCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-caramel"
                      />
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 flex justify-between items-center text-xs">
                      <span className="font-bold text-espresso/60">Cada uno abona:</span>
                      <span className="font-serif text-sm font-extrabold text-espresso">${splitEqualAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {splitType === "items" && (
                  <div className="bg-stone-50 p-4 rounded-xl space-y-2 border border-stone-200">
                    <span className="text-[10px] font-bold uppercase text-espresso/50 block">Selecciona los productos que vas a pagar:</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((it, idx) => {
                        const isSelected = selectedItemIndexes.includes(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedItemIndexes(prev => prev.filter(i => i !== idx));
                              } else {
                                setSelectedItemIndexes(prev => [...prev, idx]);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                              isSelected
                                ? "bg-caramel/10 border-caramel text-espresso font-bold"
                                : "bg-white border-stone-200 text-espresso hover:bg-stone-50"
                            }`}
                          >
                            <span className="text-xs truncate">{it.quantity}x {it.name}</span>
                            <span className="text-xs font-mono font-bold">${(it.price * it.quantity).toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 flex justify-between items-center text-xs">
                      <span className="font-bold text-espresso/60">Monto seleccionado:</span>
                      <span className="font-serif text-sm font-extrabold text-espresso">${splitItemsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: AFIP Invoice Type & Customer details */}
              <div className="bg-white rounded-2xl border border-coffee/20 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h4 className="font-serif font-bold text-espresso text-sm">Comprobante Fiscal AFIP</h4>
                  <div className="flex gap-1.5">
                    {(["C", "B", "A", "No Fiscal"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setInvoiceType(type)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          invoiceType === type
                            ? "bg-espresso text-white border-espresso shadow-xs"
                            : "bg-stone-50 text-espresso/70 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {type === "No Fiscal" ? "No Fisc." : `Factura ${type}`}
                      </button>
                    ))}
                  </div>
                </div>

                {invoiceType === "A" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-espresso/60 uppercase">CUIT de la Empresa</label>
                      <input
                        type="text"
                        placeholder="30-XXXXXXXX-X"
                        value={customerCuit}
                        onChange={(e) => setCustomerCuit(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-coffee/30 focus:border-caramel focus:outline-hidden font-mono bg-stone-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-espresso/60 uppercase">Razón Social</label>
                      <input
                        type="text"
                        placeholder="Puglia SRL"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-coffee/30 focus:border-caramel focus:outline-hidden bg-stone-50 font-semibold"
                      />
                    </div>
                  </div>
                )}

                {invoiceType !== "No Fiscal" && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      WSFE AFIP Conectado
                    </span>
                    <span className="font-mono text-[10px] text-espresso/50 font-bold">CAE AUTORIZADO</span>
                  </div>
                )}
              </div>

              {/* Step 4: Local Payment Methods & Simulation details */}
              <div className="bg-white rounded-2xl border border-coffee/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-espresso text-sm">Método de Pago</h4>
                  <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-800 px-2 py-0.5 rounded uppercase tracking-wider">
                    Solo Tarjetas
                  </span>
                </div>
                <div className="bg-stone-50 border border-coffee/20 rounded-xl p-4 flex items-center gap-3.5">
                  <div className="p-3 bg-espresso text-white rounded-xl">
                    <CreditCard className="h-6 w-6 text-caramel" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-espresso">Abono por Tarjeta de Crédito o Débito</h5>
                    <p className="text-[10px] text-espresso/60 mt-0.5 leading-relaxed">
                      Este establecimiento opera exclusivamente bajo canales electrónicos integrados de débito y crédito.
                    </p>
                  </div>
                </div>

                {/* Sub-panels for payments */}
                {paymentMethod === "Efectivo" && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-espresso/60">Importe a cobrar:</span>
                      <span className="font-mono font-bold text-base text-espresso">${activeBillTotal.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-espresso/50 uppercase">Monto Recibido</label>
                      <input
                        type="number"
                        placeholder="Escribe el efectivo que entrega el cliente..."
                        value={receivedCash}
                        onChange={(e) => setReceivedCash(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-coffee/30 focus:border-caramel focus:outline-hidden font-mono bg-white"
                      />
                    </div>
                    {receivedCash && parseFloat(receivedCash) >= activeBillTotal && (
                      <div className="pt-2 border-t border-stone-200/60 flex justify-between items-center text-xs font-bold text-emerald-900 bg-emerald-50 p-2 rounded-lg">
                        <span>Vuelto a entregar:</span>
                        <span className="font-mono text-base">${cashChange.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "Tarjeta" && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-espresso/50 uppercase">Número de Cupón Posnet/Clover</label>
                      <input
                        type="text"
                        placeholder="Nro de cupón o transacción de la tarjeta (Ej: 9021)"
                        value={posCoupon}
                        onChange={(e) => setPosCoupon(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-coffee/30 focus:border-caramel focus:outline-hidden font-mono bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-espresso/50 italic leading-relaxed">
                      Este campo es obligatorio para conciliar con los plazos de acreditación de Prisma / Payway y Fiserv.
                    </p>
                  </div>
                )}

                {paymentMethod === "MercadoPago" && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col items-center justify-center gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center">
                      {/* Generar un QR ficticio visual y dinámico */}
                      <div className="bg-stone-100 h-32 w-32 rounded-xl flex items-center justify-center relative overflow-hidden border border-stone-200">
                        <QrCode className="h-24 w-24 text-espresso" />
                        <div className="absolute inset-x-0 bottom-0 bg-blue-600 text-white text-[8px] font-bold text-center py-1">
                          MP: $ {activeBillTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">QR Dinámico Generado</span>
                      <p className="text-[10px] text-espresso/60 mt-1 italic leading-relaxed">
                        El sistema generó un QR único. Al escanearlo, el cliente abonará el monto exacto de la cuenta.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === "Fiado / Cta Cte" && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-espresso/50 uppercase">Seleccionar Cuenta Corriente Cliente</label>
                      <select
                        value={selectedClientAccountId}
                        onChange={(e) => setSelectedClientAccountId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-coffee/30 focus:border-caramel focus:outline-hidden bg-white"
                      >
                        <option value="">-- Buscar por Nombre / CUIT --</option>
                        {clientAccounts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} [CUIT: {c.cuit}] - Saldo: $ {c.balance.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Or add new client right here */}
                    <div className="border-t border-stone-200/60 pt-3">
                      {!showAddClientForm ? (
                        <button
                          onClick={() => setShowAddClientForm(true)}
                          className="text-xs font-bold text-caramel flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> Agregar Nuevo Cliente de Confianza
                        </button>
                      ) : (
                        <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-2">
                          <span className="text-[10px] font-bold uppercase text-espresso/60 block">Nueva Cuenta Corriente</span>
                          <input
                            type="text"
                            placeholder="Nombre y Apellido"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="w-full text-xs p-2 border border-stone-200 rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="CUIT / CUIL"
                            value={newClientCuit}
                            onChange={(e) => setNewClientCuit(e.target.value)}
                            className="w-full text-xs p-2 border border-stone-200 rounded-lg font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Teléfono de Contacto"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            className="w-full text-xs p-2 border border-stone-200 rounded-lg"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setShowAddClientForm(false)}
                              className="px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100 rounded cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleAddClient}
                              className="px-3 py-1 text-[10px] bg-espresso text-paper font-bold rounded cursor-pointer"
                            >
                              Guardar Cuenta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit bill & close */}
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 text-xs font-bold text-espresso bg-stone-200 hover:bg-stone-300 rounded-2xl transition-all cursor-pointer text-center"
                >
                  Volver a Mesas
                </button>
                <button
                  onClick={handleConfirmReceiptPayment}
                  className="flex-2 py-3.5 text-xs font-bold text-paper bg-espresso hover:bg-caramel rounded-2xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle className="h-4 w-4" /> Registrar Cobro & Cerrar Mesa
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: Styled Physical Thermal Ticket Preview (Columns: 5) */}
            <div className="lg:col-span-5 bg-stone-300 p-6 flex flex-col items-center justify-start gap-4">
              <span className="text-xs font-bold text-espresso/50 uppercase font-mono">Vista Previa Comprobante Fiel</span>

              {/* THERMAL PAPER TICKET SCROLL RENDER */}
              <div
                ref={ticketRef}
                className="bg-white text-stone-900 p-6 shadow-xl w-full max-w-[280px] text-xs font-mono border-t-[8px] border-double border-stone-400 relative overflow-hidden"
                style={{ fontFamily: "'JetBrains Mono', monospace", lineHeight: "1.4" }}
              >
                {/* Jagged paper bottom effect */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-stone-100" style={{ backgroundImage: "linear-gradient(-45deg, white 4px, transparent 0), linear-gradient(45deg, white 4px, transparent 0)", backgroundSize: "8px 8px" }} />

                <div className="text-center mb-4 leading-normal">
                  <h5 className="font-bold text-sm tracking-tight m-0">CAFÉ PUGLIA</h5>
                  <p className="text-[9px] text-stone-600 m-0 leading-tight">
                    Café de Especialidad y Pastelería<br />
                    Calle 50 nro 600, La Plata<br />
                    IVA Responsable Inscripto<br />
                    CUIT: 30-11223344-9<br />
                    Ing. Brutos: Convenio Multilateral<br />
                    Inicio de Actividades: 01/03/2026
                  </p>
                </div>

                <div className="border-t border-dashed border-stone-400 my-2" />

                <div className="text-[9px] text-stone-600 space-y-0.5">
                  <div>Fecha: {new Date(order.createdAt).toLocaleString("es-AR")}</div>
                  <div>Comprobante: Nro. 0001-{order.id.substring(order.id.length - 8).toUpperCase()}</div>
                  <div>Punto de Venta: 0001 (La Plata)</div>
                  <div>Canal de Precios: {order.priceList.toUpperCase()}</div>
                  {order.tableNumber && <div className="font-bold text-stone-800">Ubicación: {order.tableNumber}</div>}
                  {invoiceType === "A" && customerName && (
                    <div className="border border-stone-400 p-1 mt-1 text-[8px] rounded">
                      <span className="font-bold block">Receptor:</span>
                      <span>{customerName}</span><br />
                      <span>CUIT: {customerCuit}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-stone-400 my-2" />

                {/* Products list */}
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-dashed border-stone-400">
                      <th className="text-left font-normal pb-1">DESCRIPCIÓN</th>
                      <th className="text-center font-normal pb-1">CANT</th>
                      <th className="text-right font-normal pb-1">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1 leading-tight text-[9px]">
                          {it.name}
                          {it.customizationSummary && (
                            <span className="block text-[8px] text-stone-500 italic">({it.customizationSummary})</span>
                          )}
                        </td>
                        <td className="py-1 text-center font-mono">{it.quantity}</td>
                        <td className="py-1 text-right font-mono">${(it.price * it.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-stone-400 my-2" />

                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {invoiceType !== "No Fiscal" && (
                    <>
                      <div className="flex justify-between text-[9px] text-stone-600">
                        <span>Gravado (Neto):</span>
                        <span>${afipCalculations.neto.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-stone-600">
                        <span>IVA 21.00%:</span>
                        <span>${afipCalculations.iva21.toFixed(2)}</span>
                      </div>
                      {afipCalculations.iva105 > 0 && (
                        <div className="flex justify-between text-[9px] text-stone-600">
                          <span>IVA 10.50%:</span>
                          <span>${afipCalculations.iva105.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-300">
                    <span>TOTAL:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {splitType !== "none" && (
                  <div className="border-t border-dashed border-stone-400 mt-2 pt-2 text-[9px] bg-stone-100 p-1.5 rounded space-y-1">
                    <span className="font-bold block text-caramel">CUENTA DIVIDIDA:</span>
                    {splitType === "equal" ? (
                      <div>Cobrando 1 de {splitCount} partes iguales: <span className="font-bold">${splitEqualAmount.toFixed(2)}</span></div>
                    ) : (
                      <div>Cobrando selección de productos: <span className="font-bold">${splitItemsTotal.toFixed(2)}</span></div>
                    )}
                  </div>
                )}

                {/* AFIP BOX */}
                {invoiceType !== "No Fiscal" && isCaeAuthorized && (
                  <div className="mt-4 pt-3 border-t border-double border-stone-400 text-center text-[8px] text-stone-700 space-y-1">
                    <div className="flex items-center justify-center font-bold gap-1 text-stone-900 border border-stone-400 p-1 bg-stone-50 rounded">
                      <span className="bg-stone-900 text-white px-1 text-[7px] font-mono leading-none">AFIP</span>
                      <span>COMPROBANTE AUTORIZADO</span>
                    </div>
                    <div className="font-mono text-center select-none py-1">
                      {/* Fake barcode structure */}
                      || | |||| | || | ||| |||| | | ||| | ||| || ||
                      <div className="text-[6px] tracking-tight text-stone-500 mt-0.5">30112233449010001{simulatedCae.substring(4, 12)}20260710</div>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-stone-200">
                      <span>CAE: {simulatedCae}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VTO CAE: {simulatedCaeVto}</span>
                    </div>
                  </div>
                )}

                <div className="text-center text-[8px] text-stone-500 mt-4 pt-3 border-t border-dashed border-stone-400">
                  ¡Gracias por su visita!<br />
                  Café Puglia - La Plata<br />
                  Hospitalidad & Excelencia
                </div>
              </div>

              {/* Tarjeta de Trazabilidad (Sec. III.1) */}
              {hasCoffee && (
                <div className="bg-stone-50 border border-amber-800/30 text-stone-800 p-4 shadow-xl w-full max-w-[280px] text-xs font-mono border-t-[8px] border-double border-amber-700/50 relative overflow-hidden rounded">
                  <div className="text-center mb-3">
                    <h5 className="font-bold text-[10px] tracking-widest text-amber-900 m-0">☕ TARJETA DE TRAZABILIDAD</h5>
                    <p className="text-[8px] text-stone-500 m-0 leading-tight">Café Puglia - Especialidad de Origen</p>
                  </div>
                  <div className="border-t border-dashed border-stone-300 my-1.5" />
                  <div className="text-[9px] space-y-1">
                    <div><span className="font-bold text-amber-900">Origen:</span> Fazenda Santa Inês, Minas Gerais, Brasil</div>
                    <div><span className="font-bold text-amber-900">Variedad:</span> Catuaí Amarillo / Tostado Natural</div>
                    <div><span className="font-bold text-amber-900">Altura:</span> 1.150 msnm</div>
                    <div><span className="font-bold text-amber-900">Notas:</span> Cacao, nueces, cuerpo denso, acidez cítrica</div>
                  </div>
                  <div className="border-t border-dashed border-stone-300 my-1.5" />
                  <div className="text-[8px] bg-amber-50/50 border border-amber-900/10 p-2 rounded">
                    <span className="font-bold text-amber-900 block uppercase tracking-wider text-[7px] mb-0.5">Ficha de Calibración Barista (Art. 7)</span>
                    <div className="grid grid-cols-2 gap-1 text-[8px] text-stone-600 font-mono">
                      <div>Gramos In: <span className="font-bold text-stone-800">{calibration.gramosIn}g</span></div>
                      <div>Mils Out: <span className="font-bold text-stone-800">{calibration.mililitrosOut}ml</span></div>
                      <div>Tiempo: <span className="font-bold text-stone-800">{calibration.tiempo}s</span></div>
                      <div>Temp: <span className="font-bold text-stone-800">{calibration.temperatura}°C</span></div>
                    </div>
                    <div className="mt-1 text-[6px] text-stone-500 text-right">Clima: {calibration.clima}</div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 w-full max-w-[280px]">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-3 text-xs font-bold text-espresso bg-white hover:bg-stone-50 border border-coffee/30 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 py-3 text-xs font-bold text-white bg-espresso hover:bg-caramel rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" /> PDF Ticket
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
