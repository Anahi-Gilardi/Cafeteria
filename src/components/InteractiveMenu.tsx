import { useState, useMemo } from "react";
import { MENU_ITEMS } from "../data/menu";
import { MenuItem, MenuItemCustomization } from "../types";
import { Search, Info, Plus, ChevronRight, SlidersHorizontal, Check, Coffee, Flame, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InteractiveMenuProps {
  onAddToBag: (item: MenuItem, customization: MenuItemCustomization) => void;
  menuItems?: MenuItem[];
}

export default function InteractiveMenu({ onAddToBag, menuItems = MENU_ITEMS }: InteractiveMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  
  // Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState<"M" | "L" | "XL">("M");
  const [customMilk, setCustomMilk] = useState<string>("Regular");
  const [customSweetness, setCustomSweetness] = useState<"0%" | "50%" | "100%">("100%");
  const [customWarmed, setCustomWarmed] = useState<boolean>(false);
  const [customExtras, setCustomExtras] = useState<string[]>([]);

  // Category Configuration
  const categories = [
    { id: "all", label: "Todo el Menú", emoji: "☕" },
    { id: "coffee", label: "Especialidades Porteñas", emoji: "✨" },
    { id: "traditional", label: "Cafés de Siempre", emoji: "☕" },
    { id: "cold", label: "Bebidas Frías", emoji: "❄️" },
    { id: "bakery", label: "Facturas y Alfajores", emoji: "🥐" },
    { id: "brunch", label: "Tostados y Desayunos", emoji: "🥪" },
  ];

  // Available tags for quick filter
  const allTags = ["Especial", "Vegano", "Sin Gluten", "Recomendado", "Artesanal"];

  const toggleTag = (tag: string) => {
    if (activeTags.includes(tag)) {
      setActiveTags(activeTags.filter(t => t !== tag));
    } else {
      setActiveTags([...activeTags, tag]);
    }
  };

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category Match
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Search Match
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      // Tags Match
      if (activeTags.length > 0) {
        const hasAllTags = activeTags.every(tag => item.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery, activeTags]);

  // Open customization modal
  const handleOpenCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
    setCustomSize("M");
    setCustomMilk("Regular");
    setCustomSweetness("100%");
    setCustomWarmed(false);
    setCustomExtras([]);
  };

  const toggleExtra = (extra: string) => {
    if (customExtras.includes(extra)) {
      setCustomExtras(customExtras.filter(e => e !== extra));
    } else {
      setCustomExtras([...customExtras, extra]);
    }
  };

  // Calculate customized price
  const currentCustomizedPrice = useMemo(() => {
    if (!customizingItem) return 0;
    let price = customizingItem.price;
    
    if (customizingItem.category === "coffee" || customizingItem.category === "cold" || customizingItem.category === "traditional") {
      // Size pricing
      if (customSize === "L") price += 0.50;
      if (customSize === "XL") price += 0.90;

      // Milk premium
      if (customMilk === "Almendra" || customMilk === "Avena") price += 0.50;
      if (customMilk === "Deslactosada") price += 0.20;

      // Extras pricing
      if (customExtras.includes("Extra Espresso Shot")) price += 0.80;
      if (customExtras.includes("Sirope de Caramelo")) price += 0.50;
      if (customExtras.includes("Crema Batida")) price += 0.40;
    }
    
    return Number(price.toFixed(2));
  }, [customizingItem, customSize, customMilk, customExtras]);

  // Handle adding to cart
  const handleConfirmAdd = () => {
    if (!customizingItem) return;
    
    const customization: MenuItemCustomization = {};
    
    if (customizingItem.category === "coffee" || customizingItem.category === "cold" || customizingItem.category === "traditional") {
      customization.size = customSize;
      customization.milk = customMilk as any;
      customization.sweetness = customSweetness;
      if (customExtras.length > 0) {
        customization.extras = customExtras;
      }
    } else if (customizingItem.category === "bakery") {
      customization.warmed = customWarmed;
    }

    onAddToBag(customizingItem, customization);
    setCustomizingItem(null); // Close modal
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search and Hero Intro */}
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-extrabold tracking-tight text-espresso sm:text-5xl italic">Nuestro Menú</h1>
        <p className="mx-auto mt-3 max-w-2xl text-espresso/70">
          Insumos seleccionados con trazabilidad ética, tueste artesanal local y repostería horneada cada mañana.
        </p>

        {/* Search Bar */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-espresso/40" />
            <input
              type="text"
              id="menu-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar café, postre, bagel..."
              className="w-full rounded-full border border-coffee bg-white py-3.5 pr-4 pl-12 shadow-xs outline-none transition-all focus:border-caramel focus:ring-2 focus:ring-caramel/20 text-espresso"
            />
          </div>
        </div>
      </div>

      {/* Category Slider */}
      <div className="mb-8 overflow-x-auto pb-3 flex justify-start md:justify-center items-center gap-2 md:gap-3 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`category-tab-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex shrink-0 items-center space-x-1.5 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-espresso text-paper shadow-md shadow-espresso/20"
                : "bg-paper border border-coffee text-espresso/70 hover:bg-espresso/5"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Tags Quick Filters */}
      <div className="mb-8 flex flex-wrap justify-start md:justify-center items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-espresso/50 flex items-center mr-1">
          <SlidersHorizontal className="h-3 w-3 mr-1" /> Filtrar:
        </span>
        {allTags.map((tag) => {
          const isSelected = activeTags.includes(tag);
          return (
            <button
              key={tag}
              id={`tag-filter-${tag.replace(/\s+/g, "-")}`}
              onClick={() => toggleTag(tag)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                isSelected
                  ? "bg-caramel/10 border-caramel/30 text-espresso"
                  : "bg-white border-coffee text-espresso/60 hover:border-espresso/40"
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
              <span>{tag}</span>
            </button>
          );
        })}
        {activeTags.length > 0 && (
          <button
            id="clear-filters-btn"
            onClick={() => setActiveTags([])}
            className="text-xs font-bold text-caramel hover:text-espresso underline pl-1 cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Menu Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div 
          layout
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredItems.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-coffee bg-white transition-all hover:translate-y-[-4px] hover:shadow-xl hover:border-caramel"
            >
              {/* Product Image & Tags overlay */}
              <div className="relative h-56 overflow-hidden bg-paper">
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span 
                      key={tag} 
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        tag === "Especial" ? "bg-caramel text-white" :
                        tag === "Vegano" ? "bg-emerald-700 text-white" :
                        tag === "Sin Gluten" ? "bg-caramel/20 text-espresso" :
                        tag === "Recomendado" ? "bg-espresso text-paper" :
                        "bg-paper border border-coffee text-espresso/80"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-espresso backdrop-blur-sm shadow-md">
                  {item.nutrition.calories} kcal
                </div>
              </div>

              {/* Product Details */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-xl font-bold text-espresso group-hover:text-caramel transition-colors">
                    {item.name}
                  </h3>
                  <span className="text-xl font-extrabold text-espresso">${item.price.toFixed(2)}</span>
                </div>
                <p className="mt-2 text-sm text-espresso/70 line-clamp-2 leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Allergen indicators */}
                {item.nutrition.allergens.length > 0 && (
                  <div className="mt-3 flex items-center space-x-1 text-[11px] text-espresso/40">
                    <Info className="h-3 w-3" />
                    <span>Contiene: {item.nutrition.allergens.join(", ")}</span>
                  </div>
                )}

                {/* Add/Customize Trigger */}
                <div className="mt-5 pt-4 border-t border-coffee flex items-center justify-between">
                  <span className="text-xs font-semibold text-espresso/50 uppercase tracking-widest">
                    {item.category === "bakery" ? "Facturas / Alfajores" : item.category === "brunch" ? "Tostados / Cocina" : "Barra de Café"}
                  </span>
                  
                  <button
                    id={`add-item-btn-${item.id}`}
                    onClick={() => handleOpenCustomization(item)}
                    className="flex items-center space-x-1.5 rounded-full bg-espresso px-4 py-2 text-xs font-bold text-paper transition-all hover:bg-caramel active:scale-95 shadow-xs cursor-pointer"
                  >
                    <span>{item.customizable ? "Personalizar" : "Agregar"}</span>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* No results placeholder */}
      {filteredItems.length === 0 && (
        <div className="mt-12 text-center py-12 rounded-2xl border-2 border-dashed border-coffee">
          <p className="text-espresso/60 font-medium text-lg">No encontramos productos con esos filtros.</p>
          <button 
            onClick={() => { setSelectedCategory("all"); setSearchQuery(""); setActiveTags([]); }}
            className="mt-4 rounded-full bg-espresso text-paper px-6 py-2.5 text-sm font-bold cursor-pointer hover:bg-caramel transition-all"
          >
            Ver todo el menú
          </button>
        </div>
      )}

      {/* Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="absolute inset-0 bg-espresso/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-paper shadow-2xl border border-coffee flex flex-col max-h-[85vh] z-10"
            >
              {/* Header / Info */}
              <div className="relative h-44 bg-espresso/10">
                <img
                  src={customizingItem.image}
                  alt={customizingItem.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-espresso via-espresso/30 to-transparent flex items-end p-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-caramel bg-espresso/90 px-3 py-1 rounded-md">
                      {customizingItem.category === "coffee" ? "Especialidad Porteña" : customizingItem.category === "cold" ? "Bebida Fría" : customizingItem.category === "traditional" ? "Café Tradicional" : customizingItem.category === "bakery" ? "Factura / Alfajor" : "Tostado / Desayuno"}
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-white mt-1.5 leading-tight italic">
                      {customizingItem.name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Scrollable Customization Fields */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-paper/50">
                <p className="text-sm text-espresso/70 leading-relaxed italic">
                  {customizingItem.description}
                </p>

                {/* Drinks Customizations (Coffee, Cold, Traditional) */}
                {(customizingItem.category === "coffee" || customizingItem.category === "cold" || customizingItem.category === "traditional") && (
                  <>
                    {/* Size Selector */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-espresso/50 mb-3">Tamaño</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {(["M", "L", "XL"] as const).map((size) => {
                          const prices = { M: "+$0.00", L: "+$0.50", XL: "+$0.90" };
                          return (
                            <button
                              key={size}
                              id={`option-size-${size}`}
                              onClick={() => setCustomSize(size)}
                              className={`flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                customSize === size
                                  ? "border-caramel bg-caramel/10 text-espresso font-bold"
                                  : "border-coffee bg-white text-espresso/60 hover:border-caramel/40"
                              }`}
                            >
                              <Coffee className={`h-4 w-4 mb-1 ${size === 'M' ? 'scale-90' : size === 'L' ? 'scale-100' : 'scale-110'} ${customSize === size ? "text-caramel" : "text-espresso/40"}`} />
                              <span className="text-sm font-bold">{size === 'M' ? 'Mediano' : size === 'L' ? 'Grande' : 'Maxi'}</span>
                              <span className="text-[10px] opacity-85 mt-0.5">{prices[size]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Milk Selector */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-espresso/50 mb-3">Tipo de Leche</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "Regular", label: "Leche Entera", extra: "+$0.00" },
                          { id: "Deslactosada", label: "Deslactosada", extra: "+$0.20" },
                          { id: "Almendra", label: "Bebida Almendra", extra: "+$0.50" },
                          { id: "Avena", label: "Bebida Avena", extra: "+$0.50" },
                        ].map((milk) => (
                          <button
                            key={milk.id}
                            id={`option-milk-${milk.id}`}
                            onClick={() => setCustomMilk(milk.id)}
                            className={`flex justify-between items-center px-4 py-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                              customMilk === milk.id
                                ? "border-caramel bg-caramel/10 text-espresso font-bold"
                                : "border-coffee bg-white text-espresso/60 hover:border-caramel/40"
                            }`}
                          >
                            <span className="text-xs">{milk.label}</span>
                            <span className="text-[10px] opacity-80 font-bold">{milk.extra}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sweetness */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-espresso/50 mb-3">Nivel de Dulzor</h4>
                      <div className="flex rounded-xl bg-coffee/20 p-1">
                        {(["0%", "50%", "100%"] as const).map((lvl) => (
                          <button
                            key={lvl}
                            id={`option-sweet-${lvl.replace("%", "")}`}
                            onClick={() => setCustomSweetness(lvl)}
                            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              customSweetness === lvl
                                ? "bg-white text-espresso shadow-xs"
                                : "text-espresso/50 hover:text-espresso"
                            }`}
                          >
                            {lvl === "0%" ? "Sin Dulce" : lvl === "50%" ? "Medio" : "Normal"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Extras */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-espresso/50 mb-3">Extras Gourmet</h4>
                      <div className="space-y-2">
                        {[
                          { id: "Extra Dulce de Leche", label: "Toque de Dulce de Leche Extra", price: 0.60 },
                          { id: "Vasito de Soda", label: "Vasito de Soda (Agua con Gas)", price: 0.20 },
                          { id: "Extra Espresso Shot", label: "Shot de Espresso Extra", price: 0.80 },
                        ].map((extra) => {
                          const isSelected = customExtras.includes(extra.id);
                          return (
                            <button
                              key={extra.id}
                              id={`option-extra-${extra.id.replace(/\s+/g, "-")}`}
                              onClick={() => toggleExtra(extra.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-caramel bg-caramel/5 text-espresso font-bold"
                                  : "border-coffee bg-white text-espresso/60 hover:border-caramel/30"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? "bg-caramel border-caramel text-white" : "border-coffee/60"}`}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-xs">{extra.label}</span>
                              </div>
                              <span className="text-xs text-caramel font-bold">+${extra.price.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Bakery Customizations */}
                {customizingItem.category === "bakery" && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-espresso/50 mb-3">Preferencia</h4>
                    <button
                      id="option-warmed"
                      onClick={() => setCustomWarmed(!customWarmed)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        customWarmed
                          ? "border-caramel bg-caramel/10 text-espresso font-bold shadow-xs"
                          : "border-coffee bg-white text-espresso/60 hover:border-caramel/30"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Flame className={`h-5 w-5 ${customWarmed ? "text-caramel" : "text-espresso/40"}`} />
                        <div className="text-left">
                          <p className="text-sm">¿Servir Caliente?</p>
                          <p className="text-[11px] font-normal text-espresso/50">Se lo calentamos en el horno para que esté tibio y crujiente.</p>
                        </div>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${customWarmed ? "bg-caramel border-caramel text-white" : "border-coffee/60"}`}>
                        {customWarmed && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="border-t border-coffee bg-paper p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs text-espresso/40 block font-medium uppercase tracking-wider">Total del artículo</span>
                  <span className="text-2xl font-serif font-extrabold text-espresso">${currentCustomizedPrice.toFixed(2)}</span>
                </div>

                <div className="flex space-x-3">
                  <button
                    id="cancel-custom-btn"
                    onClick={() => setCustomizingItem(null)}
                    className="px-4 py-2.5 rounded-full text-sm font-bold text-espresso/60 hover:bg-espresso/5 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-custom-add-btn"
                    onClick={handleConfirmAdd}
                    className="flex items-center space-x-2 rounded-full bg-espresso px-6 py-2.5 text-sm font-bold text-paper shadow-md hover:bg-caramel hover:scale-102 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Agregar al pedido</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
