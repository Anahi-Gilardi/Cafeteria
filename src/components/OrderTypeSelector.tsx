import React from "react";
import { Utensils, ShoppingBag, Bike } from "lucide-react";

export type OrderServiceType = "salon" | "takeaway" | "delivery";

export interface TakeawayDetails {
  customerName: string;
  customerPhone: string;
  estimatedTime?: string;
}

export interface DeliveryDetails {
  customerName: string;
  customerPhone: string;
  street: string;
  number: string;
  floorNotes?: string;
  deliveryFee: number;
}

interface OrderTypeSelectorProps {
  activeType: OrderServiceType;
  onChangeType: (type: OrderServiceType) => void;
  takeawayForm: TakeawayDetails;
  onChangeTakeawayForm: (form: TakeawayDetails) => void;
  deliveryForm: DeliveryDetails;
  onChangeDeliveryForm: (form: DeliveryDetails) => void;
}

export const OrderTypeSelector: React.FC<OrderTypeSelectorProps> = ({
  activeType,
  onChangeType,
  takeawayForm,
  onChangeTakeawayForm,
  deliveryForm,
  onChangeDeliveryForm
}) => {
  return (
    <div className="bg-[#1A110B] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-xl space-y-4 gold-glow text-[#FDFBF7]">
      {/* Triple Tab Selector Bar */}
      <div className="grid grid-cols-3 gap-2 bg-[#2A1B12] p-1.5 rounded-2xl border border-[#D4AF37]/20">
        <button
          type="button"
          onClick={() => onChangeType("salon")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "salon"
              ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] shadow-md gold-glow"
              : "text-[#FDFBF7]/60 hover:text-white"
          }`}
        >
          <Utensils className="h-3.5 w-3.5" /> Salón
        </button>

        <button
          type="button"
          onClick={() => onChangeType("takeaway")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "takeaway"
              ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] shadow-md gold-glow"
              : "text-[#FDFBF7]/60 hover:text-white"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Retiro
        </button>

        <button
          type="button"
          onClick={() => onChangeType("delivery")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "delivery"
              ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] shadow-md gold-glow"
              : "text-[#FDFBF7]/60 hover:text-white"
          }`}
        >
          <Bike className="h-3.5 w-3.5" /> Delivery
        </button>
      </div>

      {/* Dynamic Content Forms */}
      {activeType === "takeaway" && (
        <div className="p-4 bg-[#2A1B12] border border-[#D4AF37]/30 rounded-2xl space-y-3.5 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFDF00] flex items-center gap-1">
              🛍️ Retiro en Local (Take Away)
            </span>
            <span className="text-[9px] font-mono font-bold bg-[#1C120C] px-2 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/30">
              RETIRO #{Math.floor(100 + Math.random() * 900)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Nombre Completo del Cliente *</label>
              <input
                type="text"
                value={takeawayForm.customerName}
                onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, customerName: e.target.value })}
                placeholder="Ej. Juan Pérez"
                className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-bold outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  value={takeawayForm.customerPhone}
                  onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, customerPhone: e.target.value })}
                  placeholder="3584000000"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FFDF00] font-mono font-bold outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Hora Estimada Retiro</label>
                <input
                  type="time"
                  value={takeawayForm.estimatedTime || "20:30"}
                  onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, estimatedTime: e.target.value })}
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-mono font-bold outline-none text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeType === "delivery" && (
        <div className="p-4 bg-[#2A1B12] border border-[#D4AF37]/30 rounded-2xl space-y-3.5 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFDF00] flex items-center gap-1">
              🛵 Delivery / Envío a Domicilio
            </span>
            <span className="text-[9px] font-mono font-bold bg-[#1C120C] px-2 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/30">
              DELIVERY #{Math.floor(200 + Math.random() * 800)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Cliente *</label>
                <input
                  type="text"
                  value={deliveryForm.customerName}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, customerName: e.target.value })}
                  placeholder="Ej. María Gómez"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-bold outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">WhatsApp *</label>
                <input
                  type="text"
                  value={deliveryForm.customerPhone}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, customerPhone: e.target.value })}
                  placeholder="3584555555"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FFDF00] font-mono font-bold outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Calle / Avenida *</label>
                <input
                  type="text"
                  value={deliveryForm.street}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, street: e.target.value })}
                  placeholder="San Martín"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-bold outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Nro *</label>
                <input
                  type="text"
                  value={deliveryForm.number}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, number: e.target.value })}
                  placeholder="123"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-mono font-bold outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Piso / Dpto / Ref</label>
                <input
                  type="text"
                  value={deliveryForm.floorNotes || ""}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, floorNotes: e.target.value })}
                  placeholder="Piso 2 B"
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FDFBF7] font-bold outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#D4AF37] uppercase block mb-1">Costo Cadete ($)</label>
                <input
                  type="number"
                  value={deliveryForm.deliveryFee}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-[#1C120C] border border-[#D4AF37]/30 rounded-xl text-[#FFDF00] font-mono font-bold outline-none text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTypeSelector;
