import { Order, OrderStatusType, MenuItem } from "../types";
import { Clock, Play, CheckCircle2, AlertTriangle, Coffee, BookOpen, X, ChefHat, CookingPot, Eye, Archive } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { WhatsAppNotificationService } from "../services/WhatsAppNotificationService";

interface KitchenDisplayProps {
  orders: Order[];
  menuItems: MenuItem[];
  onOrderStatusUpdate: (orderId: string, status: OrderStatusType) => void;
}

export default function KitchenDisplay({ orders, menuItems, onOrderStatusUpdate }: KitchenDisplayProps) {
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | "Salon" | "Takeaway" | "Delivery">("all");
  const [destinationFilter, setDestinationFilter] = useState<"all" | "barra" | "cocina" | "parrilla" | "cocina_fria" | "barra_tragos">("all");
  const [activeMobileTab, setActiveMobileTab] = useState<"pendientes" | "preparando" | "finalizadas">("pendientes");
  const [previousOrdersCount, setPreviousOrdersCount] = useState<number>(0);
  const [demoOrdersState, setDemoOrdersState] = useState<Order[]>(() => [
    {
      id: "PED-6487",
      items: [
        { name: "Empanada Criolla Cordobesa a Cuchillo", price: 2800, quantity: 1 },
        { name: "Empanada Salteña Jugosa", price: 2800, quantity: 1 }
      ],
      total: 5600,
      status: "Listo",
      createdAt: new Date(Date.now() - 34 * 60000).toISOString(),
      tableNumber: "Delivery",
      clientAccountName: "AGUSTIN",
      priceList: "Delivery",
      fulfillmentType: "delivery",
      estimatedMinutes: 20
    },
    {
      id: "PED-7362",
      items: [
        { name: "Menú Ejecutivo Promocional (4 Pasos)", price: 14975, quantity: 1 }
      ],
      total: 14975,
      status: "Listo",
      createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
      tableNumber: "Mesa 1",
      clientAccountName: "CONSUMIDOR FINAL",
      priceList: "Salon",
      estimatedMinutes: 20
    },
    {
      id: "PED-9413",
      items: [
        { name: "Menú Ejecutivo Promocional (4 Pasos)", price: 14975, quantity: 1 }
      ],
      total: 14975,
      status: "Listo",
      createdAt: new Date(Date.now() - 21 * 60000).toISOString(),
      tableNumber: "Mesa 2",
      clientAccountName: "CONSUMIDOR FINAL",
      priceList: "Salon",
      estimatedMinutes: 20
    }
  ]);

  const handleUpdateStatus = (order: Order, newStatus: OrderStatusType) => {
    onOrderStatusUpdate(order.id, newStatus);
    setDemoOrdersState(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));

    if (newStatus === "Listo" && (order.priceList === "Takeaway" || order.type === "Llevar")) {
      WhatsAppNotificationService.sendReadyForPickupNotification({
        id: order.id,
        customerName: order.clientAccountName || "Cliente",
        customerPhone: (order as any).customerPhone || "3585042311",
        total: order.total,
        type: "Takeaway"
      });
    }

    if (newStatus === "Completado" && (order.priceList === "Delivery" || order.fulfillmentType === "delivery")) {
      WhatsAppNotificationService.sendDeliveryEnCaminoNotification({
        id: order.id,
        customerName: order.clientAccountName || "Cliente",
        customerPhone: (order as any).customerPhone || "3585042311",
        deliveryAddress: order.deliveryAddress ? `${order.deliveryAddress.street} ${order.deliveryAddress.number}` : "Constitución 944",
        total: order.total,
        type: "Delivery"
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

  // Merged Active Orders (excluding "Completado")
  const mergedOrders = useMemo(() => {
    const activeReal = orders.filter(o => o.status !== "Completado" && (filterType === "all" || o.type === filterType || o.priceList === filterType));
    if (activeReal.length > 0) {
      return activeReal;
    }
    // Fallback to demo orders state excluding archived
    return demoOrdersState.filter(o => o.status !== "Completado" && (filterType === "all" || o.type === filterType || o.priceList === filterType));
  }, [orders, filterType, demoOrdersState]);

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
  const pendingOrders = useMemo(() => activeOrders.filter(o => o.status === "Recibido" || o.status === "Pendiente"), [activeOrders]);
  const inProgressOrders = useMemo(() => activeOrders.filter(o => o.status === "Preparando"), [activeOrders]);
  const completedOrders = useMemo(() => activeOrders.filter(o => o.status === "Listo"), [activeOrders]);

  // Audio Notification
  useEffect(() => {
    const activeCount = orders.filter((o) => o.status === "Recibido").length;
    if (activeCount > previousOrdersCount) {
      playAlertSound();
    }
    setPreviousOrdersCount(activeCount);
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
    if (id.startsWith("PED-")) return `#${id}`;
    const cleanNum = id.replace(/\D/g, "");
    const shortNum = cleanNum.length > 0 ? cleanNum.slice(-4) : id.slice(-4).toUpperCase();
    return `#PED-${shortNum}`;
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
        className="bg-[#FFF9F4] border border-[#D7BBA8] rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all space-y-3"
      >
        {/* Card Top Header */}
        <div>
          <div className="flex items-start justify-between border-b border-[#D7BBA8]/40 pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#E8D4C3] text-[#843747] font-mono border border-[#D7BBA8]">
                  {order.priceList === "Takeaway" || order.type === "Llevar" ? "🛍️ RETIRO" : order.priceList === "Delivery" || order.fulfillmentType === "delivery" ? "🛵 DELIVERY" : `🪑 ${order.tableNumber || "SALÓN"}`}
                </span>
                <span className="text-xs font-serif font-black text-[#332424]">
                  {order.clientAccountName || order.customerName || "Cliente"}
                </span>
              </div>
              <h4 className="text-xs font-mono font-bold mt-1 text-[#843747]">{formatOrderId(order.id)}</h4>
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
                  className="text-xs font-semibold leading-relaxed border-b border-[#D7BBA8]/20 pb-1.5 flex justify-between items-center"
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[#843747] font-bold font-mono text-xs">{it.quantity}x</span>
                    <span className="text-[#332424] text-xs font-medium">{it.name}</span>
                  </div>
                  {catalogItem && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemForRecipe(catalogItem)}
                      className="text-[9px] bg-[#E8D4C3] text-[#843747] hover:bg-[#843747] hover:text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
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
        <div className="pt-2 border-t border-[#D7BBA8]/30">
          {currentColumn === "pendientes" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order, "Preparando")}
              className="w-full py-2 px-3 rounded-xl bg-[#843747] hover:bg-[#71303D] text-white text-xs font-black uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Eye className="h-4 w-4" /> Revisar Pedido →
            </button>
          )}

          {currentColumn === "preparando" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order, "Listo")}
              className="w-full py-2 px-3 rounded-xl bg-[#4F735A] hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <CheckCircle2 className="h-4 w-4" /> Finalizar Comanda ✓
            </button>
          )}

          {currentColumn === "finalizadas" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order, "Completado")}
              className="w-full py-2 px-3 rounded-xl bg-[#E8D4C3] hover:bg-[#D7BBA8] text-[#332424] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Archive className="h-4 w-4" /> Archivar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F3E7DB] text-[#332424] p-4 md:p-6 font-sans">
      
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D7BBA8] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-[#843747]" />
            <h1 className="font-serif text-2xl font-black uppercase tracking-wider text-[#332424]">👨‍🍳 Cocina & Chef</h1>
          </div>
          <p className="text-xs text-[#6F5A55] font-medium mt-1">
            Tablero Kanban de 3 columnas para Resto Bar Del Teatro (Constitución 944, Río Cuarto).
          </p>
        </div>

        {/* Workstation & Channel Filters */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#FFF9F4] border border-[#D7BBA8] text-xs font-bold text-[#332424] shadow-xs outline-none cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-[#FFF9F4] border border-[#D7BBA8] text-xs font-bold text-[#332424] shadow-xs outline-none cursor-pointer"
          >
            <option value="all">Todos los Canales</option>
            <option value="Salon">Salón</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Mobile Tab Selector (<768px) */}
      <div className="md:hidden flex border-b border-[#D7BBA8] mb-4 gap-2">
        <button
          onClick={() => setActiveMobileTab("pendientes")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "pendientes"
              ? "bg-[#843747] text-white shadow-xs"
              : "bg-[#FFF9F4] text-[#6F5A55]"
          }`}
        >
          Pendientes ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("preparando")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "preparando"
              ? "bg-[#843747] text-white shadow-xs"
              : "bg-[#FFF9F4] text-[#6F5A55]"
          }`}
        >
          En Preparación ({inProgressOrders.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("finalizadas")}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-t-xl transition-all ${
            activeMobileTab === "finalizadas"
              ? "bg-[#843747] text-white shadow-xs"
              : "bg-[#FFF9F4] text-[#6F5A55]"
          }`}
        >
          Finalizadas ({completedOrders.length})
        </button>
      </div>

      {/* Desktop 3-Column Kanban Layout (>=768px) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMN 1: PENDIENTES */}
        <div className={`space-y-4 ${activeMobileTab !== "pendientes" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#E8D4C3] border border-[#D7BBA8] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#332424] flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-[#843747]" /> 1. PENDIENTES
            </span>
            <span className="bg-[#843747] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FFF9F4] rounded-2xl border border-dashed border-[#D7BBA8] text-xs text-[#6F5A55]">
                Sin comandas pendientes.
              </div>
            ) : (
              pendingOrders.map(o => renderComandaCard(o, "pendientes"))
            )}
          </div>
        </div>

        {/* COLUMN 2: EN PREPARACIÓN */}
        <div className={`space-y-4 ${activeMobileTab !== "preparando" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#E8D4C3] border border-[#D7BBA8] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#332424] flex items-center gap-1.5">
              <CookingPot className="h-4 w-4 text-[#B97932]" /> 2. EN PREPARACIÓN
            </span>
            <span className="bg-[#B97932] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {inProgressOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {inProgressOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FFF9F4] rounded-2xl border border-dashed border-[#D7BBA8] text-xs text-[#6F5A55]">
                Sin comandas en preparación.
              </div>
            ) : (
              inProgressOrders.map(o => renderComandaCard(o, "preparando"))
            )}
          </div>
        </div>

        {/* COLUMN 3: FINALIZADAS */}
        <div className={`space-y-4 ${activeMobileTab !== "finalizadas" ? "hidden md:block" : "block"}`}>
          <div className="bg-[#E8D4C3] border border-[#D7BBA8] p-3 rounded-2xl flex justify-between items-center shadow-xs">
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[#332424] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#4F735A]" /> 3. COMANDAS FINALIZADAS
            </span>
            <span className="bg-[#4F735A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {completedOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FFF9F4] rounded-2xl border border-dashed border-[#D7BBA8] text-xs text-[#6F5A55]">
                Sin comandas finalizadas.
              </div>
            ) : (
              completedOrders.map(o => renderComandaCard(o, "finalizadas"))
            )}
          </div>
        </div>

      </div>

      {/* Recipe Modal Popup */}
      {selectedItemForRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF9F4] border-2 border-[#843747] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedItemForRecipe(null)}
              className="absolute top-4 right-4 text-[#843747] hover:text-[#332424] text-sm font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#843747]" />
              <h3 className="font-serif text-lg font-bold text-[#332424]">{selectedItemForRecipe.name}</h3>
            </div>
            <p className="text-xs text-[#6F5A55] italic">{selectedItemForRecipe.description}</p>
            <div className="border-t border-[#D7BBA8] pt-3">
              <strong className="text-xs font-bold text-[#843747] block mb-2">Ingredientes de la Receta:</strong>
              {selectedItemForRecipe.recipe && selectedItemForRecipe.recipe.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#332424]">
                  {selectedItemForRecipe.recipe.map((r, i) => (
                    <li key={i} className="flex justify-between border-b border-[#D7BBA8]/30 pb-1">
                      <span>{r.ingredientId.replace("ins-", "").replace(/-/g, " ")}</span>
                      <span className="font-mono font-bold text-[#843747]">{r.amount} kg/u</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#6F5A55]">Elaboración estándar del Chef sin desglose de insumos.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
