import React, { useState } from "react";
import { Table, Order } from "../../../types";
import { 
  Plus, Users, RotateCcw, Clock, DoorOpen, LogOut, Wine, SunMedium
} from "lucide-react";

interface ArchitecturalSalonMapProps {
  tables: Table[];
  orders: Order[];
  onSelectTable: (tableNum: string) => void;
  onUpdateTableCoords: (tableId: string, x: number, y: number) => void;
  onToggleTableStatus: (table: Table) => void;
  onJoinTables: (tableId1: string, tableId2: string) => void;
  onUnjoinTable: (tableId: string) => void;
  onAddTable: () => void;
}

export const ArchitecturalSalonMap: React.FC<ArchitecturalSalonMapProps> = ({
  tables,
  orders,
  onSelectTable,
  onUpdateTableCoords,
  onToggleTableStatus,
  onJoinTables,
  onUnjoinTable,
  onAddTable
}) => {
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [selectedTableForJoin, setSelectedTableForJoin] = useState<string | null>(null);

  const getTableOrder = (tableName: string) => {
    return orders.find(o => o.tableNumber === tableName && o.status !== "Completado");
  };

  const handlePointerDown = (tableId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggedTableId(tableId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedTableId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const snappedX = Math.max(5, Math.min(90, Math.round(rawX / 5) * 5));
    const snappedY = Math.max(5, Math.min(90, Math.round(rawY / 5) * 5));

    onUpdateTableCoords(draggedTableId, snappedX, snappedY);
  };

  const handlePointerUp = () => {
    setDraggedTableId(null);
  };

  const occupiedCount = tables.filter(t => t.status === "Ocupada" || getTableOrder(t.name)).length;
  const freeCount = tables.filter(t => t.status === "Libre" && !getTableOrder(t.name)).length;
  const reservedCount = tables.filter(t => t.status === "Reservada").length;

  return (
    <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap justify-between items-center border-b border-[#CFB5A0] pb-4 gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-[#5E393F] block">Arquitectura & Distribución 2D</span>
          <h3 className="font-serif text-xl font-bold text-[#5C1D27] mt-0.5">Plano del Salón — Castaño Resto Bar</h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#DFEADF] text-[#4F735A] border border-[#4F735A]/30 text-[10px] font-bold">
            🟢 {freeCount} Libres
          </span>
          <span className="px-3 py-1 rounded-full bg-[#5C1D27] text-white text-[10px] font-black">
            🔴 {occupiedCount} Ocupadas
          </span>
          <span className="px-3 py-1 rounded-full bg-[#F5E4CC] text-[#B97932] border border-[#B97932]/30 text-[10px] font-bold">
            🟡 {reservedCount} Reservadas
          </span>
          <button
            onClick={onAddTable}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" /> Crear Mesa
          </button>
        </div>
      </div>

      <div 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-[520px] bg-[#F4E8D7]/60 border-2 border-dashed border-[#CFB5A0] rounded-3xl overflow-hidden select-none touch-none shadow-inner"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#5C1D27] text-white px-6 py-1 rounded-b-xl text-[9px] font-black uppercase tracking-widest shadow-xs flex items-center gap-1.5 z-10">
          <DoorOpen className="h-3.5 w-3.5 text-[#EBDAC5]" /> Entrada Principal — Constitución 944
        </div>

        <div className="absolute bottom-0 right-8 bg-[#A63F45] text-white px-4 py-0.5 rounded-t-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1 z-10">
          <LogOut className="h-3 w-3" /> Salida de Emergencia
        </div>

        <div className="absolute top-12 left-6 bg-[#E2C6B0] border border-[#D1AD95] p-3 rounded-2xl text-[9px] font-black text-[#5C1D27] uppercase tracking-wider shadow-xs flex items-center gap-2">
          <Wine className="h-4 w-4 text-[#5C1D27]" /> Barra de Tragos & Cafetería
        </div>

        <div className="absolute bottom-6 left-6 bg-[#EBDAC5]/80 border border-[#CFB5A0] p-2.5 rounded-2xl text-[9px] font-black text-[#5E393F] uppercase tracking-wider flex items-center gap-1.5">
          <SunMedium className="h-4 w-4 text-[#B97932]" /> Terraza Exterior & Ventanal
        </div>

        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#5C1D27 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />

        {tables.map((table) => {
          const activeOrder = getTableOrder(table.name);
          const isOccupied = activeOrder !== undefined || table.status === "Ocupada";
          const isReserved = table.status === "Reservada";
          const isSelectedJoin = selectedTableForJoin === table.id;

          const posX = table.coordX || 10;
          const posY = table.coordY || 10;

          return (
            <div
              key={table.id}
              onPointerDown={(e) => handlePointerDown(table.id, e)}
              onClick={() => onSelectTable(table.name)}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                transform: "translate(-50%, -50%)"
              }}
              className={`absolute cursor-grab active:cursor-grabbing transition-shadow duration-150 p-4 rounded-2xl border-2 w-32 text-center shadow-md ${
                isSelectedJoin
                  ? "ring-4 ring-amber-500 border-amber-600 bg-amber-50"
                  : isOccupied
                  ? "bg-[#5C1D27] text-white border-[#4A151D]"
                  : isReserved
                  ? "bg-[#F5E4CC] text-[#8C551A] border-[#B97932]"
                  : "bg-[#FAF2E6] text-[#2D0E13] border-[#CFB5A0] hover:border-[#5C1D27]"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isOccupied
                    ? "bg-white/20 text-white"
                    : isReserved
                    ? "bg-[#B97932]/20 text-[#8C551A]"
                    : "bg-[#DFEADF] text-[#4F735A]"
                }`}>
                  {table.type === "terrace" ? "Terraza" : table.type === "bar" ? "Barra" : "Salón"}
                </span>

                {table.joinedWith && (
                  <span className="text-[7px] bg-amber-400 text-amber-950 font-black px-1 rounded">
                    Unida
                  </span>
                )}
              </div>

              <h4 className="font-serif font-black text-sm">{table.name}</h4>
              <span className="text-[10px] font-medium block opacity-90 mt-0.5">
                Cap: {table.capacity} p.
              </span>

              {isOccupied && activeOrder && (
                <div className="mt-2 pt-1.5 border-t border-white/20 text-[9px] font-mono font-bold">
                  <div>${activeOrder.total.toLocaleString("es-AR")}</div>
                  <div className="text-[8px] opacity-80 mt-0.5 flex items-center justify-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> 35 min
                  </div>
                </div>
              )}

              {isReserved && table.reservationDetails && (
                <div className="mt-1.5 text-[8px] font-bold truncate">
                  👤 {table.reservationDetails.clientName}
                </div>
              )}

              <div className="mt-2 flex justify-center gap-1">
                {isOccupied && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTable(table.name);
                    }}
                    title="Cobrar Mesa en Caja"
                    className="p-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-md text-[8px] flex items-center gap-0.5"
                  >
                    💳 Cobrar
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTableStatus(table);
                  }}
                  title="Cambiar Estado"
                  className={`p-1 rounded-md text-[8px] font-black ${
                    isOccupied ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#EBDAC5] hover:bg-[#CFB5A0] text-[#5C1D27]"
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>

                {table.joinedWith ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnjoinTable(table.id);
                    }}
                    title="Desunir Mesa"
                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[8px]"
                  >
                    Separar
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedTableForJoin === table.id) {
                        setSelectedTableForJoin(null);
                      } else if (selectedTableForJoin) {
                        onJoinTables(selectedTableForJoin, table.id);
                        setSelectedTableForJoin(null);
                      } else {
                        setSelectedTableForJoin(table.id);
                      }
                    }}
                    title="Unir Mesa"
                    className="p-1 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-md text-[8px]"
                  >
                    <Users className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArchitecturalSalonMap;
