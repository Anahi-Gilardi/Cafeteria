import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  ShoppingBag, 
  Utensils, 
  Bike, 
  Plus, 
  Minus, 
  Check, 
  PhoneCall, 
  MapPin, 
  Instagram,
  X,
  Send,
  ArrowRight
} from "lucide-react";
import { DailyExecutiveMenu, MenuItem } from "../types";
import WhatsAppOrderService from "../services/WhatsAppOrderService";
import { supabase } from "../lib/supabase";
import RestoBarLogo from "./RestoBarLogo";

interface PublicDigitalMarqueeProps {
  menuItems: MenuItem[];
  onShowNotification: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
}

const MenuImage: React.FC<{ src?: string; alt: string; className: string }> = ({
  src,
  alt,
  className
}) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#E7C8CF] to-[#843747]`}>
        <span className="rounded-full bg-[#FFF9F4]/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#843747]">
          Castaño
        </span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

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
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState("");

  // Live Executive Menu state synced with Admin
  const [todayMenu, setTodayMenu] = useState<DailyExecutiveMenu | null>(null);
  const [selectedStarter, setSelectedStarter] = useState("");
  const [selectedMain, setSelectedMain] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [selectedDessert, setSelectedDessert] = useState("");

  React.useEffect(() => {
    const loadTodayMenu = async () => {
      const days: DailyExecutiveMenu["dayOfWeek"][] = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado"
      ];
      const dayOfWeek = days[new Date().getDay()];
      const { data, error } = await supabase
        .from("daily_menu")
        .select("*")
        .eq("day_of_week", dayOfWeek)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo cargar el menú diario desde Supabase:", error.message);
        return;
      }

      if (!data) {
        setTodayMenu(null);
        setSelectedStarter("");
        setSelectedMain("");
        setSelectedDrink("");
        setSelectedDessert("");
        return;
      }

      const updated: DailyExecutiveMenu = {
        dayOfWeek: data.day_of_week,
        title: data.title,
        description: data.description || "",
        price: Number(data.price),
        image: data.image || undefined,
        starters: data.starters || [],
        mains: data.mains || [],
        drinks: data.drinks || [],
        desserts: data.desserts || [],
        active: data.active
      };
      setTodayMenu(updated);
      setSelectedStarter(updated.starters[0] || "");
      setSelectedMain(updated.mains[0] || "");
      setSelectedDrink(updated.drinks[0] || "");
      setSelectedDessert(updated.desserts[0] || "");
    };
    const handleUpdate = () => void loadTodayMenu();
    void loadTodayMenu();
    window.addEventListener("daily_menus_updated", handleUpdate);
    return () => {
      window.removeEventListener("daily_menus_updated", handleUpdate);
    };
  }, []);

  const addExecutiveComboToCart = () => {
    if (!todayMenu) return;
    const comboItem: MenuItem = {
      id: "executive-combo-" + Date.now(),
      name: `⭐ Menú Ejecutivo (${todayMenu.dayOfWeek})`,
      price: todayMenu.price,
      description: `Entrada: ${selectedStarter} | Principal: ${selectedMain} | Bebida: ${selectedDrink} | Postre: ${selectedDessert}`,
      category: "executive",
      tags: ["Menú del Día", "Combo"],
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
      customizable: false,
      nutrition: { calories: 850, allergens: [] }
    };
    addToCart(comboItem);
  };

  // Keep the public showcase connected to the current catalog and real prices.
  const featuredDishes = [...menuItems]
    .filter((item) => item.price > 0)
    .sort((a, b) => {
      const aPriority = Number(Boolean(a.isOffer)) * 2 + Number(a.category === "executive");
      const bPriority = Number(Boolean(b.isOffer)) * 2 + Number(b.category === "executive");
      return bPriority - aPriority;
    })
    .slice(0, 4);

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
          itemId: c.item.id,
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
      const cleanPhone = customerPhone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("54") ? cleanPhone : `54${cleanPhone}`;
      const confirmationText = `Hola, mi pedido ${createdOrder.id} quedó registrado en Resto Bar Del Teatro por ${createdOrder.total.toLocaleString("es-AR")} ARS.`;
      setSubmittedWhatsAppUrl(
        `https://wa.me/${formattedPhone}?text=${encodeURIComponent(confirmationText)}`
      );
      setIsOrderSubmitted(true);
      setIsCheckoutOpen(false);
      setCart([]);
      onShowNotification(`Pedido #${createdOrder.id} guardado y enviado a cocina.`, "success");
    } catch (err) {
      console.error(err);
      onShowNotification("❌ Ocurrió un error al enviar el pedido.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3E7DB] text-[#332424] font-sans pb-28">
      {/* Top Banner Marquee */}
      <div className="border-b border-white/10 bg-[#71303D] px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white sm:text-xs">
        📖 Carta Digital Informativa · Constitución 944 · Su mozo tomará el pedido en su mesa
      </div>

      {/* Hero Header */}
      <header className="relative border-b border-[#D7BBA8] bg-[#FFF9F4] px-6 pb-8 pt-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-7 md:flex-row">
          <div className="space-y-3 text-center md:text-left">
            <RestoBarLogo size="lg" className="justify-center md:justify-start" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#843747]">Carta digital informativa</span>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-[#332424] md:text-5xl">
                Conocé nuestra gastronomía.
              </h1>
            </div>
            <p className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-[#6F5A55] md:justify-start">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#843747]" /> Constitución 944, Río Cuarto</span>
              <span className="flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5 text-[#843747]" /> 358 5042311</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                onShowNotification("📄 Generando Carta PDF con Fotos y Código QR...", "info");
                const { MenuPDFService } = await import("../services/MenuPDFService");
                await MenuPDFService.generateMenuPDF(menuItems);
                onShowNotification("✅ Carta oficial descargada correctamente.", "success");
              }}
              className="flex items-center gap-2 rounded-full border border-[#843747]/25 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[#843747] transition-colors hover:bg-[#E7C8CF]/40 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-[#843747]" /> Descargar Carta PDF
            </button>
            <a
              href="https://instagram.com/restobardelteatro_rio4"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#843747] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#71303D]"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          </div>
        </div>

        {/* Read-Only Safety Notice Banner */}
        <div className="mx-auto max-w-6xl mt-6 p-3.5 bg-[#E8D4C3]/40 border border-[#D7BBA8] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#332424]">
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">📖</span>
            <p className="text-[11px] font-semibold text-[#6F5A55]">
              <strong className="text-[#843747]">Carta en Modo Lectura:</strong> Esta pantalla es de consulta visual de platos, fotos y precios. Su mozo registrará su pedido en la mesa para garantizar la precisión de la comanda en cocina.
            </p>
          </div>
        </div>
      </header>

      {/* Featured Items Carousel */}
      <section className="max-w-6xl mx-auto py-8 px-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#D7BBA8] pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#843747] tracking-widest block">Recomendaciones</span>
            <h2 className="font-serif text-2xl font-bold text-[#332424]">Destacados de la Carta</h2>
          </div>
          {todayMenu && (
            <span className="text-xs font-black text-[#843747] bg-[#E7C8CF] border border-[#D1AD95] px-3.5 py-1.5 rounded-full font-mono shadow-xs">
              ⭐ Menú del Día ${todayMenu.price.toLocaleString("es-AR")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredDishes.map((item) => (
            <div key={item.id} className="bg-white border-2 border-[#D7BBA8] rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-[#843747] hover:shadow-xl transition-all">
              <div className="relative h-44 overflow-hidden bg-[#F3E7DB]">
                <MenuImage src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 text-[#843747] text-xs font-black font-mono border border-[#843747] shadow-md">
                  ${item.price.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#332424]">{item.name}</h3>
                  <p className="text-xs text-[#6F5A55] line-clamp-2 leading-relaxed mt-1">{item.description}</p>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[#843747] hover:bg-[#71303D] text-white text-xs font-black shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
        <div className="flex border-b border-[#D7BBA8] pb-3 gap-3 overflow-x-auto text-xs font-bold">
          {[
            { id: "all", label: "🍽️ Ver Todo" },
            { id: "executive", label: "⭐ Menú Diario" },
            { id: "desayunos_meriendas", label: "☕ Desayunos, Almuerzos & Meriendas" },
            { id: "pizzas_focaccias", label: "🍕 Pizzas & Focaccias" },
            { id: "minutas_carnes", label: "🥩 Minutas & Carnes" },
            { id: "pastas_caseras", label: "🍝 Pastas Caseras" },
            { id: "empanadas", label: "🥟 Empanadas" },
            { id: "bebidas_sa", label: "🥤 Bebidas S/A" },
            { id: "bebidas_alcohol", label: "🍸 Bebidas c/Alcohol" },
            { id: "postres", label: "🍰 Postres" }
          ].filter((cat) => cat.id !== "executive" || todayMenu).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider ${
                selectedCategory === cat.id
                  ? "bg-[#843747] text-white font-black shadow-md"
                  : "bg-[#FFF9F4] border border-[#D7BBA8] text-[#332424] hover:bg-[#E8D4C3]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Executive Menu Live Combo Builder Box */}
        {todayMenu && (selectedCategory === "all" || selectedCategory === "executive") && (
          <div className="bg-white border-2 border-[#843747] rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D7BBA8] pb-4">
              <div className="flex items-center gap-4">
                {todayMenu.image && (
                  <MenuImage
                    src={todayMenu.image}
                    alt={todayMenu.title}
                    className="h-20 w-24 rounded-2xl object-cover border-2 border-[#843747] shadow-md shrink-0"
                  />
                )}
                <div>
                  <span className="text-[10px] font-black uppercase text-[#843747] tracking-widest block">⭐ Plato Único del Día</span>
                  <h3 className="font-serif text-2xl font-bold text-[#332424]">{todayMenu.title} ({todayMenu.dayOfWeek})</h3>
                  <p className="text-xs text-[#6F5A55] italic mt-0.5 font-medium">"{todayMenu.description}"</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-[#6F5A55] block font-bold">Precio del Plato ($ ARS)</span>
                <span className="text-3xl font-black font-mono text-[#843747]">${todayMenu.price.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Starters Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">1. Entrada</label>
                <select
                  value={selectedStarter}
                  onChange={(e) => setSelectedStarter(e.target.value)}
                  className="w-full p-2.5 bg-[#F3E7DB] border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none"
                >
                  {todayMenu.starters.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Mains Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">2. Plato Principal</label>
                <select
                  value={selectedMain}
                  onChange={(e) => setSelectedMain(e.target.value)}
                  className="w-full p-2.5 bg-[#F3E7DB] border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none"
                >
                  {todayMenu.mains.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Drinks Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">3. Bebida</label>
                <select
                  value={selectedDrink}
                  onChange={(e) => setSelectedDrink(e.target.value)}
                  className="w-full p-2.5 bg-[#F3E7DB] border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none"
                >
                  {todayMenu.drinks.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Desserts Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">4. Postre / Café</label>
                <select
                  value={selectedDessert}
                  onChange={(e) => setSelectedDessert(e.target.value)}
                  className="w-full p-2.5 bg-[#F3E7DB] border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none"
                >
                  {todayMenu.desserts.map((ds) => (
                    <option key={ds} value={ds}>{ds}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={addExecutiveComboToCart}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#843747] to-[#843747] text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Agregar Combo Menú Ejecutivo al Pedido (${todayMenu.price.toLocaleString("es-AR")})
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 bg-white border border-[#D7BBA8] rounded-2xl flex gap-4 items-center justify-between shadow-sm hover:shadow-md hover:border-[#843747] transition-all">
              <div className="space-y-1 flex-1">
                <strong className="text-sm font-bold text-[#332424] block">{item.name}</strong>
                <p className="text-xs text-[#6F5A55] leading-tight line-clamp-2">{item.description}</p>
                <span className="text-sm font-black text-[#843747] block font-mono mt-1">${item.price.toLocaleString("es-AR")}</span>
              </div>
              <span className="px-3 py-1.5 bg-[#E8D4C3]/60 border border-[#D7BBA8] rounded-xl text-[10px] font-bold text-[#843747] uppercase tracking-wider shrink-0">
                Pedir al mozo
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Order Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="bg-white border-2 border-[#843747] p-4 rounded-3xl shadow-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#E7C8CF] border border-[#843747] flex items-center justify-center font-bold text-[#843747] font-mono">
                {cart.reduce((s, c) => s + c.qty, 0)}
              </div>
              <div>
                <span className="text-[10px] text-[#6F5A55] uppercase font-black block">Tu Pedido Actual</span>
                <strong className="text-base font-mono text-[#843747] font-black">${cartTotal.toLocaleString("es-AR")}</strong>
              </div>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#843747] px-5 py-3 text-white font-black uppercase tracking-wider shadow-lg hover:bg-[#71303D] cursor-pointer"
            >
              Revisar pedido <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Public Order Confirmation Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#843747] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-xs font-semibold text-[#332424] space-y-5">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#D7BBA8] pb-3">
              <span className="text-[9px] font-black uppercase text-[#843747] tracking-widest block">Resto Bar Del Teatro</span>
              <h3 className="font-serif text-xl font-bold text-[#332424]">Confirmar pedido</h3>
            </div>

            <form onSubmit={handleConfirmPublicOrder} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block">Modalidad de Consumo</label>
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
                          ? "bg-gradient-to-r from-[#843747] to-[#843747] text-white border-[#843747] font-black shadow-md"
                          : "bg-[#F3E7DB] border-[#D7BBA8] text-[#6F5A55]"
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  placeholder="Ej: Enzo Gilardi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 border border-[#D7BBA8] rounded-xl bg-[#F3E7DB] text-[#332424] outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block mb-1">Número de WhatsApp (con código de área) *</label>
                <input
                  type="tel"
                  placeholder="Ej: 3585042311"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 border border-[#D7BBA8] rounded-xl bg-[#F3E7DB] text-[#332424] outline-none font-bold font-mono"
                  required
                />
              </div>

              {fulfillmentType === "salon" && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block mb-1">Mesa Número *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mesa 4"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full p-2.5 border border-[#D7BBA8] rounded-xl bg-[#F3E7DB] text-[#332424] outline-none font-bold"
                    required
                  />
                </div>
              )}

              {fulfillmentType === "delivery" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block mb-1">Calle</label>
                    <input
                      type="text"
                      placeholder="Ej: Constitución"
                      value={deliveryStreet}
                      onChange={(e) => setDeliveryStreet(e.target.value)}
                      className="w-full p-2 border border-[#D7BBA8] rounded-xl bg-[#F3E7DB] text-[#332424]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#6F5A55] block mb-1">Altura</label>
                    <input
                      type="text"
                      placeholder="944"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                      className="w-full p-2 border border-[#D7BBA8] rounded-xl bg-[#F3E7DB] text-[#332424]"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#F3E7DB] border border-[#D7BBA8] rounded-2xl space-y-1.5">
                <div className="flex justify-between text-xs text-[#6F5A55]">
                  <span>Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} ítems)</span>
                  <span className="font-mono font-bold">${cartSubtotal.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-[#D7BBA8] pt-1.5 text-[#843747]">
                  <span>Total Final:</span>
                  <span className="font-mono">${cartTotal.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#843747] to-[#843747] text-white font-black uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" /> Guardar y enviar a cocina
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isOrderSubmitted && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#843747] rounded-3xl p-8 w-full max-w-sm text-center space-y-5 shadow-2xl">
            <div className="h-16 w-16 bg-[#E7C8CF] border border-[#843747] rounded-full flex items-center justify-center mx-auto text-[#843747]">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#843747] uppercase tracking-widest block">¡Pedido Ingresado!</span>
              <h3 className="font-serif text-2xl font-bold text-[#332424] mt-1">Pedido #{submittedOrderId}</h3>
              <p className="text-xs text-[#6F5A55] leading-relaxed mt-2">
                La comanda quedó guardada en el sistema y ya está visible para el equipo de cocina.
              </p>
            </div>
            {submittedWhatsAppUrl && (
              <a
                href={submittedWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#843747] bg-[#FFF9F4] py-3 text-[10px] font-black uppercase tracking-wider text-[#843747]"
              >
                Abrir comprobante en WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => setIsOrderSubmitted(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#843747] to-[#843747] text-white font-black uppercase tracking-wider cursor-pointer"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
