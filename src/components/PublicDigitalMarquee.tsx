import React, { useState, useMemo } from "react";
import { 
  FileText, 
  PhoneCall, 
  MapPin, 
  Instagram
} from "lucide-react";
import { DailyExecutiveMenu, MenuItem } from "../types";
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

  // Live Executive Menu state synced with Admin
  const [todayMenu, setTodayMenu] = useState<DailyExecutiveMenu | null>(null);
  const [selectedStarter, setSelectedStarter] = useState("");
  const [selectedMain, setSelectedMain] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [selectedDessert, setSelectedDessert] = useState("");

  const [dailyComboState, setDailyComboState] = useState<{
    mains: string[];
    sides: string[];
    price: number;
  }>(() => {
    try {
      const saved = localStorage.getItem("puglia_daily_combo");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      mains: [
        "Pollo al horno",
        "Pasta ( tallarines, ñoquis, canelones )",
        "Milanesa de pollo o ternera",
        "Hamburguesa"
      ],
      sides: [
        "Puré de papa o mixto",
        "Arroz con crema",
        "Ensalada mixta"
      ],
      price: 8500
    };
  });  const [cartOrder, setCartOrder] = useState<Record<string, { item: MenuItem; quantity: number }>>({});

  const handleAddToCart = (item: MenuItem) => {
    setCartOrder((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return { ...prev, [item.id]: { item, quantity: newQty } };
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartOrder((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const handleSendFullOrderToWhatsApp = () => {
    const entries = Object.values(cartOrder);
    if (entries.length === 0) return;

    const itemsList = entries
      .map(e => `• ${e.quantity}x *${e.item.name}* ($${(e.item.price * e.quantity).toLocaleString("es-AR")})`)
      .join("\n");

    const total = entries.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

    const msg = `¡Hola! Quisiera realizar el siguiente pedido:\n\n${itemsList}\n\n*TOTAL A PAGAR: $${total.toLocaleString("es-AR")}*\n\n¡Muchas gracias!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  React.useEffect(() => {
    const loadTodayMenu = async () => {
      try {
        const { data: comboSys } = await supabase.from("system_settings").select("*").eq("key", "daily_combo").maybeSingle();
        if (comboSys && comboSys.value) {
          const parsed = typeof comboSys.value === "string" ? JSON.parse(comboSys.value) : comboSys.value;
          setDailyComboState(parsed);
          try { localStorage.setItem("puglia_daily_combo", JSON.stringify(parsed)); } catch (e) {}
        }
      } catch (e) {}
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

      if (error || !data) {
        try {
          const saved = localStorage.getItem("puglia_weekly_menus");
          if (saved) {
            const list: DailyExecutiveMenu[] = JSON.parse(saved);
            const found = list.find(m => m.dayOfWeek === dayOfWeek && m.active);
            if (found) {
              setTodayMenu(found);
              setSelectedStarter(found.starters[0] || "");
              setSelectedMain(found.mains[0] || "");
              setSelectedDrink(found.drinks[0] || "");
              setSelectedDessert(found.desserts[0] || "");
              return;
            }
          }
        } catch (e) {}
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
        starters: Array.isArray(data.starters) && data.starters.length > 0 ? data.starters : ["Ensalada Mixta de la Casa", "Sopa Casera de Verduras"],
        mains: Array.isArray(data.mains) && data.mains.length > 0 ? data.mains : [data.title || "Tallarines caseros"],
        drinks: Array.isArray(data.drinks) && data.drinks.length > 0 ? data.drinks : ["Copa de Vino Malbec", "Limonada de la Casa", "Agua Mineral / Gaseosa 500ml"],
        desserts: Array.isArray(data.desserts) && data.desserts.length > 0 ? data.desserts : ["Flan Casero con Dulce de Leche", "Helado Artesanal (2 bochas)", "Café Espresso o Cortado"],
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

  const totalCartCount = useMemo(() => {
    return Object.values(cartOrder).reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartOrder]);

  const totalCartAmount = useMemo(() => {
    return Object.values(cartOrder).reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
  }, [cartOrder]);

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
                try {
                  onShowNotification("📄 Generando Carta PDF con Fotos y Código QR...", "info");
                  const { MenuPDFService } = await import("../services/MenuPDFService");
                  await MenuPDFService.generateMenuPDF(menuItems);
                  onShowNotification("✅ Carta oficial descargada correctamente.", "success");
                } catch (error) {
                  console.error("Error generating menu PDF:", error);
                  onShowNotification("⚠️ No hay una carta sincronizada disponible para descargar.", "warning");
                }
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
            <span className="text-base shrink-0">💡</span>
            <p className="text-[11px] font-semibold text-[#6F5A55]">
              <strong className="text-[#843747]">Menú Interactivo & Pedidos:</strong> Seleccione sus platos, bebidas y postres preferidos presionando <span className="text-[#843747] font-black">+ AGREGAR AL PEDIDO</span>. Luego podrá enviar su comanda completa por WhatsApp con un solo clic.
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
                {cartOrder[item.id] ? (
                  <div className="mt-3 flex items-center justify-between bg-[#E8D4C3] border border-[#843747] rounded-xl p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="h-7 w-7 rounded-lg bg-[#843747] text-white font-black text-sm flex items-center justify-center cursor-pointer hover:bg-[#71303D]"
                    >
                      -
                    </button>
                    <span className="text-xs font-black font-mono text-[#843747]">{cartOrder[item.id].quantity} en pedido</span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="h-7 w-7 rounded-lg bg-[#843747] text-white font-black text-sm flex items-center justify-center cursor-pointer hover:bg-[#71303D]"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="w-full mt-3 py-2 rounded-xl bg-[#843747] hover:bg-[#71303D] text-white text-[10px] font-black uppercase tracking-wider text-center block shadow-xs transition-all cursor-pointer"
                  >
                    + Agregar al pedido
                  </button>
                )}
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
            { id: "menu_diario", label: "⭐ Menú del Día" },
            { id: "executive", label: "🍱 Menú Diario" },
            { id: "desayunos_meriendas", label: "☕ Desayunos, Almuerzos & Meriendas" },
            { id: "pizzas_focaccias", label: "🍕 Pizzas & Focaccias" },
            { id: "minutas_carnes", label: "🥩 Minutas & Carnes" },
            { id: "pastas_caseras", label: "🍝 Pastas Caseras" },
            { id: "empanadas", label: "🥟 Empanadas" },
            { id: "bebidas_sa", label: "🥤 Bebidas S/A" },
            { id: "bebidas_alcohol", label: "🍸 Bebidas c/Alcohol" },
            { id: "postres", label: "🍰 Postres" }
          ].filter((cat) => (cat.id !== "executive" && cat.id !== "menu_diario") || todayMenu).map((cat) => (
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

        {/* ⭐ Menú del Día (Plato Único Semanal) Card */}
        {todayMenu && (selectedCategory === "all" || selectedCategory === "menu_diario") && (
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
                  <span className="text-[10px] font-black uppercase text-[#843747] tracking-widest block">⭐ Plato Único del Día ({todayMenu.dayOfWeek})</span>
                  <h3 className="font-serif text-2xl font-bold text-[#332424]">{todayMenu.title}</h3>
                  <p className="text-xs text-[#6F5A55] italic mt-0.5 font-medium">"{todayMenu.description}"</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-[#6F5A55] block font-bold">Precio ($ ARS)</span>
                <span className="text-3xl font-black font-mono text-[#843747]">${todayMenu.price.toLocaleString("es-AR")}</span>
              </div>
            </div>

            {/* Botón directo de Pedido por WhatsApp (Tamaño compacto) */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const msg = `¡Hola! Quisiera realizar un pedido del *Plato del Día (${todayMenu.dayOfWeek})*:\n\n*${todayMenu.title}*\n"${todayMenu.description}"\n*Precio: $${todayMenu.price.toLocaleString("es-AR")}*`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="py-2.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20bd59] text-white font-bold text-[11px] uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Pedir plato del día por WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* 🍱 Menú Diario (4 Platos + 3 Guarniciones) Card */}
        {(selectedCategory === "all" || selectedCategory === "executive") && (
          <div className="bg-[#FFF9F4] border-2 border-[#843747] rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D7BBA8] pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#843747] tracking-widest block">🍱 Combo Menú Diario</span>
                <h3 className="font-serif text-2xl font-bold text-[#332424]">Menú Diario (4 Platos + 3 Guarniciones)</h3>
                <p className="text-xs text-[#6F5A55] italic mt-0.5 font-medium">Elija 1 Plato Principal + 1 Guarnición de su preferencia.</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-[#6F5A55] block font-bold">Precio Combo ($ ARS)</span>
                <span className="text-3xl font-black font-mono text-[#843747]">${dailyComboState.price.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Plato Principal (4 Opciones) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">1. Seleccione 1 Plato Principal (de 4 opciones)</label>
                <select
                  value={selectedMain}
                  onChange={(e) => setSelectedMain(e.target.value)}
                  className="w-full p-3 bg-white border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none focus:border-[#843747]"
                >
                  {(dailyComboState.mains && dailyComboState.mains.length > 0
                    ? dailyComboState.mains
                    : ["Pollo al horno", "Pasta ( tallarines, ñoquis, canelones )", "Milanesa de pollo o ternera", "Hamburguesa"]
                  ).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 2. Guarnición (3 Opciones) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#843747] block">2. Seleccione 1 Guarnición (de 3 opciones)</label>
                <select
                  value={selectedStarter}
                  onChange={(e) => setSelectedStarter(e.target.value)}
                  className="w-full p-3 bg-white border border-[#D7BBA8] rounded-xl text-xs font-bold text-[#332424] outline-none focus:border-[#843747]"
                >
                  {(dailyComboState.sides && dailyComboState.sides.length > 0
                    ? dailyComboState.sides
                    : ["Puré de papa o mixto", "Arroz con crema", "Ensalada mixta"]
                  ).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón Pedir Menú Diario por WhatsApp (Tamaño compacto) */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const mainChoice = selectedMain || dailyComboState.mains[0] || "Pollo al horno";
                  const sideChoice = selectedStarter || dailyComboState.sides[0] || "Puré de papa o mixto";
                  const msg = `¡Hola! Quisiera pedir el *Menú Diario*:\n\n• *Plato Principal:* ${mainChoice}\n• *Guarnición:* ${sideChoice}\n\n*Precio Combo: $${dailyComboState.price.toLocaleString("es-AR")}*`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="py-2.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20bd59] text-white font-bold text-[11px] uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Pedir menú diario por WhatsApp
              </button>
            </div>
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
              {cartOrder[item.id] ? (
                <div className="flex items-center gap-1.5 bg-[#E8D4C3] border border-[#843747] rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="h-6 w-6 rounded-lg bg-[#843747] text-white font-black text-xs flex items-center justify-center cursor-pointer hover:bg-[#71303D]"
                  >
                    -
                  </button>
                  <span className="text-xs font-black font-mono text-[#843747] px-1">{cartOrder[item.id].quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="h-6 w-6 rounded-lg bg-[#843747] text-white font-black text-xs flex items-center justify-center cursor-pointer hover:bg-[#71303D]"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddToCart(item)}
                  className="px-3.5 py-2 bg-[#843747] hover:bg-[#71303D] text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all shadow-xs cursor-pointer"
                >
                  + Agregar al pedido
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sticky Floating WhatsApp Order Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-xl z-50 bg-[#332424] text-white border-2 border-[#843747] rounded-3xl p-4 shadow-2xl backdrop-blur-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#843747] text-white shrink-0 font-black shadow-md text-sm font-mono">
              🛒 {totalCartCount}
            </div>
            <div>
              <strong className="block text-xs uppercase tracking-wider text-[#E8D4C3]">Tu Pedido en Progreso</strong>
              <span className="text-sm font-black font-mono text-white">
                Total: ${totalCartAmount.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setCartOrder({})}
              className="px-3 py-2 rounded-xl text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider cursor-pointer"
            >
              Vaciar
            </button>

            <button
              type="button"
              onClick={handleSendFullOrderToWhatsApp}
              className="py-2.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20bd59] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              ENVIAR PEDIDO POR WHATSAPP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
