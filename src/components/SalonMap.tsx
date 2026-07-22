import React, { useState, useMemo } from "react";
import { Order, Reservation } from "../types";
import { Table, Coffee, Users, Clock, CheckCircle, AlertCircle, Calendar, Plus, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SalonMapProps {
  orders: Order[];
  activeBookings: Reservation[];
  onSelectTableForOrder: (tableNumber: string) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

interface TableDefinition {
  id: string;
  name: string;
  section: "Salon Principal" | "Barra Alta" | "Terraza Exterior";
  capacity: number;
  shape: "round" | "square" | "bar";
}

const DEFAULT_TABLES: TableDefinition[] = [
  { id: "t-1", name: "Mesa 1", section: "Salon Principal", capacity: 2, shape: "square" },
  { id: "t-2", name: "Mesa 2", section: "Salon Principal", capacity: 4, shape: "round" },
  { id: "t-3", name: "Mesa 3", section: "Salon Principal", capacity: 4, shape: "square" },
  { id: "t-4", name: "Mesa 4", section: "Salon Principal", capacity: 6, shape: "round" },
  { id: "t-5", name: "Mesa 5", section: "Salon Principal", capacity: 2, shape: "square" },
  { id: "t-6", name: "Mesa 6 (Box VIP)", section: "Salon Principal", capacity: 6, shape: "square" },
  
  { id: "b-1", name: "Barra 1", section: "Barra Alta", capacity: 1, shape: "bar" },
  { id: "b-2", name: "Barra 2", section: "Barra Alta", capacity: 1, shape: "bar" },
  { id: "b-3", name: "Barra 3", section: "Barra Alta", capacity: 1, shape: "bar" },

  { id: "tr-1", name: "Terraza 1", section: "Terraza Exterior", capacity: 4, shape: "round" },
  { id: "tr-2", name: "Terraza 2", section: "Terraza Exterior", capacity: 2, shape: "round" },
  { id: "tr-3", name: "Terraza 3", section: "Terraza Exterior", capacity: 4, shape: "square" },
  { id: "tr-4", name: "Terraza 4", section: "Terraza Exterior", capacity: 6, shape: "square" },
];

export default function SalonMap({
  orders,
  activeBookings,
  onSelectTableForOrder,
  onShowNotification
}: SalonMapProps) {
  const [selectedSection, setSelectedSection] = useState<string>("Todos");
  const [activeModalTable, setActiveModalTable] = useState<TableDefinition | null>(null);

  // Match active orders to tables
  const activeOrdersByTable = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach(o => {
      if (o.type === "Mesa" && o.status !== "Completado" && o.tableNumber) {
        const key = o.tableNumber.trim().toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(o);
      }
    });
    return map;
  }, [orders]);

  // Match active reservations to tables
  const activeBookingsByTable = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    activeBookings.forEach(b => {
      if (b.tableName) {
        const key = b.tableName.trim().toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(b);
      }
    });
    return map;
  }, [activeBookings]);

  const filteredTables = useMemo(() => {
    if (selectedSection === "Todos") return DEFAULT_TABLES;
    return DEFAULT_TABLES.filter(t => t.section === selectedSection);
  }, [selectedSection]);

  const getTableStatus = (table: TableDefinition) => {
    const key = table.name.trim().toLowerCase();
    const activeOrders = activeOrdersByTable[key] || [];
    const activeReser = activeBookingsByTable[key] || [];

    if (activeOrders.length > 0) {
      return { status: "Occupied", orders: activeOrders, label: "Ocupada", color: "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810]" };
    }
    if (activeReser.length > 0) {
      return { status: "Reserved", reservations: activeReser, label: "Reservada", color: "bg-amber-100 text-amber-900 border-amber-300 font-bold" };
    }
    return { status: "Available", label: "Libre", color: "bg-emerald-50 text-emerald-900 border-emerald-300" };
  };

  return (
    <motion.div
      key="salon-map-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Control Operativo de Salón</span>
          <h2 className="font-serif text-2xl font-bold text-[#2C1810] mt-0.5">📌 Plano de Mesas y Estado en Vivo</h2>
          <p className="text-xs text-[#2C1810]/60 italic mt-1">
            Gestión táctil de mesas para meseros y recepción. Seleccione una mesa para abrir comanda o consultar consumo.
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2C1810] text-[#FDFBF7]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C2956E]"></span>
            <span>Ocupada</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Reservada</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#2C1810]/10 pb-3">
        {["Todos", "Salon Principal", "Barra Alta", "Terraza Exterior"].map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedSection === sec
                ? "bg-[#2C1810] text-white shadow-xs"
                : "bg-white text-[#2C1810]/70 hover:bg-[#2C1810]/5 border border-[#2C1810]/10"
            }`}
          >
            {sec === "Todos" ? "🏬 Todas las Áreas" : sec}
          </button>
        ))}
      </div>

      {/* 2D Interactive Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredTables.map((table) => {
          const info = getTableStatus(table);
          const hasOrders = info.status === "Occupied" && info.orders;
          const tableTotal = hasOrders ? info.orders!.reduce((sum, o) => sum + o.total, 0) : 0;
          const totalItemsCount = hasOrders ? info.orders!.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0) : 0;

          return (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveModalTable(table);
              }}
              className={`p-5 rounded-3xl border-2 shadow-xs cursor-pointer flex flex-col justify-between transition-all min-h-[160px] relative overflow-hidden ${info.color}`}
            >
              {/* Badge Top */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-75 font-mono">
                  {table.section}
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                  info.status === "Occupied" ? "bg-[#C2956E] text-[#2C1810]" : info.status === "Reserved" ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-950"
                }`}>
                  {info.label}
                </span>
              </div>

              {/* Center Content */}
              <div>
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5 shrink-0" />
                  <h3 className="font-serif font-bold text-lg leading-tight">{table.name}</h3>
                </div>
                <span className="text-[11px] opacity-75 block mt-1 flex items-center gap-1 font-medium">
                  <Users className="h-3.5 w-3.5 inline" /> Capacidad: {table.capacity} personas
                </span>
              </div>

              {/* Bottom Info */}
              <div className="mt-4 pt-3 border-t border-current/15 flex justify-between items-center">
                {info.status === "Occupied" ? (
                  <>
                    <span className="text-[10px] font-bold opacity-80">{totalItemsCount} productos pedíos</span>
                    <span className="font-serif font-black text-base font-mono">${tableTotal.toLocaleString("es-AR")}</span>
                  </>
                ) : info.status === "Reserved" ? (
                  <span className="text-[10px] font-bold opacity-90 truncate italic">
                    Cliente: {info.reservations![0].customerName}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Tomar Pedido
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Detail for Table */}
      <AnimatePresence>
        {activeModalTable && (() => {
          const info = getTableStatus(activeModalTable);
          const tableOrders = info.orders || [];
          const tableResers = info.reservations || [];

          return (
            <div className="fixed inset-0 bg-[#2C1810]/70 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#FDFBF7] border border-[#2C1810]/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5"
              >
                <div className="flex justify-between items-start border-b border-[#2C1810]/10 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#C2956E] tracking-widest">{activeModalTable.section}</span>
                    <h3 className="font-serif text-2xl font-bold text-[#2C1810]">{activeModalTable.name}</h3>
                  </div>
                  <button
                    onClick={() => setActiveModalTable(null)}
                    className="p-1 rounded-full text-[#2C1810]/50 hover:bg-[#2C1810]/10"
                  >
                    ✕
                  </button>
                </div>

                {/* Status details */}
                {info.status === "Occupied" ? (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                      <span className="text-xs font-bold text-[#2C1810] block">Mesa en Servicio Activo</span>
                      <p className="text-[11px] text-[#2C1810]/70 italic mt-0.5">Hay {tableOrders.length} comanda(s) asociadas a esta mesa.</p>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {tableOrders.map((ord) => (
                        <div key={ord.id} className="bg-white border border-[#2C1810]/10 rounded-2xl p-3 text-xs space-y-2">
                          <div className="flex justify-between font-bold text-[#2C1810]">
                            <span>Comanda #{ord.id.slice(-4)}</span>
                            <span className="font-mono">${ord.total.toLocaleString("es-AR")}</span>
                          </div>
                          <div className="space-y-1">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[11px] text-[#2C1810]/70">
                                <span>{it.quantity}x {it.name}</span>
                                <span>${(it.price * it.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          onSelectTableForOrder(activeModalTable.name);
                          setActiveModalTable(null);
                          onShowNotification(`📝 Asignada '${activeModalTable.name}' a la bolsa de pedido.`, "info");
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-[#2C1810] text-white text-xs font-bold hover:bg-[#3d2217] transition-all cursor-pointer"
                      >
                        ➕ Agregar Consumo
                      </button>
                      <button
                        onClick={() => setActiveModalTable(null)}
                        className="py-2.5 px-4 rounded-xl border border-[#2C1810]/20 text-xs font-bold text-[#2C1810] hover:bg-[#2C1810]/5 cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : info.status === "Reserved" ? (
                  <div className="space-y-4">
                    <div className="bg-amber-100 border border-amber-300 p-4 rounded-2xl space-y-2 text-amber-950">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-700" />
                        <h4 className="font-bold text-xs">Reserva Asignada</h4>
                      </div>
                      <p className="text-xs">
                        <strong>Cliente:</strong> {tableResers[0].customerName}<br />
                        <strong>Teléfono:</strong> {tableResers[0].customerPhone}<br />
                        <strong>Horario:</strong> {tableResers[0].timeSlot}<br />
                        <strong>Comensales:</strong> {tableResers[0].guests} personas
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectTableForOrder(activeModalTable.name);
                        setActiveModalTable(null);
                        onShowNotification(`☕ Abriendo comanda para reserva de ${tableResers[0].customerName}`, "success");
                      }}
                      className="w-full py-3 rounded-xl bg-[#2C1810] text-white text-xs font-bold hover:bg-[#3d2217] transition-all cursor-pointer"
                    >
                      Abrir Comanda para Mesa Reservada
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-[#2C1810]/70 italic">
                      La mesa está completamente libre para asignar a nuevos clientes.
                    </p>
                    <button
                      onClick={() => {
                        onSelectTableForOrder(activeModalTable.name);
                        setActiveModalTable(null);
                        onShowNotification(`✨ '${activeModalTable.name}' seleccionada para el pedido actual.`, "success");
                      }}
                      className="w-full py-3 rounded-xl bg-[#2C1810] text-white text-xs font-bold hover:bg-[#3d2217] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" /> Asignar Pedido a esta Mesa
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
