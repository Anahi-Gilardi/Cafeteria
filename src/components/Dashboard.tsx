import { useState, useEffect } from "react";
import { Plus, Receipt, Coins, Coffee, TrendingUp, ArrowUp, X } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";

interface Insumo {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minLimit: number;
  expiryDate: string;
  provider: string;
}

interface DashboardProps {
  onGoToCaja: () => void;
  onGoToInventario: () => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

export default function Dashboard({ onGoToCaja, onGoToInventario, onShowNotification }: DashboardProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movType, setMovType] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [movInsumoId, setMovInsumoId] = useState("");
  const [movQty, setMovQty] = useState("");

  // Load Insumos from Supabase
  const loadInsumos = async () => {
    try {
      const { data, error } = await supabase.from("insumos").select("*");
      if (data && !error) {
        setInsumos(data.map(i => ({
          id: i.id,
          name: i.name,
          quantity: Number(i.quantity),
          unit: i.unit,
          minLimit: Number(i.min_limit),
          expiryDate: i.expiry_date,
          provider: i.provider
        })));
        if (data.length > 0 && !movInsumoId) {
          setMovInsumoId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading insumos for dashboard:", err);
    }
  };

  useEffect(() => {
    loadInsumos();
  }, []);

  const handleAdjustInsumo = async (id: string, delta: number) => {
    const target = insumos.find(i => i.id === id);
    if (!target) return;

    const newQty = Math.max(0, parseFloat((target.quantity + delta).toFixed(2)));

    try {
      const { error } = await supabase
        .from("insumos")
        .update({ quantity: newQty })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setInsumos(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    } catch (err) {
      console.error("Error adjusting insumos on Supabase:", err);
      onShowNotification("❌ Error al guardar el movimiento en la base de datos.", "warning");
    }
  };

  // Find critical items for semaphore alerts
  const alerts = insumos.filter(i => i.quantity <= i.minLimit);
  const coveragePercent = insumos.length > 0 
    ? Math.round(((insumos.length - alerts.length) / insumos.length) * 100) 
    : 100;

  return (
    <motion.div
      key="dashboard-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Resumen Diario</span>
          <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Control de Operaciones</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setMovType("Ingreso");
              if (insumos.length > 0) {
                setMovInsumoId(insumos[0].id);
              }
              setMovQty("");
              setIsMovementModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold shadow-md hover:bg-[#3d2217] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Registrar Movimiento
          </button>
          <button 
            onClick={onGoToCaja}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2C1810]/20 hover:bg-[#2C1810]/5 text-xs font-bold text-[#2C1810] transition-all cursor-pointer bg-white"
          >
            <Receipt className="h-4 w-4" /> Terminal de Caja
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Venta Neta Hoy</span>
            <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">$185.400</div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-1.5 flex items-center gap-0.5">
              <ArrowUp className="h-3 w-3" /> +18.4% vs promedio histórico
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Costo de Insumos</span>
            <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">$58.401</div>
            <span className="text-[10px] text-[#2C1810]/60 font-semibold block mt-1.5">
              Ratio objetivo: 32% (Actual: 31.5%)
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
            <Coffee className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Margen Bruto</span>
            <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">68.5%</div>
            <span className="text-[10px] text-[#2C1810]/60 font-semibold block mt-1.5">
              Generando $126.999 neto hoy
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Chart + Reposición split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2C1810]">Desempeño de Ventas</h3>
                <p className="text-[10px] text-[#2C1810]/50 font-medium">Flujo de caja registrado acumulado por día de la semana habitual (en ARS)</p>
              </div>
              <span className="text-[9px] font-bold text-[#2C1810]/60 bg-[#2C1810]/5 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                7 Días Históricos
              </span>
            </div>

            {/* Custom CSS Bars */}
            <div className="flex justify-between items-end h-64 px-4 border-b border-[#2C1810]/10 pb-2">
              {[
                { label: "Lunes", value: "$150k", height: "45%" },
                { label: "Martes", value: "$170k", height: "52%" },
                { label: "Miércoles", value: "$160k", height: "48%" },
                { label: "Jueves", value: "$200k", height: "60%" },
                { label: "Viernes", value: "$240k", height: "72%" },
                { label: "Sábado", value: "$300k", height: "90%" },
                { label: "Domingo", value: "$280k", height: "84%" }
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center group w-10">
                  <span className="text-[9px] font-bold text-[#2C1810] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                    {bar.value}
                  </span>
                  <div 
                    style={{ height: bar.height }}
                    className="w-8 bg-[#2C1810] hover:bg-[#C2956E] transition-all rounded-t-md duration-300"
                  ></div>
                </div>
              ))}
            </div>

            <div className="flex justify-between px-4 pt-3 text-[10px] font-bold text-[#2C1810]/60">
              <span>Lunes</span>
              <span>Martes</span>
              <span>Miércoles</span>
              <span>Jueves</span>
              <span>Viernes</span>
              <span>Sábado</span>
              <span>Domingo</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2C1810]">Semáforo de Reposición</h3>
                <p className="text-[10px] text-[#2C1810]/50 font-medium">Insumos críticos e alertas potenciales</p>
              </div>
              <span className={`h-5 px-2 flex items-center justify-center rounded-full text-white text-[9px] font-bold ${
                alerts.length > 0 ? "bg-red-600" : "bg-emerald-600"
              }`}>
                {alerts.length} Alertas
              </span>
            </div>

            <div className="p-3 bg-[#FDFBF7] border border-[#2C1810]/5 rounded-2xl">
              <div className="flex justify-between text-[10px] font-bold text-[#2C1810]/80 mb-1.5">
                <span>Cobertura General de Stock</span>
                <span>{coveragePercent}% óptimo</span>
              </div>
              <div className="w-full h-2 bg-[#2C1810]/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${coveragePercent < 50 ? "bg-red-500" : coveragePercent < 80 ? "bg-amber-500" : "bg-emerald-500"}`} 
                  style={{ width: `${coveragePercent}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div key={idx} className="p-3 bg-[#FDFBF7] border border-[#2C1810]/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0"></span>
                      <div>
                        <strong className="text-xs font-bold text-[#2C1810] block leading-tight">{alert.name}</strong>
                        <span className="text-[9px] text-[#2C1810]/40">Proveedor: {alert.provider}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2C1810] block">{alert.quantity} {alert.unit}</span>
                      <span className="text-[9px] text-red-600 font-bold block">Bajo Límite ({alert.minLimit})</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#2C1810]/50 italic text-center py-4 font-semibold">✨ Todos los insumos están en niveles saludables.</p>
              )}
            </div>
          </div>

          <button 
            onClick={onGoToInventario}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2C1810]/5 hover:bg-[#2C1810]/10 text-xs font-bold text-[#2C1810] transition-all cursor-pointer border border-[#2C1810]/5"
          >
            Gestionar Inventario Completo ↗
          </button>
        </div>
      </div>

      {/* Unified Movement Registration Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setIsMovementModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-4">Registrar Movimiento de Stock</h4>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/50 uppercase tracking-wider block mb-1.5">Tipo de Ajuste</span>
                <div className="grid grid-cols-2 gap-3">
                  {["Ingreso", "Egreso"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMovType(t as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        movType === t 
                          ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810]" 
                          : "bg-white border-stone-200 text-[#2C1810] hover:bg-stone-50"
                      }`}
                    >
                      {t === "Ingreso" ? "📥 Ingreso (Recibo)" : "📤 Egreso (Merma/Ajuste)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Materia Prima / Insumo</label>
                <select 
                  value={movInsumoId}
                  onChange={(e) => setMovInsumoId(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] font-bold cursor-pointer"
                >
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Cantidad a Ajustar</label>
                <input 
                  type="number"
                  placeholder="Ingrese el valor numérico"
                  value={movQty}
                  onChange={(e) => setMovQty(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-bold"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={() => setIsMovementModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#2C1810]/60 hover:bg-stone-100 transition-all cursor-pointer text-center bg-transparent"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const val = parseFloat(movQty);
                    if (isNaN(val) || val <= 0) {
                      onShowNotification("⚠️ Ingrese una cantidad válida mayor a cero.", "warning");
                      return;
                    }
                    const multiplier = movType === "Ingreso" ? 1 : -1;
                    handleAdjustInsumo(movInsumoId, val * multiplier);
                    setIsMovementModalOpen(false);
                    onShowNotification(`📦 Ajuste realizado: Se registró ${movType.toLowerCase()} de ${val} unidades.`, "success");
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md transition-all cursor-pointer text-center"
                >
                  Guardar Cambios ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
