import React from "react";
import { Order } from "../types";
import { CheckCircle, Clock, Truck, MapPin, Phone, MessageSquare, Utensils, X, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface ClientOrderTrackerProps {
  order: Order;
  onClose: () => void;
}

export default function ClientOrderTracker({ order, onClose }: ClientOrderTrackerProps) {
  const steps = [
    { id: "Recibido", label: "Pedido Confirmado", icon: Utensils, desc: "Recibido en comanda central" },
    { id: "Preparando", label: "En Cocina / Barra", icon: Clock, desc: "Nuestros chefs están marchando los platos" },
    { id: "Listo", label: order.fulfillmentType === "delivery" ? "En Camino" : "Listo para Servir / Retirar", icon: Truck, desc: order.fulfillmentType === "delivery" ? "El repartidor salió hacia tu domicilio" : "Puedes pasar a buscarlo por mostrador o mesa" },
    { id: "Completado", label: "Entregado", icon: CheckCircle, desc: "¡Que lo disfrutes mucho!" }
  ];

  const getActiveStepIndex = () => {
    switch (order.status) {
      case "Recibido": return 0;
      case "Preparando": return 1;
      case "Listo": return 2;
      case "Completado": return 3;
      default: return 0;
    }
  };

  const activeIndex = getActiveStepIndex();

  const sendWhatsAppUpdate = () => {
    let msg = `Hola ${order.customerName || "Cliente"}! 👋 Te escribimos de *Resto Bar Del Teatro* (Constitución 944, Río Cuarto).\n\n`;
    msg += `Estado de tu pedido *#${order.id.substring(order.id.length - 6).toUpperCase()}*: *${order.status.toUpperCase()}* 🚀\n`;
    if (order.fulfillmentType === "delivery" && order.deliveryAddress) {
      msg += `📍 Dirección: ${order.deliveryAddress.street} ${order.deliveryAddress.number}\n`;
    } else if (order.fulfillmentType === "takeaway") {
      msg += `🛍️ Retiro estimado por mostrador: en ${order.estimatedMinutes} min.\n`;
    }
    msg += `\n¡Gracias por tu preferencia! 🎭`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${order.customerPhone ? order.customerPhone.replace(/\D/g, "") : ""}?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-[#2C1810]/15 rounded-3xl p-6 shadow-2xl relative text-[#2C1810]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B] block">Seguimiento en Vivo • Resto Bar Del Teatro</span>
            <h3 className="font-serif text-xl font-bold">Comanda #{order.id.substring(order.id.length - 6).toUpperCase()}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fulfillment Tag */}
        <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-2xl p-3 mb-6 text-xs">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">Modalidad</span>
            <strong className="font-bold text-stone-800 uppercase flex items-center gap-1.5 mt-0.5">
              {order.fulfillmentType === "delivery" && <><Truck className="h-4 w-4 text-[#F59E0B]" /> Delivery a Domicilio</>}
              {order.fulfillmentType === "takeaway" && <><Clock className="h-4 w-4 text-[#F59E0B]" /> Retiro por Mostrador</>}
              {order.fulfillmentType === "salon" && <><Utensils className="h-4 w-4 text-[#F59E0B]" /> Salón ({order.tableNumber || "Mesa"})</>}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">Total</span>
            <strong className="font-mono text-base font-black text-[#2C1810]">${order.total.toFixed(2)}</strong>
          </div>
        </div>

        {/* Address or Customer Info if Delivery/Takeaway */}
        {order.fulfillmentType === "delivery" && order.deliveryAddress && (
          <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl mb-6 text-xs space-y-1">
            <span className="text-[9px] font-black uppercase text-amber-900 block flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Dirección de Envío:
            </span>
            <p className="font-bold text-stone-800">{order.deliveryAddress.street} {order.deliveryAddress.number} {order.deliveryAddress.floor || ""}</p>
            {order.deliveryAddress.notes && <p className="text-[10px] text-stone-600 italic">Notas: {order.deliveryAddress.notes}</p>}
            {order.customerPhone && <p className="text-[10px] font-mono text-amber-950 font-bold">Tel: {order.customerPhone}</p>}
          </div>
        )}

        {/* 4-Step Timeline Progress */}
        <div className="space-y-6 mb-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx <= activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div key={step.id} className="flex items-start gap-4 relative">
                {idx < steps.length - 1 && (
                  <div className={`absolute left-4 top-8 bottom-0 w-0.5 -mb-6 ${idx < activeIndex ? "bg-[#F59E0B]" : "bg-stone-200"}`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                  isCurrent
                    ? "bg-[#2C1810] text-[#F59E0B] ring-4 ring-[#F59E0B]/30 font-bold scale-110"
                    : isDone
                    ? "bg-[#F59E0B] text-white"
                    : "bg-stone-100 text-stone-400"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDone ? "text-stone-900" : "text-stone-400"}`}>
                    {step.label}
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-stone-200">
          <button
            onClick={sendWhatsAppUpdate}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" /> Notificar por WhatsApp
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
