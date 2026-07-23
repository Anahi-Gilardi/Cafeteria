import { useState } from "react";
import { MenuItem, MenuItemCustomization, DailyExecutiveMenu } from "../types";
import { getTodayExecutiveMenu } from "../data/dailyMenus";
import { Utensils, CheckCircle, ChevronRight, ChevronLeft, Wine, Coffee, IceCream, Flame, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExecutiveMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customization: MenuItemCustomization, totalComboPrice: number) => void;
}

export default function ExecutiveMenuModal({ isOpen, onClose, onConfirm }: ExecutiveMenuModalProps) {
  const dailyConfig = getTodayExecutiveMenu();

  const [step, setStep] = useState<number>(1);
  const [selectedStarter, setSelectedStarter] = useState<string>(dailyConfig.starters[0] || "");
  const [selectedMain, setSelectedMain] = useState<string>(dailyConfig.mains[0] || "");
  const [selectedDrink, setSelectedDrink] = useState<string>(dailyConfig.drinks[0] || "");
  const [selectedDessert, setSelectedDessert] = useState<string>(dailyConfig.desserts[0] || "");

  const [cookingPoint, setCookingPoint] = useState<"Jugoso" | "A punto" | "Bien cocido">("A punto");
  const [sideDish, setSideDish] = useState<string>("Papas Fritas Provenzal");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  if (!isOpen) return null;

  const handleFinish = () => {
    const cust: MenuItemCustomization = {
      priceList: "Salon",
      cookingPoint: selectedMain.toLowerCase().includes("bife") || selectedMain.toLowerCase().includes("entraña") || selectedMain.toLowerCase().includes("carne") ? cookingPoint : undefined,
      sideDish: selectedMain.toLowerCase().includes("milanesa") || selectedMain.toLowerCase().includes("bife") || selectedMain.toLowerCase().includes("pollo") ? sideDish : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      executiveChoices: {
        starter: selectedStarter,
        main: selectedMain,
        drink: selectedDrink,
        dessert: selectedDessert
      }
    };
    onConfirm(cust, dailyConfig.price);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#2C1810]/75 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#FDFBF7] border border-[#2C1810]/20 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden text-[#2C1810]"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2C1810]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#C2956E] text-[#2C1810]">
                ⭐ {dailyConfig.dayOfWeek} • Menú Ejecutivo del Día
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold mt-1 text-[#2C1810]">{dailyConfig.title}</h3>
            <p className="text-xs text-[#2C1810]/60 italic mt-0.5">{dailyConfig.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#2C1810]/50 hover:bg-[#2C1810]/10 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/60 font-mono">
            <span className={step >= 1 ? "text-[#C2956E] font-black" : ""}>1. Entrada</span>
            <span className={step >= 2 ? "text-[#C2956E] font-black" : ""}>2. Principal</span>
            <span className={step >= 3 ? "text-[#C2956E] font-black" : ""}>3. Bebida</span>
            <span className={step >= 4 ? "text-[#C2956E] font-black" : ""}>4. Postre/Café</span>
          </div>
          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              style={{ width: `${(step / 4) * 100}%` }}
              className="h-full bg-[#2C1810] rounded-full transition-all duration-300"
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h4 className="font-serif text-base font-bold flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[#C2956E]" /> Paso 1: Seleccione su Entrada
              </h4>

              <div className="space-y-2.5">
                {dailyConfig.starters.map((st) => (
                  <label
                    key={st}
                    onClick={() => setSelectedStarter(st)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedStarter === st
                        ? "border-[#2C1810] bg-[#2C1810] text-[#FDFBF7] shadow-xs font-bold"
                        : "border-[#2C1810]/15 bg-white text-[#2C1810] hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-xs">{st}</span>
                    {selectedStarter === st && <CheckCircle className="h-4 w-4 text-[#C2956E]" />}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h4 className="font-serif text-base font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#C2956E]" /> Paso 2: Seleccione su Plato Principal
              </h4>

              <div className="space-y-2.5">
                {dailyConfig.mains.map((mn) => (
                  <label
                    key={mn}
                    onClick={() => setSelectedMain(mn)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedMain === mn
                        ? "border-[#2C1810] bg-[#2C1810] text-[#FDFBF7] shadow-xs font-bold"
                        : "border-[#2C1810]/15 bg-white text-[#2C1810] hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-xs">{mn}</span>
                    {selectedMain === mn && <CheckCircle className="h-4 w-4 text-[#C2956E]" />}
                  </label>
                ))}
              </div>

              {/* Modifiers for Meat / Mains */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3 pt-3">
                <span className="text-[10px] font-black uppercase text-[#C2956E] tracking-wider block">Opciones del Plato Principal</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[9px] font-bold text-[#2C1810]/60 uppercase block mb-1">Punto de Cocción</label>
                    <select
                      value={cookingPoint}
                      onChange={(e) => setCookingPoint(e.target.value as any)}
                      className="w-full p-2 rounded-xl border border-[#2C1810]/20 bg-white font-semibold text-xs focus:outline-none"
                    >
                      <option value="Jugoso">Jugoso / Vuelta y Vuelta</option>
                      <option value="A punto">A Punto (Recomendado)</option>
                      <option value="Bien cocido">Bien Cocido</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#2C1810]/60 uppercase block mb-1">Guarnición Acompañante</label>
                    <select
                      value={sideDish}
                      onChange={(e) => setSideDish(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#2C1810]/20 bg-white font-semibold text-xs focus:outline-none"
                    >
                      <option value="Papas Fritas Provenzal">Papas Fritas Provenzal</option>
                      <option value="Puré de Papas Rústico">Puré de Papas Rústico</option>
                      <option value="Ensalada Mixta de la Huerta">Ensalada Mixta de la Huerta</option>
                      <option value="Vegetales Salteados al Wok">Vegetales Salteados al Wok</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h4 className="font-serif text-base font-bold flex items-center gap-2">
                <Wine className="h-4 w-4 text-[#C2956E]" /> Paso 3: Seleccione su Bebida
              </h4>

              <div className="space-y-2.5">
                {dailyConfig.drinks.map((dr) => (
                  <label
                    key={dr}
                    onClick={() => setSelectedDrink(dr)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedDrink === dr
                        ? "border-[#2C1810] bg-[#2C1810] text-[#FDFBF7] shadow-xs font-bold"
                        : "border-[#2C1810]/15 bg-white text-[#2C1810] hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-xs">{dr}</span>
                    {selectedDrink === dr && <CheckCircle className="h-4 w-4 text-[#C2956E]" />}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h4 className="font-serif text-base font-bold flex items-center gap-2">
                <Coffee className="h-4 w-4 text-[#C2956E]" /> Paso 4: Postre o Café de Cierre
              </h4>

              <div className="space-y-2.5">
                {dailyConfig.desserts.map((ds) => (
                  <label
                    key={ds}
                    onClick={() => setSelectedDessert(ds)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedDessert === ds
                        ? "border-[#2C1810] bg-[#2C1810] text-[#FDFBF7] shadow-xs font-bold"
                        : "border-[#2C1810]/15 bg-white text-[#2C1810] hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-xs">{ds}</span>
                    {selectedDessert === ds && <CheckCircle className="h-4 w-4 text-[#C2956E]" />}
                  </label>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#2C1810]/60 uppercase block mb-1">Indicaciones Especiales para Cocina (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Sin sal en las papas, aderezo aparte, alergias..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Navigation */}
        <div className="pt-4 border-t border-[#2C1810]/10 flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#2C1810]/20 text-xs font-bold hover:bg-stone-100 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
          ) : (
            <div></div>
          )}

          <div className="text-right">
            <span className="text-[10px] text-[#2C1810]/50 uppercase font-mono block">Precio Combo Cerrado</span>
            <span className="font-serif font-black text-xl text-[#2C1810] font-mono">${dailyConfig.price.toFixed(2)}</span>
          </div>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2C1810] text-white text-xs font-bold hover:bg-[#3d2217] transition-all cursor-pointer shadow-md"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#C2956E] text-[#2C1810] text-xs font-black hover:bg-[#a87c57] transition-all cursor-pointer shadow-md"
            >
              ✓ Agregar Menú al Pedido
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
