import React, { useState, FormEvent } from "react";
import { Order } from "../types";
import { ReportingService, CashClosureAudit } from "../services/ReportingService";
import { Calculator, Download, FileText, TrendingUp, DollarSign, Award, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface ReportingModuleProps {
  orders: Order[];
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

export default function ReportingModule({ orders, onShowNotification }: ReportingModuleProps) {
  const [actualCashInput, setActualCashInput] = useState<string>("");
  const [closureAudit, setClosureAudit] = useState<CashClosureAudit | null>(null);

  const topProducts = ReportingService.getTopSellingProducts(orders);

  const handlePerformClosure = (e: FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(actualCashInput) || 0;
    const audit = ReportingService.generateShiftClosure(orders, cashVal);
    setClosureAudit(audit);
    onShowNotification("📊 Arqueo de Caja X/Z generado con éxito.", "success");
  };

  const handleExportCSV = () => {
    ReportingService.exportToCSV(orders);
    onShowNotification("📥 Reporte CSV contable descargado con éxito.", "info");
  };

  return (
    <div className="space-y-8 text-[#FDFBF7]">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1A110B] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-xl gold-glow">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Business Intelligence & Control Fiscal</span>
          <h2 className="font-serif text-3xl font-bold text-[#FDFBF7] mt-0.5">📊 Reportes & Arqueo de Caja (X / Z)</h2>
          <p className="text-xs text-[#FDFBF7]/60 italic mt-1">
            Balance por turno, arqueo de billetes en caja, análisis de productos más vendidos y exportación contable.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black shadow-md hover:brightness-110 cursor-pointer uppercase tracking-wider gold-glow"
        >
          <Download className="h-4 w-4" /> Exportar CSV para Contador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Arqueo X/Z Form & Results (Left) */}
        <div className="lg:col-span-6 bg-[#1A110B] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-[#D4AF37]/20 pb-3">
            <h3 className="font-serif text-xl font-bold text-[#FFDF00] flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#D4AF37]" /> Formulario de Arqueo y Cierre X / Z
            </h3>
            <p className="text-[10px] text-[#FDFBF7]/60 mt-1">
              Ingrese la cantidad total de dinero físico contado en el cajón de dinero.
            </p>
          </div>

          <form onSubmit={handlePerformClosure} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] block mb-2">
                Dinero Físico en Caja ($)
              </label>
              <input
                type="number"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder="Ej: 294254"
                className="w-full p-3.5 border border-[#D4AF37]/30 rounded-2xl bg-[#1C120C] text-2xl font-mono font-bold text-[#FDFBF7] outline-none focus:border-[#D4AF37]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#2A1B12] hover:bg-[#3D281A] text-[#D4AF37] hover:text-white border border-[#D4AF37]/40 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Generar Arqueo Fiscal X/Z
            </button>
          </form>

          {closureAudit && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[#2A1B12] border border-[#D4AF37]/30 rounded-2xl space-y-3"
            >
              <div className="flex justify-between items-center text-xs border-b border-[#D4AF37]/20 pb-2">
                <span className="text-[#FDFBF7]/70">Efectivo Esperado:</span>
                <span className="font-mono font-bold text-[#FDFBF7]">${closureAudit.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#D4AF37]/20 pb-2">
                <span className="text-[#FDFBF7]/70">Mercado Pago / QR:</span>
                <span className="font-mono font-bold text-[#FDFBF7]">${closureAudit.expectedMercadoPago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#D4AF37]/20 pb-2">
                <span className="text-[#FDFBF7]/70">Tarjetas Crédito/Débito:</span>
                <span className="font-mono font-bold text-[#FDFBF7]">${closureAudit.expectedCard.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-1">
                <strong className="text-[#FFDF00]">Diferencia de Caja:</strong>
                <strong className={`font-mono text-base ${
                  closureAudit.cashDifference === 0 ? "text-emerald-400" : closureAudit.cashDifference > 0 ? "text-blue-400" : "text-rose-400"
                }`}>
                  ${closureAudit.cashDifference.toFixed(2)}
                </strong>
              </div>
            </motion.div>
          )}
        </div>

        {/* Top Selling Products Ranking (Right) */}
        <div className="lg:col-span-6 bg-[#1A110B] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-[#D4AF37]/20 pb-3">
            <h3 className="font-serif text-xl font-bold text-[#FFDF00] flex items-center gap-2">
              <Award className="h-5 w-5 text-[#D4AF37]" /> Ranking de Productos Más Vendidos
            </h3>
            <p className="text-[10px] text-[#FDFBF7]/60 mt-1">
              Desglose de rotación entre Cafetería de Especialidad y Menú Ejecutivo del Día.
            </p>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {topProducts.map((prod, idx) => (
              <div key={idx} className="p-3.5 bg-[#2A1B12] border border-[#D4AF37]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block text-[#FDFBF7]">{prod.name}</span>
                  <span className="text-[9px] text-[#D4AF37] uppercase tracking-wider block mt-0.5">{prod.category}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold block text-[#FFDF00]">{prod.unitsSold} u.</span>
                  <span className="text-[10px] text-[#FDFBF7]/60 block">${prod.totalRevenue.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
