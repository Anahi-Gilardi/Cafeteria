import { Order, OrderStatusType, MenuItem } from "../types";
import { Clock, CheckCircle2, BookOpen, ChefHat, CookingPot, Eye, Archive, RefreshCw, Search, Trash2, MessageCircle } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { WhatsAppNotificationService } from "../services/WhatsAppNotificationService";
import { ArchivedOrderRecord, SupabaseSyncService } from "../services/SupabaseSyncService";
import { isOrderActive } from "../utils/orderUtils";

interface KitchenDisplayProps {
  orders: Order[];
  menuItems: MenuItem[];
  onOrderStatusUpdate: (orderId: string, status: OrderStatusType) => void;
  onArchiveOrder: (orderId: string) => Promise<boolean>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
  canDeleteOrders: boolean;
}

export default function KitchenDisplay({
  orders,
  menuItems,
  onOrderStatusUpdate,
  onArchiveOrder,
  onDeleteOrder,
  canDeleteOrders
}: KitchenDisplayProps) {
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | "Salon" | "Takeaway" | "Delivery">("all");
  const [destinationFilter, setDestinationFilter] = useState<"all" | "barra" | "cocina" | "parrilla" | "cocina_fria" | "barra_tragos">("all");
  const [activeMobileTab, setActiveMobileTab] = useState<"pendientes" | "preparando" | "finalizadas">("pendientes");
  const knownPendingOrderIds = useRef(
    new Set(orders.filter((order) => order.status === "Recibido").map((order) => order.id))
  );
  const [showArchive, setShowArchive] = useState(false);
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrderRecord[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archivingOrderId, setArchivingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const loadArchive = async () => {
    setArchiveLoading(true);
    const result = await SupabaseSyncService.fetchArchivedOrders();
    setArchiveLoading(false);
    if (result.error) {
      setArchiveError(result.error);
      return;
    }
    setArchiveError("");
    setArchivedOrders(result.archivedOrders);
  };

  useEffect(() => {
    void loadArchive();
  }, []);

  const handleArchiveOrder = async (order: Order) => {
    if (archivingOrderId || deletingOrderId) return;
    setArchivingOrderId(order.id);
    const archived = await onArchiveOrder(order.id);
    if (archived) {
      await loadArchive();
    }
    setArchivingOrderId(null);
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!canDeleteOrders || deletingOrderId || archivingOrderId) return;
    const confirmed = window.confirm(
      `¿Eliminar permanentemente la comanda ${formatOrderId(order.id)}?\n\n` +
      "Esta acción no se puede deshacer. Solo se permitirá si no tiene pagos ni comprobantes fiscales; el stock consumido se restaurará automáticamente."
    );
    if (!confirmed) return;

    setDeletingOrderId(order.id);
    await onDeleteOrder(order.id);
    setDeletingOrderId(null);
  };

  const handleUpdateStatus = (order: Order, newStatus: OrderStatusType) => {
    onOrderStatusUpdate(order.id, newStatus);
  };

  const handleNotifyWhatsApp = (order: Order) => {
    const customerPhone = order.customerPhone || order.clientPhone;
    if (!customerPhone) {
      alert("Este pedido no tiene número de teléfono registrado.");
      return;
    }

    if (order.priceList === "Delivery" || order.fulfillmentType === "delivery") {
      WhatsAppNotificationService.sendDeliveryEnCaminoNotification({
        id: order.id,
        customerName: order.clientAccountName || "Cliente",
        customerPhone,
        deliveryAddress: order.deliveryAddress ? `${order.deliveryAddress.street} ${order.deliveryAddress.number}` : "Dirección indicada",
        total: order.total,
        type: "Delivery"
      });
    } else {
      WhatsAppNotificationService.sendReadyForPickupNotification({
        id: order.id,
        customerName: order.clientAccountName || "Cliente",
        customerPhone,
        total: order.total,
        type: "Takeaway"
      });
    }
  };

  const getItemDestination = (name: string): "barra" | "cocina" | "parrilla" | "cocina_fria" | "barra_tragos" => {
    const n = (name || "").toLowerCase();
    if (n.includes("bife") || n.includes("entraña") || n.includes("provolone") || n.includes("parrilla") || n.includes("asado") || n.includes("chorizo") || n.includes("bondiola")) {
      return "parrilla";
    }
    if (n.includes("flan") || n.includes("tiramisú") || n.includes("volcán") || n.includes("ensalada") || n.includes("bruschetta")) {
      return "cocina_fria";
    }
    if (n.includes("vino") || n.includes("aperol") || n.includes("cerveza") || n.includes("trago") || n.includes("coctel") || n.includes("spritz")) {
      return "barra_tragos";
    }
    if (
      n.includes("café") || n.includes("cafe") || n.includes("latte") || n.includes("flat") || 
      n.includes("espresso") || n.includes("cappuccino") || n.includes("macchiato") || 
      n.includes("mocaccino") || n.includes("submarino") || n.includes("té") || n.includes("te") || 
      n.includes("limonada") || n.includes("jugo") || n.includes("licuado") || n.includes("cold") || 
      n.includes("iced") || n.includes("filtrado") || n.includes("prensa") || n.includes("tonic")
    ) {
      return "barra";
    }
    return "cocina";
  };

  const getFilteredItems = (items: any[]) => {
    if (!items || !Array.isArray(items)) return [];
    if (destinationFilter === "all") return items;
    return items.filter(it => getItemDestination(it.name) === destinationFilter);
  };

  // Active orders come exclusively from the synchronized order stream.
  const mergedOrders = useMemo(() => {
    return orders.filter(o => o.status !== "Completado" && (filterType === "all" || o.priceList === filterType));
  }, [orders, filterType]);

  // Filtered Orders by Destination
  const activeOrders = useMemo(() => {
    return mergedOrders
      .filter(o => {
        if (destinationFilter === "all") return true;
        return o.items && o.items.some(it => getItemDestination(it.name) === destinationFilter);
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [mergedOrders, destinationFilter]);

  // Split active orders into 3 Kanban Columns (exclusively excluding "Completado")
  const pendingOrders = useMemo(() => activeOrders.filter(o => o.status === "Recibido"), [activeOrders]);
  const inProgressOrders = useMemo(() => activeOrders.filter(o => o.status === "Preparando"), [activeOrders]);
  const completedOrders = useMemo(() => activeOrders.filter(o => o.status === "Listo"), [activeOrders]);
  const allArchivedList = useMemo(() => {
    return [...archivedOrders].sort(
      (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );
  }, [archivedOrders]);

  const visibleArchivedOrders = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();
    if (!query) return allArchivedList;
    return allArchivedList.filter(({ order }) => {
      const searchable = [
        order.id,
        order.tableNumber,
        order.customerName,
        order.clientAccountName,
        order.paymentMethod,
        ...(order.items || []).map((item) => item.name)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [archiveSearch, allArchivedList]);

  // Keep only a brief non-verbal alert for genuinely new orders.
  useEffect(() => {
    const receivedOrders = orders.filter((o) => o.status === "Recibido");
    const hasNewOrder = receivedOrders.some((order) => !knownPendingOrderIds.current.has(order.id));
    if (hasNewOrder) {
      playAlertSound();
    }
    knownPendingOrderIds.current = new Set(receivedOrders.map((order) => order.id));
  }, [orders]);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.value = 587.33;
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("AudioContext blocked");
    }
  };

  const getElapsedTimeStr = (createdAt: string) => {
    try {
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) {
        return "5 min";
      }
      const diffMs = Date.now() - created.getTime();
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      return `${mins} min`;
    } catch (e) {
      return "5 min";
    }
  };

  const formatOrderId = (id: string) => {
    if (!id) return "#PED-0001";
    if (id.startsWith("PED-") || id.startsWith("RET-") || id.startsWith("DEL-")) return `#${id}`;
    const rawSuffix = id.split("-").pop() || id;
    const shortCode = rawSuffix.slice(-4).toUpperCase();
    return `#PED-${shortCode}`;
  };

  // Render a Single Kanban Comanda Card
  const renderComandaCard = (order: Order, currentColumn: "pendientes" | "preparando" | "finalizadas") => {
    const elapsedMins = parseInt(getElapsedTimeStr(order.createdAt)) || 1;
    const isLate = elapsedMins > (order.estimatedMinutes || 20);

    let slaColor = "bg-[#4F735A] text-white"; // Normal
    let slaLabel = "NORMAL";
    if (elapsedMins > 25) {
      slaColor = "bg-[#A63F45] text-white animate-pulse"; // Crítico
      slaLabel = "CRÍTICO";
    } else if (elapsedMins > 15) {
      slaColor = "bg-[#B97932] text-white"; // Demorado
      slaLabel = "DEMORADO";
    }

    return (
      <div
        key={order.id}
        className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all space-y-3"
      >
        {/* Card Top Header */}
        <div>
          <div className="flex items-start justify-between border-b border-[#CFB5A0]/40 pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-[#5C1D27] text-white font-mono shadow-xs">
                  {order.tableNumber ? `🪑 MESA ${order.tableNumber.toString().replace(/mesa\s*/i, "")}` : (order.priceList === "Takeaway" || order.type === "Llevar" ? "🛍️ RETIRO BARRA" : "🛵 DELIVERY")}
                </span>
                {order.waiterName && (
                  <span className="text-[10px] font-bold text-[#5E393F] bg-[#EBDAC5] px-2 py-0.5 rounded-lg border border-[#CFB5A0]">
                    Mozo: {order.waiterName}
                  </span>
                )}
              </div>
              <h4 className="text-[11px] font-mono font-bold mt-1 text-[#5C1D27]">{formatOrderId(order.id)}</h4>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${slaColor}`}>
                <Clock className="h-3 w-3" /> {elapsedMins}m ({slaLabel})
              </span>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {getFilteredItems(order.items).map((it: any, idx: number) => {
              const catalogItem = menuItems.find(m => m.name.toLowerCase() === (it.name || "").toLowerCase());
              return (
                <div 
                  key={idx} 
                  className="text-xs font-semibold leading-relaxed border-b border-[#CFB5A0]/20 pb-1.5 flex justify-between items-center"
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[#5C1D27] font-bold font-mono text-xs">{it.quantity}x</span>
                    <span className="text-[#2D0E13] text-xs font-medium">{it.name}</span>
                  </div>
                  {catalogItem && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemForRecipe(catalogItem)}
                      className="text-[9px] bg-[#EBDAC5] text-[#5C1D27] hover:bg-[#5C1D27] hover:text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                    >
                      Receta
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button for State Transition */}
        <div className="pt-2 border-t border-[#CFB5A0]/30">
          {currentColumn === "pendientes" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order, "Preparando")}
              className="w-full py-2.5 px-3 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              👨‍🍳 Preparar →
            </button>
          )}

          {currentColumn === "preparando" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order, "Listo")}
              className="w-full py-2.5 px-3 rounded-xl bg-[#4F735A] hover:bg-[#3D5B46] text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <CheckCircle2 className="h-4 w-4 text-white" /> ✅ Marcar Listo
            </button>
          )}

          {currentColumn === "finalizadas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(order, "Completado")}
                className="w-full py-2.5 px-3 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="h-4 w-4 text-white" /> Entregado
              </button>

              <button
                type="button"
                onClick={() => handleNotifyWhatsApp(order)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd59] text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-emerald-400/30"
              >
                <MessageCircle className="h-4 w-4 text-white" /> Avisar WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4E8D7] text-[#2D0E13] p-4 md:p-6 font-sans">
      
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#CFB5A0] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-[#5C1D27]" />
            <h1 className="font-serif text-2xl font-black uppercase tracking-wider text-[#2D0E13]">👨‍🍳 Cocina & Chef</h1>
          </div>
          <p className="text-xs text-[#5E393F] font-medium mt-1">
            Tablero Kanban de 3 columnas para Resto Bar Del Teatro (Constitución 944, Río Cuarto).
          </p>
        </div>

        {/* Workstation & Channel Filters */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#FAF2E6] border border-[#CFB5A0] text-xs font-bold text-[#2D0E13] shadow-xs outline-none cursor-pointer"
          >
            <option value="all">Todos los Puestos</option>
            <option value="parrilla">Parrilla</option>
            <option value="cocina">Cocina Caliente</option>
            <option value="cocina_fria">Cocina Fría & Postres</option>
            <option value="barra_tragos">Barra Tragos & Vinos</option>
            <option value="barra">Barista & Cafetería</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#FAF2E6] border border-[#CFB5A0] text-xs font-bold text-[#2D0E13] shadow-xs outline-none cursor-pointer"
          >
            <option value="all">Todos los Canales</option>
            <option value="Salon">Salón</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Delivery">Delivery</option>
          </select>

          <button
            type="button"
            onClick={async () => {
              const confirmed = window.confirm("¿Desea limpiar y marcar como completadas todas las comandas de prueba actuales?");
              if (!confirmed) return;
              try {
                const { supabase } = await import("../lib/supabase");
                await supabase.from("orders").update({ status: "Completado", updated_at: new Date().toISOString() }).neq("status", "Completado");
                localStorage.removeItem("resto_bar_orders");
                localStorage.removeItem("castano_local_orders");
                localStorage.removeItem("castano_offline_orders");
                window.location.reload();
              } catch {
                alert("No se pudieron limpiar las comandas.");
              }
            }}
            className="px-3 py-2 rounded-xl bg-[#FAF2E6] border border-[#CFB5A0] text-xs font-black text-[#A63F45] hover:bg-[#F4DCDD] transition-all cursor-pointer flex items-center gap-1.5"
            title="Limpiar y completar todas las comandas fantasmas o de prueba"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar Fantasmas
          </button>

          <button
            type="button"
            onClick={() => setShowArchive((current) => !current)}
            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              showArchive
                ? "bg-[#5C1D27] border-[#5C1D27] text-white"
                : "bg-[#FAF2E6] border-[#CFB5A0] text-[#5C1D27] hover:bg-[#EBDAC5]"
            }`}
          >
            <Archive className="h-4 w-4" />
            Archivo ({allArchivedList.length})
          </button>
        </div>
      </div>

      {showArchive ? (
        <section className="space-y-4" aria-label="Archivo de comandas">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5C1D27]">
                  Historial permanente
                </span>
                <h2 className="font-serif text-xl font-black text-[#2D0E13] mt-1">
                  Archivo de comandas
                </h2>
                <p className="text-xs text-[#5E393F] mt-1">
                  Cada registro conserva la orden completa y sus renglones normalizados en Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadArchive()}
                disabled={archiveLoading}
                className="px-3 py-2 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-xs font-black flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${archiveLoading ? "animate-spin" : ""}`} />
                Actualizar archivo
              </button>
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C1D27]" />
              <input
                type="search"
                value={archiveSearch}
                onChange={(event) => setArchiveSearch(event.target.value)}
                placeholder="Buscar por comanda, mesa, cliente, medio de pago o producto"
                className="w-full rounded-xl border border-[#CFB5A0] bg-white py-2.5 pl-10 pr-4 text-xs text-[#2D0E13] outline-none focus:border-[#5C1D27]"
              />
            </div>
          </div>

          {archiveError ? (
            <div className="rounded-2xl border border-[#A63F45]/40 bg-[#F4DCDD] p-5 text-xs font-bold text-[#5C1D27]">
              No se pudo consultar el archivo: {archiveError}
            </div>
          ) : archiveLoading && archivedOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CFB5A0] bg-[#FAF2E6] p-10 text-center text-xs text-[#5E393F]">
              Cargando comandas archivadas…
            </div>
          ) : visibleArchivedOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CFB5A0] bg-[#FAF2E6] p-10 text-center">
              <Archive className="mx-auto h-8 w-8 text-[#5C1D27]/50" />
              <p className="mt-3 text-xs font-bold text-[#5C1D27]">
                {archiveSearch ? "No hay resultados para esta búsqueda." : "Todavía no hay comandas archivadas."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visibleArchivedOrders.map(({ orderId, archivedAt, order }) => (
                <article
                  key={orderId}
                  className="rounded-2xl border border-[#CFB5A0] bg-[#FAF2E6] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[#CFB5A0]/60 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#5E393F]">
                        Archivada {new Date(archivedAt).toLocaleString("es-AR")}
                      </span>
                      <h3 className="mt-1 font-mono text-sm font-black text-[#5C1D27]">
                        {formatOrderId(orderId)}
                      </h3>
                      <p className="mt-1 text-[11px] font-bold text-[#2D0E13]">
                        {order.tableNumber || order.customerName || order.clientAccountName || order.type}
                      </p>
                    </div>
                    <strong className="font-mono text-base text-[#5C1D27]">
                      ${order.total.toLocaleString("es-AR")}
                    </strong>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {order.items.map((item, index) => (
                      <div
                        key={`${orderId}-${item.itemId || item.name}-${index}`}
                        className="flex justify-between gap-3 text-xs text-[#2D0E13]"
                      >
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-mono font-bold text-[#5E393F]">
                          ${(item.quantity * item.price).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#CFB5A0]/60 pt-3 text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
                    <span className="rounded-full bg-[#EBDAC5] px-2.5 py-1">
                      Original: {new Date(order.createdAt).toLocaleString("es-AR")}
                    </span>
                    {order.paymentMethod && (
                      <span className="rounded-full bg-[#EBDAC5] px-2.5 py-1">
                        {order.paymentMethod}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
      {/* Mobile Tab Selector (<768px) */}
      <div className="md:hidden flex border-b border-[#CFB5A0] mb-4 gap-2">
        <button
          onClick={() => setActiveMobileTab("pendientes")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "pendientes"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "bg-[#FAF2E6] text-[#5E393F]"
          }`}
        >
          Pendientes ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("preparando")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "preparando"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "bg-[#FAF2E6] text-[#5E393F]"
          }`}
        >
          En Preparación ({inProgressOrders.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("finalizadas")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "finalizadas"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "bg-[#FAF2E6] text-[#5E393F]"
          }`}
        >
          Finalizadas ({completedOrders.length})
        </button>
      </div>

      {/* Desktop 3-Column Kanban Layout (>=768px) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMN 1: PENDIENTES */}
        <div className={`space-y-4 ${activeMobileTab !== "pendientes" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#EBDAC5] border border-[#CFB5A0] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#2D0E13] flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-[#5C1D27]" /> 1. PENDIENTES
            </span>
            <span className="bg-[#5C1D27] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF2E6] rounded-2xl border border-dashed border-[#CFB5A0] text-xs text-[#5E393F]">
                Sin comandas pendientes.
              </div>
            ) : (
              pendingOrders.map(o => renderComandaCard(o, "pendientes"))
            )}
          </div>
        </div>

        {/* COLUMN 2: EN PREPARACIÓN */}
        <div className={`space-y-4 ${activeMobileTab !== "preparando" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#EBDAC5] border border-[#CFB5A0] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#2D0E13] flex items-center gap-1.5">
              <CookingPot className="h-4 w-4 text-[#B97932]" /> 2. EN PREPARACIÓN
            </span>
            <span className="bg-[#B97932] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {inProgressOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {inProgressOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF2E6] rounded-2xl border border-dashed border-[#CFB5A0] text-xs text-[#5E393F]">
                Sin comandas en preparación.
              </div>
            ) : (
              inProgressOrders.map(o => renderComandaCard(o, "preparando"))
            )}
          </div>
        </div>

        {/* COLUMN 3: FINALIZADAS */}
        <div className={`space-y-4 ${activeMobileTab !== "finalizadas" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#EBDAC5] border border-[#CFB5A0] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#2D0E13] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#4F735A]" /> 3. COMANDAS FINALIZADAS
            </span>
            <span className="bg-[#4F735A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {completedOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF2E6] rounded-2xl border border-dashed border-[#CFB5A0] text-xs text-[#5E393F]">
                Sin comandas finalizadas.
              </div>
            ) : (
              completedOrders.map(o => renderComandaCard(o, "finalizadas"))
            )}
          </div>
        </div>

      </div>
        </>
      )}

      {/* Recipe Modal Popup */}
      {selectedItemForRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border-2 border-[#5C1D27] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedItemForRecipe(null)}
              className="absolute top-4 right-4 text-[#5C1D27] hover:text-[#2D0E13] text-sm font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#5C1D27]" />
              <h3 className="font-serif text-lg font-bold text-[#2D0E13]">{selectedItemForRecipe.name}</h3>
            </div>
            <p className="text-xs text-[#5E393F] italic">{selectedItemForRecipe.description}</p>
            <div className="border-t border-[#CFB5A0] pt-3">
              <strong className="text-xs font-bold text-[#5C1D27] block mb-2">Ingredientes de la Receta:</strong>
              {selectedItemForRecipe.recipe && selectedItemForRecipe.recipe.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#2D0E13]">
                  {selectedItemForRecipe.recipe.map((r, i) => (
                    <li key={i} className="flex justify-between border-b border-[#CFB5A0]/30 pb-1">
                      <span>{r.ingredientId.replace("ins-", "").replace(/-/g, " ")}</span>
                      <span className="font-mono font-bold text-[#5C1D27]">{r.amount} kg/u</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#5E393F]">Elaboración estándar del Chef sin desglose de insumos.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
