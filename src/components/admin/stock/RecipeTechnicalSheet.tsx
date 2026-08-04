import React from "react";
import { MenuItem, Insumo } from "../../../types";
import { DollarSign, PieChart, AlertTriangle, CheckCircle } from "lucide-react";

interface RecipeTechnicalSheetProps {
  product: MenuItem;
  insumos: Insumo[];
  onEditProduct: (product: MenuItem) => void;
  getRecipeCost: (product: MenuItem) => number;
}

export const RecipeTechnicalSheet: React.FC<RecipeTechnicalSheetProps> = ({
  product,
  insumos,
  onEditProduct,
  getRecipeCost
}) => {
  const directCost = getRecipeCost(product);
  const isRecipeComplete = directCost > 0;
  const utility = product.price > 0 && isRecipeComplete ? product.price - directCost : 0;
  const margin = product.price > 0 && isRecipeComplete ? ((product.price - directCost) / product.price) * 100 : 0;

  return (
    <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-start border-b border-[#CFB5A0] pb-4">
        <div>
          <span className="text-[9px] font-black text-[#5E393F] uppercase tracking-widest block">Ficha Técnica — Gastronomía Gourmet</span>
          <h3 className="font-serif text-2xl font-bold text-[#5C1D27] mt-1">{product.name}</h3>
          <p className="text-xs text-[#5E393F] mt-1 font-medium">{product.description || "Sin descripción cargada."}</p>
        </div>
        <button
          onClick={() => onEditProduct(product)}
          className="px-4 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-xs"
        >
          ✏️ Editar Ficha
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
          <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Costo Materia Prima</span>
          <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
            {isRecipeComplete ? `$${directCost.toFixed(0)}` : "S/D"}
          </div>
          <span className="text-[7px] text-[#5E393F] block font-semibold mt-1">Calculado por gramo/mL</span>
        </div>

        <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
          <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Utilidad Bruta</span>
          <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
            {isRecipeComplete ? `$${utility.toFixed(0)}` : "Sin costo"}
          </div>
          <span className="text-[7px] text-[#5E393F] block font-semibold mt-1">Sugerido menos costos fijos</span>
        </div>

        <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
          <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Margen de Contribución</span>
          <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
            {isRecipeComplete ? `${margin.toFixed(1)}%` : "N/A"}
          </div>
          <span className={`text-[7px] font-bold block mt-1 uppercase text-center ${
            !isRecipeComplete
              ? "text-[#A63F45] bg-[#F4DCDD] border border-[#A63F45]/30 px-1 py-0.5 rounded"
              : margin >= 60 
                ? "text-[#4F735A] bg-[#DFEADF] border border-[#4F735A]/30 px-1 py-0.5 rounded" 
                : "text-[#B97932] bg-[#F5E4CC] border border-[#B97932]/30 px-1 py-0.5 rounded"
          }`}>
            {!isRecipeComplete ? "RECETA INCOMPLETA" : margin >= 60 ? "EXCELENTE" : "BAJO"}
          </span>
        </div>
      </div>

      {!isRecipeComplete && (
        <div className="p-4 bg-[#F4DCDD] border border-[#A63F45]/40 rounded-2xl text-[#A63F45] text-xs flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Este producto no posee insumos o receta asignada. Cargue sus insumos para calcular el costo directo y margen bruto exacto.</span>
        </div>
      )}
    </div>
  );
};

export default RecipeTechnicalSheet;
