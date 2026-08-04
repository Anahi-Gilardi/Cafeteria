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
    <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-5 shadow-sm space-y-4 text-[#2D0E13]">
      {/* Triple Tab Selector Bar */}
      <div className="grid grid-cols-3 gap-2 bg-[#EBDAC5] p-1.5 rounded-2xl border border-[#CFB5A0]">
        <button
          type="button"
          onClick={() => onChangeType("salon")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "salon"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "text-[#5E393F] hover:text-[#2D0E13]"
          }`}
        >
          <Utensils className="h-3.5 w-3.5" /> Salón
        </button>

        <button
          type="button"
          onClick={() => onChangeType("takeaway")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "takeaway"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "text-[#5E393F] hover:text-[#2D0E13]"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Retiro
        </button>

        <button
          type="button"
          onClick={() => onChangeType("delivery")}
          className={`py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeType === "delivery"
              ? "bg-[#5C1D27] text-white shadow-xs"
              : "text-[#5E393F] hover:text-[#2D0E13]"
          }`}
        >
          <Bike className="h-3.5 w-3.5" /> Delivery
        </button>
      </div>

      {/* Dynamic Content Forms */}
      {activeType === "takeaway" && (
        <div className="p-4 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl space-y-3.5">
          <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5C1D27] flex items-center gap-1">
              Retiro en Local (Take Away)
            </span>
            <span className="text-[9px] font-mono font-bold bg-[#FAF2E6] px-2 py-0.5 rounded text-[#5C1D27] border border-[#CFB5A0]">
              RETIRO #{Math.floor(100 + Math.random() * 900)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Nombre Completo del Cliente *</label>
              <input
                type="text"
                value={takeawayForm.customerName}
                onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, customerName: e.target.value })}
                placeholder="Ej. Juan Pérez"
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Teléfono Móvil (WhatsApp) *</label>
              <input
                type="tel"
                value={takeawayForm.customerPhone}
                onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, customerPhone: e.target.value })}
                placeholder="3584000000"
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Tiempo Estimado de Retiro</label>
              <select
                value={takeawayForm.estimatedTime || "15-20 min"}
                onChange={(e) => onChangeTakeawayForm({ ...takeawayForm, estimatedTime: e.target.value })}
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs"
              >
                <option value="10-15 min">10-15 minutos</option>
                <option value="15-20 min">15-20 minutos (Estándar)</option>
                <option value="25-30 min">25-30 minutos</option>
                <option value="40+ min">40+ minutos</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeType === "delivery" && (
        <div className="p-4 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl space-y-3.5">
          <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5C1D27] flex items-center gap-1">
              Envío a Domicilio (Delivery)
            </span>
            <span className="text-[9px] font-mono font-bold bg-[#FAF2E6] px-2 py-0.5 rounded text-[#5C1D27] border border-[#CFB5A0]">
              TARIFA: ${deliveryForm.deliveryFee.toLocaleString("es-AR")}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Nombre Completo del Cliente *</label>
              <input
                type="text"
                value={deliveryForm.customerName}
                onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, customerName: e.target.value })}
                placeholder="Ej. María González"
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Teléfono Móvil (WhatsApp) *</label>
              <input
                type="tel"
                value={deliveryForm.customerPhone}
                onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, customerPhone: e.target.value })}
                placeholder="3584111222"
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Calle *</label>
                <input
                  type="text"
                  value={deliveryForm.street}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, street: e.target.value })}
                  placeholder="San Martín"
                  className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Altura *</label>
                <input
                  type="text"
                  value={deliveryForm.number}
                  onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, number: e.target.value })}
                  placeholder="450"
                  className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Piso / Dpto / Referencia</label>
              <input
                type="text"
                value={deliveryForm.floorNotes || ""}
                onChange={(e) => onChangeDeliveryForm({ ...deliveryForm, floorNotes: e.target.value })}
                placeholder="Piso 4 Dpto B / Frente a plaza"
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-[#2D0E13] font-bold outline-none text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
