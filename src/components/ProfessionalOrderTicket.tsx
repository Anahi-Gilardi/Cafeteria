import React, { useState, useEffect } from "react";
import { Order, OrderStatusType } from "../types";
import { TimeSlotService } from "../services/TimeSlotService";
import {
  Clock, CheckCircle, AlertTriangle, Printer, Plus, CheckSquare, 
  CreditCard, Coffee, Utensils, Flame, ChevronRight, User, MapPin, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ProfessionalOrderTicketProps {
  order: Order;
  waiterName?: string;
  onOrderStatusUpdate?: (orderId: string, status: OrderStatusType) => void;
  onAddItem?: (orderId: string) => void;
  onRequestBill?: (tableNumber: string) => void;
  onShowNotification?: (message: string, type: "success" | "info" | "warning") => void;
}

export default function ProfessionalOrderTicket({
  order,
  waiterName = "Sofía Colombo",
  onOrderStatusUpdate,
  onAddItem,
  onRequestBill,
  onShowNotification
}: ProfessionalOrderTicketProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const currentSlot = TimeSlotService.getCurrentTimeSlot();

  // Real-time timer calculation
  useEffect(() => {
    const calculateElapsed = () => {
      try {
        const created = new Date(order.createdAt).getTime();
        if (!isNaN(created)) {
          const diff = Math.max(0, Math.floor((Date.now() - created) / 60000));
          setElapsedMinutes(diff);
        } else {
          setElapsedMinutes(1);
        }
      } catch (e) {
        setElapsedMinutes(1);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Toggle item checkmark status
  const toggleCheckItem = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const markAllAsChecked = () => {
    const allChecked: Record<number, boolean> = {};
    order.items.forEach((_, idx) => {
      allChecked[idx] = true;
    });
    setCheckedItems(allChecked);
    if (onShowNotification) {
      onShowNotification(`✅ Todos los ítems marcados como listos para ${order.tableNumber || "Comanda"}.`, "success");
    }
  };

  // Group items by Destination (BARRA vs COCINA / PARRILLA / HORNO)
  const isBarraItem = (name: string) => {
    const n = name.toLowerCase();
    return (
      n.includes("café") || n.includes("cafe") || n.includes("latte") || n.includes("flat") || 
      n.includes("espresso") || n.includes("cappuccino") || n.includes("submarino") || n.includes("té") || 
      n.includes("limonada") || n.includes("jugo") || n.includes("licuado") || n.includes("vino") || 
      n.includes("trago") || n.includes("cerveza") || n.includes("spritz") || n.includes("aperol") ||
      n.includes("agua") || n.includes("gaseosa")
    );
  };

  const barraItems = order.items
    .map((item, originalIdx) => ({ ...item, originalIdx }))
    .filter(item => isBarraItem(item.name));

  const cocinaItems = order.items
    .map((item, originalIdx) => ({ ...item, originalIdx }))
    .filter(item => !isBarraItem(item.name));

  const totalItemCount = order.items.reduce((acc, curr) => acc + curr.quantity, 0);

  // Status Badge Colors & SLA Alert Thresholds
  const isLate = elapsedMinutes > (order.estimatedMinutes || 20);
  const statusBadgeStyle = {
    Recibido: "bg-amber-500/20 text-[#FFDF00] border-amber-500/50",
    Preparando: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    Listo: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
    Completado: "bg-stone-800 text-stone-300 border-stone-600"
  }[order.status] || "bg-[#2A1B12] text-[#FFDF00] border-[#D4AF37]";

  return (
    <div className="w-full bg-[#1A110B] border-2 border-[#D4AF37]/40 rounded-3xl p-5 text-[#F5E6DA] shadow-2xl space-y-4 gold-glow relative overflow-hidden font-sans">
      
      {/* Decorative Gold Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#996515] via-[#FFDF00] to-[#D4AF37]"></div>

      {/* 1. ENCABEZADO (Header de Comanda) */}
      <div className="border-b border-[#D4AF37]/25 pb-3 pt-1 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-black text-[#FFDF00] bg-[#2A1B12] px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/40">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFDF00]/10 text-[#FFDF00] border border-[#FFDF00]/30 font-mono">
                {currentSlot.emoji} {currentSlot.name.split(":")[0]}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <MapPin className="h-4 w-4 text-[#D4AF37]" />
              <h3 className="font-serif text-lg font-bold text-[#FFDF00]">
                {order.priceList === "Takeaway" || order.type === "Llevar"
                  ? `🛍️ RETIRO EN LOCAL`
                  : order.priceList === "Delivery" || order.fulfillmentType === "delivery"
                  ? `🛵 DELIVERY A DOMICILIO`
                  : `🪑 ${order.tableNumber || "Mesa 1"}`}
              </h3>
              <span className="text-[10px] text-[#F5E6DA]/70 font-bold block mt-0.5">
                👤 {order.clientAccountName || order.customerName || `Atiende: ${waiterName}`}
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            {/* Real-time Timer / SLA Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              isLate 
                ? "bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse" 
                : elapsedMinutes > 10 
                ? "bg-amber-950/80 text-amber-300 border-amber-500/40" 
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span>⏱️ {elapsedMinutes} min</span>
            </div>

            <div className="text-[9.5px] text-[#FFDF00] font-bold flex items-center justify-end gap-1 bg-[#2A1B12] px-2.5 py-1 rounded-xl border border-[#D4AF37]/30 shadow-xs">
              <User className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Resp: <strong className="text-white font-mono">{order.clientAccountName || order.customerName || waiterName}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUERPO PRINCIPAL (Contenedor con Scroll Interno Compacto Delgado) */}
      <div className="max-h-[360px] overflow-y-auto pr-1 space-y-4 custom-gold-scrollbar">
        
        {/* Agrupación BARRA & INFUSIONES */}
        {barraItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#D4AF37] border-b border-[#D4AF37]/20 pb-1">
              <Coffee className="h-3.5 w-3.5" />
              <span>☕ BARRA, CAFETERÍA & COCTELERÍA ({barraItems.length})</span>
            </div>

            <div className="space-y-2">
              {barraItems.map((item) => {
                const isChecked = !!checkedItems[item.originalIdx];
                return (
                  <div
                    key={item.originalIdx}
                    onClick={() => toggleCheckItem(item.originalIdx)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isChecked
                        ? "bg-[#2A1B12]/50 border-emerald-500/40 opacity-65"
                        : "bg-[#2A1B12] border-[#D4AF37]/25 hover:border-[#D4AF37]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-[#D4AF37] text-[#FFDF00] focus:ring-0 cursor-pointer"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#FFDF00] bg-[#1A110B] px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                            {item.quantity}x
                          </span>
                          <strong className={`text-xs font-bold ${isChecked ? "line-through text-[#F5E6DA]/50" : "text-[#F5E6DA]"}`}>
                            {item.name}
                          </strong>
                        </div>

                        {/* Modificadores / Aclaraciones */}
                        {item.customization ? (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.customization.specialInstructions && (
                              <span className="text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                ⚠️ {item.customization.specialInstructions}
                              </span>
                            )}
                            {item.customization.milk && (
                              <span className="text-[9px] font-bold bg-[#1A110B] text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                                🥛 Leche: {item.customization.milk}
                              </span>
                            )}
                          </div>
                        ) : item.customizationSummary ? (
                          <div className="pt-0.5">
                            <span className="text-[9px] font-bold bg-amber-950/60 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              ⚠️ {item.customizationSummary}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#D4AF37] shrink-0">
                      ${(item.price * item.quantity).toLocaleString("es-AR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agrupación COCINA, PARRILLA & PIZZERÍA */}
        {cocinaItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#D4AF37] border-b border-[#D4AF37]/20 pb-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>🍳 COCINA, PARRILLA & HORNO ({cocinaItems.length})</span>
            </div>

            <div className="space-y-2">
              {cocinaItems.map((item) => {
                const isChecked = !!checkedItems[item.originalIdx];
                return (
                  <div
                    key={item.originalIdx}
                    onClick={() => toggleCheckItem(item.originalIdx)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isChecked
                        ? "bg-[#2A1B12]/50 border-emerald-500/40 opacity-65"
                        : "bg-[#2A1B12] border-[#D4AF37]/25 hover:border-[#D4AF37]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-[#D4AF37] text-[#FFDF00] focus:ring-0 cursor-pointer"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#FFDF00] bg-[#1A110B] px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                            {item.quantity}x
                          </span>
                          <strong className={`text-xs font-bold ${isChecked ? "line-through text-[#F5E6DA]/50" : "text-[#F5E6DA]"}`}>
                            {item.name}
                          </strong>
                        </div>

                        {/* Menú Ejecutivo / Pasos / Modificadores */}
                        {item.customization ? (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.customization.executiveChoices && (
                              <div className="text-[9px] text-[#D4AF37] bg-[#1A110B] p-2 rounded-xl border border-[#D4AF37]/30 space-y-0.5 w-full">
                                <div><strong>Entrada:</strong> {item.customization.executiveChoices.starter}</div>
                                <div><strong>Principal:</strong> {item.customization.executiveChoices.main}</div>
                                <div><strong>Bebida:</strong> {item.customization.executiveChoices.drink}</div>
                                <div><strong>Postre:</strong> {item.customization.executiveChoices.dessert}</div>
                              </div>
                            )}

                            {item.customization.cookingPoint && (
                              <span className="text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                🔥 Punto: {item.customization.cookingPoint}
                              </span>
                            )}

                            {item.customization.sideDish && (
                              <span className="text-[9px] font-bold bg-[#1A110B] text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                                🍟 Guarnición: {item.customization.sideDish}
                              </span>
                            )}

                            {item.customization.specialInstructions && (
                              <span className="text-[9px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                                ⚠️ {item.customization.specialInstructions}
                              </span>
                            )}
                          </div>
                        ) : item.customizationSummary ? (
                          <div className="pt-0.5">
                            <span className="text-[9px] font-bold bg-amber-950/60 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              ⚠️ {item.customizationSummary}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#D4AF37] shrink-0">
                      ${(item.price * item.quantity).toLocaleString("es-AR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. PIE DE COMANDA (Footer Fijo) */}
      <div className="border-t border-[#D4AF37]/25 pt-3 space-y-3">
        {/* Item Counter & Status Bar */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#D4AF37]">Total Ítems: <strong>{totalItemCount}</strong></span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border font-mono ${statusBadgeStyle}`}>
              {order.status}
            </span>
          </div>

          <span className="font-serif text-base font-black text-[#FFDF00] font-mono">
            ${order.total.toLocaleString("es-AR")}
          </span>
        </div>

        {/* General Order Notes if existing */}
        {order.notes && (
          <div className="p-2.5 bg-amber-950/50 border border-amber-500/30 rounded-xl text-[10px] text-amber-200 italic font-semibold">
            📝 <strong>Nota Comanda:</strong> "{order.notes}"
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => {
              window.print();
              if (onShowNotification) onShowNotification(`🖨️ Imprimiendo pre-ticket de comanda #${order.id.slice(-6).toUpperCase()}...`, "info");
            }}
            className="py-2 px-2 bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Pre-ticket
          </button>

          <button
            onClick={markAllAsChecked}
            className="py-2 px-2 bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" /> Marcar Todo
          </button>

          {onAddItem && (
            <button
              onClick={() => onAddItem(order.id)}
              className="py-2 px-2 bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir Ítem
            </button>
          )}

          {onRequestBill && order.tableNumber && (
            <button
              onClick={() => onRequestBill(order.tableNumber!)}
              className="py-2 px-2 bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md gold-glow"
            >
              <CreditCard className="h-3.5 w-3.5" /> Pedir Cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
