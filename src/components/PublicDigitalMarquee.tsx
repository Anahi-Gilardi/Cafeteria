import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  ShoppingBag, 
  Utensils, 
  Bike, 
  Coffee, 
  Sparkles, 
  Plus, 
  Minus, 
  Check, 
  PhoneCall, 
  MapPin, 
  Instagram,
  X,
  Send,
  Star
} from "lucide-react";
import { MenuItem } from "../types";
import { MenuPDFService } from "../services/MenuPDFService";
import WhatsAppOrderService from "../services/WhatsAppOrderService";

interface PublicDigitalMarqueeProps {
  menuItems: MenuItem[];
  onShowNotification: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const PublicDigitalMarquee: React.FC<PublicDigitalMarqueeProps> = ({
  menuItems,
  onShowNotification
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<"salon" | "takeaway" | "delivery">("salon");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState("");

  // Featured promo carousel items
  const featuredDishes = menuItems.filter(i => i.isOffer || i.category === "executive" || i.category === "mains").slice(0, 4);

  const filteredItems = menuItems.filter(item => 
    selectedCategory === "all" || item.category === selectedCategory
  );

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { item, qty: 1 }];
    });
    onShowNotification(`✨ ${item.name} agregado al pedido`, "success");
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => 
      prev.map(c => {
        if (c.item.id === id) {
          const newQty = Math.max(0, c.qty + delta);
          return newQty === 0 ? null : { ...c, qty: newQty };
        }
        return c;
      }).filter(Boolean) as { item: MenuItem; qty: number }[]
    );
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const cartTax = cartSubtotal * 0.21;
  const cartTotal = cartSubtotal;

  const handleConfirmPublicOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      onShowNotification("⚠️ Por favor ingrese su Nombre y número de WhatsApp.", "warning");
      return;
    }
    if (cart.length === 0) {
      onShowNotification("⚠️ Su carrito está vacío.", "warning");
      return;
    }
    if (fulfillmentType === "salon" && !tableNumber) {
      onShowNotification("⚠️ Ingrese el número de mesa.", "warning");
      return;
    }

    try {
      const createdOrder = await WhatsAppOrderService.createPublicOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fulfillmentType,
        tableNumber: fulfillmentType === "salon" ? tableNumber.trim() : undefined,
        deliveryAddress: fulfillmentType === "delivery" ? { street: deliveryStreet, number: deliveryNumber } : undefined,
        items: cart.map(c => ({
          name: c.item.name,
          quantity: c.qty,
          customizationSummary: "",
          price: c.item.price
        })),
        subtotal: cartSubtotal,
        tax: cartTax,
        total: cartTotal
      });

      setSubmittedOrderId(createdOrder.id);
      setIsOrderSubmitted(true);
      setIsCheckoutOpen(false);
      setCart([]);
      onShowNotification(`📱 ¡Pedido #${createdOrder.id} enviado con éxito! WhatsApp de confirmación en camino.`, "success");
    } catch (err) {
      console.error(err);
      onShowNotification("❌ Ocurrió un error al enviar el pedido.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0A07] text-[#FDFBF7] font-sans">
      {/* Top Banner Marquee */}
      <div className="bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#FFDF00] text-[#1C120C] py-2 px-4 text-center font-bold text-xs uppercase tracking-widest overflow-hidden shadow-md flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-spin" />
        <span>🎭 RESTO BAR DEL TEATRO • MENÚ EJECUTIVO PROMOCIONAL $8.000 (Lunes a Viernes 12 a 15hs) • CONSTITUCIÓN 944</span>
        <Sparkles className="h-4 w-4 animate-spin" />
      </div>

      {/* Hero Header */}
      <header className="relative bg-[#1A110B] border-b border-[#D4AF37]/30 py-10 px-6 gold-glow">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-2xl">🎭</span>
              <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Experiencia Gastronómica</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-extrabold text-[#FDFBF7] tracking-tight">
              RESTO BAR <span className="text-[#FFDF00]">DEL TEATRO</span>
            </h1>
            <p className="text-xs text-[#FDFBF7]/70 flex items-center justify-center md:justify-start gap-3 pt-1">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#D4AF37]" /> Constitución 944, Río Cuarto</span>
              <span>•</span>
              <span className="flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5 text-[#D4AF37]" /> 358 5042311</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => MenuPDFService.generateMenuPDF(menuItems)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-extrabold shadow-lg transition-all cursor-pointer gold-glow uppercase tracking-wider"
            >
              <FileText className="h-4 w-4" /> Descargar Carta PDF Oficial
            </button>
            <a
              href="https://instagram.com/restobardelteatro_rio4"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
            >
              <Instagram className="h-4 w-4" /> @restobardelteatro_rio4
            </a>
          </div>
        </div>
      </header>

      {/* Featured Items Carousel */}
      <section className="max-w-6xl mx-auto py-8 px-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest block">Selección Especial</span>
            <h2 className="font-serif text-2xl font-bold text-[#FDFBF7]">Especialidades de la Casa</h2>
          </div>
          <span className="text-xs font-bold text-[#FFDF00] bg-[#2A1B12] border border-[#D4AF37]/30 px-3 py-1 rounded-full font-mono">
            ⭐ Menú Ejecutivo $8.000
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredDishes.map((item) => (
            <div key={item.id} className="bg-[#1A110B] border border-[#D4AF37]/25 rounded-3xl overflow-hidden shadow-xl gold-glow flex flex-col justify-between group hover:border-[#D4AF37] transition-all">
              <div className="relative h-44 overflow-hidden bg-[#2A1B12]">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#1C120C]/90 text-[#FFDF00] text-xs font-black font-mono border border-[#D4AF37]/50 shadow-md">
                  ${item.price.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#FDFBF7]">{item.name}</h3>
                  <p className="text-[10px] text-[#FDFBF7]/70 line-clamp-2 leading-relaxed mt-1">{item.description}</p>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4" /> Agregar al Pedido
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Menu Categories & Self-Ordering List */}
      <section className="max-w-6xl mx-auto py-6 px-6 space-y-6">
        <div className="flex border-b border-[#D4AF37]/20 pb-3 gap-3 overflow-x-auto text-xs font-bold">
          {[
            { id: "all", label: "🍽️ Ver Todo" },
            { id: "executive", label: "⭐ Menú Ejecutivo ($8.000)" },
            { id: "coffee", label: "☕ Cafetería" },
            { id: "bakery", label: "🍰 Pastelería" },
            { id: "starters", label: "🥟 Entradas" },
            { id: "mains", label: "🥩 Platos Principales" },
            { id: "drinks", label: "🍸 Bebidas & Vinos" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider ${
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black shadow-md gold-glow"
                  : "bg-[#1A110B] border border-[#D4AF37]/20 text-[#FDFBF7]/70 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 bg-[#1A110B] border border-[#D4AF37]/20 rounded-2xl flex gap-4 items-center justify-between shadow-lg gold-glow">
              <div className="space-y-1 flex-1">
                <strong className="text-sm font-bold text-[#FDFBF7] block">{item.name}</strong>
                <p className="text-[10px] text-[#FDFBF7]/60 leading-tight line-clamp-2">{item.description}</p>
                <span className="text-xs font-black text-[#FFDF00] block font-mono mt-1">${item.price.toLocaleString("es-AR")}</span>
              </div>
              <button
                onClick={() => addToCart(item)}
                className="h-10 w-10 rounded-xl bg-[#2A1B12] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#3D281A] hover:text-white flex items-center justify-center cursor-pointer transition-all shrink-0"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Order Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="bg-gradient-to-r from-[#1A110B] via-[#2A1B12] to-[#1A110B] border border-[#D4AF37] p-4 rounded-3xl shadow-2xl gold-glow flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center font-bold text-[#FFDF00] font-mono">
                {cart.reduce((s, c) => s + c.qty, 0)}
              </div>
              <div>
                <span className="text-[10px] text-[#D4AF37] uppercase font-black block">Tu Pedido Actual</span>
                <strong className="text-sm font-mono text-[#FFDF00]">${cartTotal.toLocaleString("es-AR")}</strong>
              </div>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
            >
              Confirmar por WhatsApp 📱
            </button>
          </div>
        </div>
      )}

      {/* Public Order Confirmation Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A110B] border border-[#D4AF37]/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-xs font-semibold text-[#FDFBF7] space-y-5 gold-glow">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-[#3D281A] text-[#D4AF37]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#D4AF37]/20 pb-3">
              <span className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest block">Resto Bar Del Teatro</span>
              <h3 className="font-serif text-xl font-bold text-[#FFDF00]">Confirmación de Pedido Público</h3>
            </div>

            <form onSubmit={handleConfirmPublicOrder} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block">Modalidad de Consumo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "salon", label: "🍽️ Mesa", icon: Utensils },
                    { id: "takeaway", label: "🛍️ Llevar", icon: ShoppingBag },
                    { id: "delivery", label: "🛵 Delivery", icon: Bike }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFulfillmentType(m.id as any)}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        fulfillmentType === m.id
                          ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] border-[#D4AF37] font-black gold-glow"
                          : "bg-[#2A1B12] border-[#D4AF37]/30 text-[#FDFBF7]/70"
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  placeholder="Ej: Enzo Gilardi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 border border-[#D4AF37]/30 rounded-xl bg-[#2A1B12] text-[#FDFBF7] outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block mb-1">Número de WhatsApp (con código de área) *</label>
                <input
                  type="tel"
                  placeholder="Ej: 3585042311"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 border border-[#D4AF37]/30 rounded-xl bg-[#2A1B12] text-[#FDFBF7] outline-none font-bold font-mono"
                  required
                />
              </div>

              {fulfillmentType === "salon" && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block mb-1">Mesa Número *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mesa 4"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full p-2.5 border border-[#D4AF37]/30 rounded-xl bg-[#2A1B12] text-[#FDFBF7] outline-none font-bold"
                    required
                  />
                </div>
              )}

              {fulfillmentType === "delivery" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block mb-1">Calle</label>
                    <input
                      type="text"
                      placeholder="Ej: Constitución"
                      value={deliveryStreet}
                      onChange={(e) => setDeliveryStreet(e.target.value)}
                      className="w-full p-2 border border-[#D4AF37]/30 rounded-xl bg-[#2A1B12] text-[#FDFBF7]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] block mb-1">Altura</label>
                    <input
                      type="text"
                      placeholder="944"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                      className="w-full p-2 border border-[#D4AF37]/30 rounded-xl bg-[#2A1B12] text-[#FDFBF7]"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#2A1B12] border border-[#D4AF37]/20 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-[10px] text-[#FDFBF7]/70">
                  <span>Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} ítems)</span>
                  <span className="font-mono">${cartSubtotal.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-[#D4AF37]/20 pt-1.5 text-[#FFDF00]">
                  <span>Total Final:</span>
                  <span className="font-mono">${cartTotal.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 gold-glow"
              >
                <Send className="h-4 w-4" /> Enviar Pedido a Cocina & WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isOrderSubmitted && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A110B] border border-[#D4AF37] rounded-3xl p-8 w-full max-w-sm text-center space-y-5 gold-glow">
            <div className="h-16 w-16 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-full flex items-center justify-center mx-auto text-[#FFDF00]">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest block">¡Pedido Ingresado!</span>
              <h3 className="font-serif text-2xl font-bold text-[#FFDF00] mt-1">Pedido #{submittedOrderId}</h3>
              <p className="text-xs text-[#FDFBF7]/70 leading-relaxed mt-2">
                Recibirás un mensaje de WhatsApp cuando el plato o café pase a estado <strong>"LISTO"</strong>.
              </p>
            </div>
            <button
              onClick={() => setIsOrderSubmitted(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black uppercase tracking-wider cursor-pointer"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
