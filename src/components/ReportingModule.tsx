import React, { useState, FormEvent } from "react";
import { Order } from "../types";
import { ReportingService, CashClosureAudit } from "../services/ReportingService";
import { formatARS } from "../utils/formatters";
import { PresupuestoPDFService } from "../services/PresupuestoPDFService";
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
    <div className="space-y-8 text-[#332424]">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FFF9F4] border border-[#D7BBA8] rounded-3xl p-6 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6F5A55]">Business Intelligence & Control Fiscal</span>
          <h2 className="font-serif text-3xl font-bold text-[#843747] mt-0.5">📊 Reportes & Arqueo de Caja (X / Z)</h2>
          <p className="text-xs text-[#6F5A55] font-medium mt-1">
            Balance por turno, arqueo de billetes en caja, análisis de productos más vendidos y exportación contable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => PresupuestoPDFService.generatePresupuestoPDF()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#E8D4C3] border border-[#D7BBA8] text-[#843747] text-xs font-bold shadow-xs hover:bg-[#E7C8CF] cursor-pointer uppercase tracking-wider"
          >
            <FileText className="h-4 w-4" /> Presupuesto Comercial PDF
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#843747] hover:bg-[#71303D] text-white text-xs font-black shadow-xs cursor-pointer uppercase tracking-wider"
          >
            <Download className="h-4 w-4" /> Exportar CSV para Contador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Arqueo X/Z Form & Results (Left) */}
        <div className="lg:col-span-6 bg-[#FFF9F4] border border-[#D7BBA8] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#D7BBA8] pb-3">
            <h3 className="font-serif text-xl font-bold text-[#843747] flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#843747]" /> Formulario de Arqueo y Cierre X / Z
            </h3>
            <p className="text-[10px] text-[#6F5A55] mt-1 font-medium">
              Ingrese la cantidad total de dinero físico contado en el cajón de dinero.
            </p>
          </div>

          <form onSubmit={handlePerformClosure} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F5A55] block mb-2">
                Dinero Físico en Caja ($)
              </label>
              <input
                type="number"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder="Ej: 294254"
                className="w-full p-3.5 border border-[#D7BBA8] rounded-2xl bg-[#FFF9F4] text-2xl font-mono font-bold text-[#332424] outline-none focus:border-[#843747]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#843747] hover:bg-[#71303D] text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-xs"
            >
              Generar Arqueo Fiscal X/Z
            </button>
          </form>

          {closureAudit && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[#E8D4C3]/40 border border-[#D7BBA8] rounded-2xl space-y-3"
            >
              <div className="flex justify-between items-center text-xs border-b border-[#D7BBA8] pb-2">
                <span className="text-[#6F5A55] font-semibold">Efectivo Esperado:</span>
                <span className="font-mono font-bold text-[#332424]">{formatARS(closureAudit.expectedCash)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#D7BBA8] pb-2">
                <span className="text-[#6F5A55] font-semibold">Mercado Pago / QR:</span>
                <span className="font-mono font-bold text-[#332424]">{formatARS(closureAudit.expectedMercadoPago)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#D7BBA8] pb-2">
                <span className="text-[#6F5A55] font-semibold">Tarjetas Crédito/Débito:</span>
                <span className="font-mono font-bold text-[#332424]">{formatARS(closureAudit.expectedCard)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-1">
                <strong className="text-[#843747]">Diferencia de Caja:</strong>
                <strong className={`font-mono text-base ${
                  closureAudit.cashDifference === 0 ? "text-[#4F735A]" : closureAudit.cashDifference > 0 ? "text-[#4A7BB0]" : "text-[#A63F45]"
                }`}>
                  {formatARS(closureAudit.cashDifference)}
                </strong>
              </div>
            </motion.div>
          )}
        </div>

        {/* Top Selling Products Ranking (Right) */}
        <div className="lg:col-span-6 bg-[#FFF9F4] border border-[#D7BBA8] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#D7BBA8] pb-3">
            <h3 className="font-serif text-xl font-bold text-[#843747] flex items-center gap-2">
              <Award className="h-5 w-5 text-[#843747]" /> Ranking de Productos Más Vendidos
            </h3>
            <p className="text-[10px] text-[#6F5A55] mt-1 font-medium">
              Desglose de rotación entre Cafetería de Especialidad y Menú del Día.
            </p>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {topProducts.map((prod, idx) => (
              <div key={idx} className="p-3.5 bg-[#E8D4C3]/40 border border-[#D7BBA8] rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold block text-[#332424]">{prod.name}</span>
                  <span className="text-[9px] text-[#843747] uppercase tracking-wider block mt-0.5 font-bold">{prod.category}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-black block text-[#843747]">{prod.unitsSold} u.</span>
                  <span className="text-[10px] text-[#6F5A55] font-semibold block">{formatARS(prod.totalRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
