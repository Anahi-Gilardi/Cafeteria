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
    .filter(it => isBarraItem(it.name));

  const cocinaItems = order.items
    .map((item, originalIdx) => ({ ...item, originalIdx }))
    .filter(it => !isBarraItem(it.name));

  const isLate = elapsedMinutes > (order.estimatedMinutes || 20);
  const totalItemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const statusBadgeStyle = {
    Recibido: "bg-[#843747] text-white border-[#843747]",
    Preparando: "bg-[#B97932] text-white border-[#B97932]",
    Listo: "bg-[#4F735A] text-white border-[#4F735A]",
    Completado: "bg-[#55748A] text-white border-[#55748A]"
  }[order.status] || "bg-[#843747] text-white";

  return (
    <div className="w-full bg-[#FFF9F4] border border-[#D7BBA8] rounded-3xl p-5 text-[#332424] shadow-sm space-y-4 font-sans relative overflow-hidden">
      
      {/* Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#843747]"></div>

      {/* 1. ENCABEZADO (Header de Comanda) */}
      <div className="border-b border-[#D7BBA8] pb-3 pt-1 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-white bg-[#843747] px-2.5 py-0.5 rounded-lg">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8D4C3] text-[#843747] border border-[#D7BBA8] font-mono">
                {currentSlot.name.split(":")[0]}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <MapPin className="h-4 w-4 text-[#843747]" />
              <h3 className="font-serif text-lg font-bold text-[#843747]">
                {order.priceList === "Takeaway" || order.type === "Llevar"
                  ? `Retiro en Local`
                  : order.priceList === "Delivery" || order.fulfillmentType === "delivery"
                  ? `Delivery`
                  : `${order.tableNumber || "Mesa 1"}`}
              </h3>
              <span className="text-[10px] text-[#6F5A55] font-bold block mt-0.5">
                👤 {order.clientAccountName || order.customerName || `Atiende: ${waiterName}`}
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            {/* Real-time Timer / SLA Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              isLate 
                ? "bg-[#A63F45] text-white border-[#A63F45] animate-pulse" 
                : elapsedMinutes > 10 
                ? "bg-[#B97932] text-white border-[#B97932]" 
                : "bg-[#4F735A] text-white border-[#4F735A]"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span>{elapsedMinutes} min</span>
            </div>

            <div className="text-[9.5px] text-[#6F5A55] font-bold flex items-center justify-end gap-1 bg-[#E8D4C3] px-2.5 py-1 rounded-xl border border-[#D7BBA8] shadow-xs">
              <User className="h-3.5 w-3.5 text-[#843747]" />
              <span>Resp: <strong className="text-[#332424] font-mono">{order.clientAccountName || order.customerName || waiterName}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUERPO PRINCIPAL */}
      <div className="max-h-[360px] overflow-y-auto pr-1 space-y-4">
        
        {/* Agrupación BARRA & INFUSIONES */}
        {barraItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#843747] border-b border-[#D7BBA8] pb-1">
              <Coffee className="h-3.5 w-3.5 text-[#843747]" />
              <span>BARRA & CAFETERÍA ({barraItems.length})</span>
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
                        ? "bg-[#DFEADF] border-[#4F735A] opacity-65"
                        : "bg-[#FFF9F4] border-[#D7BBA8] hover:border-[#843747]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-[#D7BBA8] text-[#843747] focus:ring-0 cursor-pointer"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-white bg-[#843747] px-2 py-0.5 rounded-md">
                            {item.quantity}x
                          </span>
                          <strong className={`text-xs font-bold ${isChecked ? "line-through text-[#6F5A55]" : "text-[#332424]"}`}>
                            {item.name}
                          </strong>
                        </div>

                        {item.customizationSummary && (
                          <div className="pt-0.5">
                            <span className="text-[9px] font-bold bg-[#F5E4CC] text-[#B97932] border border-[#D7BBA8] px-2 py-0.5 rounded-md">
                              {item.customizationSummary}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#843747] shrink-0">
                      ${(item.price * item.quantity).toLocaleString("es-AR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agrupación COCINA & PARRILLA */}
        {cocinaItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#843747] border-b border-[#D7BBA8] pb-1">
              <Utensils className="h-3.5 w-3.5 text-[#843747]" />
              <span>COCINA & PARRILLA ({cocinaItems.length})</span>
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
                        ? "bg-[#DFEADF] border-[#4F735A] opacity-65"
                        : "bg-[#FFF9F4] border-[#D7BBA8] hover:border-[#843747]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-[#D7BBA8] text-[#843747] focus:ring-0 cursor-pointer"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-white bg-[#843747] px-2 py-0.5 rounded-md">
                            {item.quantity}x
                          </span>
                          <strong className={`text-xs font-bold ${isChecked ? "line-through text-[#6F5A55]" : "text-[#332424]"}`}>
                            {item.name}
                          </strong>
                        </div>

                        {item.customizationSummary && (
                          <div className="pt-0.5">
                            <span className="text-[9px] font-bold bg-[#F5E4CC] text-[#B97932] border border-[#D7BBA8] px-2 py-0.5 rounded-md">
                              {item.customizationSummary}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#843747] shrink-0">
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
      <div className="border-t border-[#D7BBA8] pt-3 space-y-3">
        {/* Item Counter & Status Bar */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#6F5A55]">Total Ítems: <strong>{totalItemCount}</strong></span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${statusBadgeStyle}`}>
              {order.status}
            </span>
          </div>

          <span className="font-serif text-base font-black text-[#843747] font-mono">
            ${order.total.toLocaleString("es-AR")}
          </span>
        </div>

        {/* Action Buttons Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => {
              window.print();
              if (onShowNotification) onShowNotification(`🖨️ Imprimiendo pre-ticket de comanda #${order.id.slice(-6).toUpperCase()}...`, "info");
            }}
            className="py-2 px-2 bg-[#E8D4C3] hover:bg-[#843747] hover:text-white border border-[#D7BBA8] text-[#843747] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" /> Pre-ticket
          </button>

          <button
            onClick={markAllAsChecked}
            className="py-2 px-2 bg-[#E8D4C3] hover:bg-[#4F735A] hover:text-white border border-[#D7BBA8] text-[#4F735A] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5" /> Marcar Todo
          </button>

          {onAddItem && (
            <button
              onClick={() => onAddItem(order.id)}
              className="py-2 px-2 bg-[#E8D4C3] hover:bg-[#843747] hover:text-white border border-[#D7BBA8] text-[#843747] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir Ítem
            </button>
          )}

          {onRequestBill && order.tableNumber && (
            <button
              onClick={() => onRequestBill(order.tableNumber!)}
              className="py-2 px-2 bg-[#843747] hover:bg-[#71303D] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5" /> Pedir Cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
