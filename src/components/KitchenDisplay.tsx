import { Order, OrderStatusType } from "../types";
import { Clock, Play, CheckCircle2, ChevronRight, AlertTriangle, Coffee } from "lucide-react";
import { useState, useEffect } from "react";

interface KitchenDisplayProps {
  orders: Order[];
  onOrderStatusUpdate: (orderId: string, status: OrderStatusType) => void;
}

export default function KitchenDisplay({ orders, onOrderStatusUpdate }: KitchenDisplayProps) {
  const [filterType, setFilterType] = useState<"all" | "Salon" | "Takeaway" | "Delivery">("all");
  const [previousOrdersCount, setPreviousOrdersCount] = useState<number>(0);

  // Filter orders that are active in kitchen (Recibido, Preparando, Listo)
  const activeOrders = orders
    .filter((o) => o.status !== "Completado")
    .filter((o) => filterType === "all" || o.type === filterType)
    // Sort so older orders are shown first (priority)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Notify (sound) when a new order arrives
  useEffect(() => {
    const activeCount = orders.filter((o) => o.status === "Recibido").length;
    if (activeCount > previousOrdersCount) {
      playAlertSound();
    }
    setPreviousOrdersCount(activeCount);
  }, [orders]);

  const playAlertSound = () => {
    try {
      // Create a nice synthesizer sound in browser using AudioContext
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Beep 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.value = 587.33; // D5 note
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.15);
      
      // Beep 2
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 880; // A5 note
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.2);
      }, 150);
    } catch (e) {
      console.log("AudioContext not supported or blocked by browser policy");
    }
  };

  const getElapsedTimeStr = (createdAt: string) => {
    try {
      // Calculate minutes elapsed since creation
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) {
        // Handle format '01:23:45'
        const parts = createdAt.split(":");
        if (parts.length >= 2) {
          const now = new Date();
          const hr = parseInt(parts[0]);
          const min = parseInt(parts[1]);
          const target = new Date();
          target.setHours(hr, min, 0, 0);
          const diffMs = now.getTime() - target.getTime();
          const mins = Math.max(0, Math.floor(diffMs / 60000));
          return `${mins} min`;
        }
        return "1 min";
      }
      const diffMs = Date.now() - created.getTime();
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      return `${mins} min`;
    } catch (e) {
      return "1 min";
    }
  };

  return (
    <div className="min-h-screen bg-[#1E110B] text-[#FDFBF7] p-6 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D97706]/20 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-caramel animate-pulse" />
            <h1 className="font-serif text-2xl font-black uppercase tracking-wider text-caramel">KDS - Control de Cocina y Barra</h1>
          </div>
          <p className="text-[10px] text-[#FDFBF7]/60 uppercase tracking-widest font-bold mt-1">
            Visualización y despacho de comandas en tiempo real
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0 bg-[#2C1810] p-1.5 rounded-xl border border-[#D97706]/15">
          {[
            { id: "all", label: "Todas" },
            { id: "Salon", label: "Salón" },
            { id: "Takeaway", label: "Takeaway" },
            { id: "Delivery", label: "Delivery" }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === btn.id
                  ? "bg-caramel text-white shadow-md"
                  : "text-[#FDFBF7]/70 hover:text-white"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of active orders */}
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#D97706]/10 rounded-3xl bg-[#2C1810]/20">
          <CheckCircle2 className="h-16 w-16 text-green-500/40 mb-4" />
          <h2 className="text-lg font-bold">¡Cocina al día!</h2>
          <p className="text-xs text-[#FDFBF7]/40 mt-1">No hay comandas activas para procesar en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeOrders.map((order) => {
            const isLate = parseInt(getElapsedTimeStr(order.createdAt)) > order.estimatedMinutes;
            const statusColors = {
              Recibido: "border-red-500/40 bg-red-950/20",
              Preparando: "border-[#D97706]/40 bg-[#D97706]/5",
              Listo: "border-emerald-500/40 bg-emerald-950/20"
            };

            return (
              <div
                key={order.id}
                className={`border rounded-2xl p-5 flex flex-col justify-between min-h-[350px] transition-all relative ${
                  isLate ? "border-red-600 ring-2 ring-red-600/30" : statusColors[order.status as keyof typeof statusColors] || "border-[#D97706]/20 bg-[#2C1810]/20"
                }`}
              >
                {/* Order Header */}
                <div>
                  <div className="flex items-start justify-between border-b border-[#FDFBF7]/10 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#D97706]/25 text-caramel">
                          {order.type}
                        </span>
                        {order.tableNumber && (
                          <span className="text-xs font-serif font-black text-white bg-espresso/80 px-2 py-0.5 rounded-md border border-[#D97706]/20">
                            Mesa {order.tableNumber}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-serif font-black mt-2 text-white">ID: #{order.id.slice(-6).toUpperCase()}</h3>
                    </div>

                    <div className="text-right">
                      {/* Time Elapsed Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isLate ? "bg-red-600 text-white animate-pulse" : "bg-espresso text-caramel"
                      }`}>
                        <Clock className="h-3 w-3" />
                        {getElapsedTimeStr(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2.5 my-3 max-h-[180px] overflow-y-auto pr-1">
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="text-xs font-semibold leading-relaxed border-b border-[#FDFBF7]/5 pb-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[#FDFBF7] font-serif font-black text-caramel text-sm mr-2">{it.quantity}x</span>
                          <span className="flex-1 text-[#FDFBF7] text-sm">{it.name}</span>
                        </div>
                        {it.customizationSummary && (
                          <p className="text-[10px] text-caramel font-semibold italic pl-6 mt-0.5">
                            ↳ ({it.customizationSummary})
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Actions */}
                <div className="border-t border-[#FDFBF7]/10 pt-4 mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#FDFBF7]/50 mb-1">
                    <span>Estado Actual:</span>
                    <span className={`font-black ${
                      order.status === "Recibido" ? "text-red-500" : order.status === "Preparando" ? "text-amber-500" : "text-emerald-500"
                    }`}>{order.status}</span>
                  </div>

                  {order.status === "Recibido" && (
                    <button
                      onClick={() => onOrderStatusUpdate(order.id, "Preparando")}
                      className="w-full bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Empezar Preparación
                    </button>
                  )}

                  {order.status === "Preparando" && (
                    <button
                      onClick={() => onOrderStatusUpdate(order.id, "Listo")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como Listo
                    </button>
                  )}

                  {order.status === "Listo" && (
                    <button
                      onClick={() => onOrderStatusUpdate(order.id, "Completado")}
                      className="w-full bg-espresso hover:bg-[#3d2217] text-white text-xs font-bold py-2.5 rounded-xl border border-[#D97706]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Despachar / Completar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
