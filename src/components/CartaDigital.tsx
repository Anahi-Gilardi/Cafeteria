import { useState } from "react";
import { MenuItem, Table } from "../types";
import { MENU_ITEMS, TABLES_DATA } from "../data/menu";
import { Smartphone, QrCode, Bell, Sparkles, Coffee, Heart, Info, ArrowLeftRight, Check, HeartCrack, HelpCircle, Utensils } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CartaDigitalProps {
  onAddToBag: (item: MenuItem, customization: any) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

export default function CartaDigital({ onAddToBag, onShowNotification }: CartaDigitalProps) {
  const [selectedTable, setSelectedTable] = useState<string>("mesa-1");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Find the selected table details
  const tableDetails = TABLES_DATA.find(t => t.id === selectedTable);

  // Filter items
  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !activeFilter || item.tags.includes(activeFilter);
    return matchesCategory && matchesSearch && matchesTag;
  });

  const handleCallWaiter = (action: string) => {
    const tableName = tableDetails?.name || "Mesa";
    if (action === "mozo") {
      onShowNotification(`🔔 El Mozo ha sido notificado y se dirige a la ${tableName}.`, "info");
    } else if (action === "cuenta") {
      onShowNotification(`💵 Solicitud de Cuenta enviada para la ${tableName}. El mozo traerá la terminal de cobro.`, "success");
    } else {
      onShowNotification(`☕ Solicitaste retirar tazas o servicio para la ${tableName}.`, "info");
    }
  };

  const categories = [
    { id: "all", label: "Todo", emoji: "🍽️" },
    { id: "coffee", label: "Especialidades", emoji: "✨" },
    { id: "traditional", label: "Clásicos", emoji: "☕" },
    { id: "cold", label: "Fríos", emoji: "❄️" },
    { id: "bakery", label: "Tortas y Facturas", emoji: "🥐" },
    { id: "brunch", label: "Salados", emoji: "🥪" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header and Hero explaining the Carta Digital */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-espresso text-paper shadow-md">
          <Smartphone className="h-7 w-7 text-caramel" />
        </div>
        <p className="mx-auto mt-2 max-w-xl text-espresso/70 text-sm leading-relaxed italic font-medium">
          El servicio de siempre en su celular. Escanee, realice su pedido desde la mesa y llame al mozo sin esperas. ¡Viva la experiencia Puglia!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: QR and Table Configuration Simulator */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-coffee bg-white p-6 shadow-md text-center">
            <h3 className="font-serif text-lg font-bold text-espresso flex items-center justify-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-caramel" />
              Simulador QR de Mesa
            </h3>
            
            <div className="mx-auto bg-paper p-4 rounded-2xl inline-block border border-coffee/30 mb-4">
              {/* Fake QR code drawing */}
              <div className="w-36 h-36 bg-stone-900 rounded-lg p-2 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-4 border-white"></div>
                  <div className="w-8 h-8 border-4 border-white"></div>
                </div>
                {/* Center logo */}
                <div className="absolute inset-0 m-auto w-10 h-10 bg-caramel rounded-full flex items-center justify-center text-white text-[10px] font-serif font-bold border-2 border-stone-900">
                  CST
                </div>
                {/* Dots simulation */}
                <div className="flex flex-col gap-1 px-1">
                  <div className="flex justify-between gap-1">
                    <div className="h-2 bg-white/40 flex-1"></div>
                    <div className="h-2 bg-white/40 flex-1"></div>
                    <div className="h-2 bg-white flex-1"></div>
                  </div>
                  <div className="flex justify-between gap-1">
                    <div className="h-2 bg-white flex-1"></div>
                    <div className="h-2 bg-white/10 flex-1"></div>
                    <div className="h-2 bg-white/60 flex-1"></div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-4 border-white"></div>
                  <div className="w-3 h-3 bg-white self-end"></div>
                </div>
              </div>
            </div>

            <p className="text-xs text-espresso/70 leading-normal mb-5 italic">
              Cada mesa en nuestra cafetería de Café Puglia tiene un QR único. Seleccione su mesa abajo para simular que está sentado allí:
            </p>

            <div className="space-y-3 text-left">
              <label className="text-xs font-extrabold text-espresso/60 uppercase tracking-widest block">Está sentado en:</label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  onShowNotification(`📍 Ha cambiado su ubicación a la ${TABLES_DATA.find(t => t.id === e.target.value)?.name}`, "info");
                }}
                className="w-full rounded-xl border border-coffee bg-paper px-4 py-3 text-sm font-semibold text-espresso focus:outline-hidden focus:ring-1 focus:ring-caramel"
              >
                {TABLES_DATA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Cap. {t.capacity} p)
                  </option>
                ))}
              </select>
              
              {tableDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-caramel/5 border border-caramel/10 text-xs">
                  <p className="font-bold text-espresso">{tableDetails.name}</p>
                  <p className="text-espresso/70 mt-1 italic leading-normal">{tableDetails.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Waiter Services (Only accessible from Carta Digital) */}
          <div className="rounded-3xl border border-coffee bg-espresso p-6 shadow-md text-white">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-caramel mb-1.5">
              <Bell className="h-5 w-5 animate-bounce" />
              Botones del Mozo
            </h3>
            <p className="text-[11px] text-paper/70 mb-4 leading-relaxed">
              Servicios interactivos inmediatos para su mesa. Toque para enviar una alerta instantánea a la cocina y caja.
            </p>

            <div className="space-y-2.5">
              <button
                id="digital-call-waiter"
                onClick={() => handleCallWaiter("mozo")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-caramel hover:text-white text-paper transition-all text-xs font-bold cursor-pointer"
              >
                <span>🙋‍♂️ Llamar al Mozo</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[9px]">Urgente</span>
              </button>

              <button
                id="digital-request-bill"
                onClick={() => handleCallWaiter("cuenta")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-emerald-700 text-paper transition-all text-xs font-bold cursor-pointer"
              >
                <span>💵 Pedir la Cuenta (Caja)</span>
                <span className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded text-[9px]">Tarjeta/Efectivo</span>
              </button>

              <button
                id="digital-request-service"
                onClick={() => handleCallWaiter("retirar")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 text-paper/90 transition-all text-xs font-bold cursor-pointer"
              >
                <span>🧼 Limpiar Mesa / Traer Vasos</span>
                <span className="text-[13px]">☕</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Mobile Phone Screen Simulation displaying the Menu */}
        <div className="lg:col-span-8">
          <div className="relative mx-auto max-w-md rounded-[40px] border-[10px] border-espresso bg-white shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
            {/* Phone Top Notch Speaker & Camera Sim */}
            <div className="absolute top-0 inset-x-0 h-6 bg-espresso flex justify-center items-center z-30">
              <div className="w-24 h-3 bg-stone-900 rounded-full"></div>
            </div>

            {/* Simulated App Header inside Phone */}
            <div className="bg-espresso text-white pt-9 pb-5 px-5 text-center relative z-20 border-b border-coffee">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono tracking-wider text-caramel">PUGLIA DIGITAL</span>
                <span className="text-[9px] bg-emerald-600 px-2 py-0.5 rounded-full text-white font-bold animate-pulse">
                  CONEXIÓN MESA
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold tracking-tight italic">Café Puglia</h2>
              <p className="text-[10px] text-paper/60 mt-1">
                Atendido con calidez • Sentado en: <strong className="text-caramel">{tableDetails?.name}</strong>
              </p>
            </div>

            {/* Quick Categories Bar */}
            <div className="bg-paper border-b border-coffee/30 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none z-10">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? "bg-espresso text-paper shadow-xs"
                      : "bg-white border border-coffee/30 text-espresso/70 hover:bg-paper"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Phone Screen Body Content */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
              {/* Simple Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar medialunas, chocotorta, tostado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-xl border border-coffee bg-paper px-3 py-2.5 text-espresso placeholder-espresso/40 focus:outline-hidden"
                />
              </div>

              {/* Tag Quick Filters */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
                {["Recomendado", "Especial", "Artesanal", "OFERTA", "Vegano", "Sin Gluten"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(activeFilter === tag ? "" : tag)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      activeFilter === tag
                        ? "bg-caramel text-white"
                        : "bg-espresso/5 text-espresso/70 border border-coffee/10 hover:bg-espresso/10"
                    }`}
                  >
                    {tag === "OFERTA" ? "🔥 Ofertas" : tag}
                  </button>
                ))}
              </div>

              {/* Offers banner if looking at all or specific categories */}
              {selectedCategory === "all" && !activeFilter && !searchQuery && (
                <div className="mb-6 rounded-2xl bg-gradient-to-br from-espresso to-stone-900 border border-caramel/40 p-4 text-white relative overflow-hidden shadow-md">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-15 rotate-12 text-7xl">
                    🥐
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-caramel bg-caramel/20 px-2 py-0.5 rounded border border-caramel/30 inline-block mb-1.5">
                    Oferta del Día
                  </span>
                  <h4 className="font-serif text-sm font-extrabold text-paper">¡El Desayuno de los Campeones!</h4>
                  <p className="text-[10px] text-paper/80 mt-1 italic">
                    Pida un Café con Leche con 3 Medialunas de manteca calentitas por solo <strong className="text-caramel">$5.20</strong>.
                  </p>
                  <button
                    onClick={() => {
                      const promo = MENU_ITEMS.find(m => m.id === "offer-promo-portena");
                      if (promo) {
                        onAddToBag(promo, { size: "M", milk: "Regular", sweetness: "100%" });
                        onShowNotification("☕ ¡Combo Desayuno añadido a su mesa!", "success");
                      }
                    }}
                    className="mt-3 rounded-full bg-caramel hover:bg-white hover:text-espresso text-white text-[10px] font-bold px-3 py-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    Ordenar Oferta
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-bold text-espresso/50">No encontramos delicias así hoy.</p>
                    <p className="text-xs text-espresso/40 mt-1">Intente cambiar los filtros o la búsqueda.</p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const hasPromo = item.isOffer && item.offerPrice;
                    const finalPrice = hasPromo ? item.offerPrice : item.price;
                    const isOutOfStock = item.stock !== undefined && item.stock <= 0;

                    return (
                      <div 
                        key={item.id} 
                        className="rounded-2xl border border-coffee/35 bg-white p-3 flex gap-3 shadow-xs hover:border-coffee transition-all relative overflow-hidden"
                      >
                        {/* Sold out overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                            <span className="bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                              Agotado temporalmente
                            </span>
                          </div>
                        )}

                        <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-serif font-bold text-espresso text-xs leading-snug">
                                {item.name}
                              </h4>
                              
                              <div className="text-right shrink-0">
                                {hasPromo ? (
                                  <>
                                    <span className="text-[9px] line-through text-espresso/40 block">${item.price.toFixed(2)}</span>
                                    <span className="text-xs font-serif font-black text-caramel">${item.offerPrice?.toFixed(2)}</span>
                                  </>
                                ) : (
                                  <span className="text-xs font-serif font-black text-espresso">${item.price.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-espresso/60 mt-1 line-clamp-2 leading-relaxed italic">
                              {item.description}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            {/* Stock Indicator */}
                            <span className="text-[8px] font-mono font-medium uppercase text-espresso/50">
                              {item.stock !== undefined ? `${item.stock} disponibles` : "Stock libre"}
                            </span>

                            <button
                              disabled={isOutOfStock}
                              onClick={() => {
                                onAddToBag(item, { size: "M", milk: "Regular", sweetness: "100%" });
                                onShowNotification(`🛒 Añadió ${item.name} para su Mesa.`, "success");
                              }}
                              className="rounded-full bg-espresso hover:bg-caramel text-paper font-bold text-[9px] px-3 py-1.5 transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <span>Pedir</span>
                              <Utensils className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Phone Simulated Footer */}
            <div className="bg-paper border-t border-coffee/30 p-3 text-center text-[9px] text-espresso/40">
              Café Puglia Digital v1.2 • Conexión Segura de Mesa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
