import { Reservation, Order, MenuItem } from "../types";
import { MENU_ITEMS } from "../data/menu";
import { Calendar, Trash2, ArrowRight, Table, Coffee, RefreshCw, ShoppingBag, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HistoryHubProps {
  bookings: Reservation[];
  orders: Order[];
  onCancelBooking: (bookingId: string) => void;
  onReorder: (orderItems: { name: string; quantity: number; customizationSummary: string }[]) => void;
  onViewTicket: (order: Order) => void;
}

export default function HistoryHub({ bookings, orders, onCancelBooking, onReorder, onViewTicket }: HistoryHubProps) {
  
  const handleReorderClick = (order: Order) => {
    // Find the item records by name
    const orderItemsForReordering = order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      customizationSummary: item.customizationSummary
    }));
    
    onReorder(orderItemsForReordering);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Table Reservations History */}
      <section>
        <div className="border-b border-coffee/40 pb-4 mb-6">
          <h2 className="font-serif text-2xl font-bold text-espresso flex items-center gap-2 italic">
            <Table className="h-6 w-6 text-caramel" /> Reservas de Mesa Activas
          </h2>
          <p className="text-xs text-espresso/60 mt-1 italic">Aquí verás los detalles de tus reservas de mesa guardadas.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-coffee py-10 text-center bg-white/40">
            <Calendar className="h-8 w-8 text-espresso/40 mx-auto mb-2" />
            <p className="text-espresso/60 text-sm font-medium italic">No tienes reservas activas por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((booking) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                key={booking.id}
                className="rounded-2xl border border-coffee bg-white p-5 flex flex-col justify-between shadow-xs relative overflow-hidden"
              >
                {/* Visual side accent */}
                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-caramel" />

                <div className="pl-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif font-bold text-espresso text-sm">{booking.tableName}</h4>
                      <p className="text-[10px] text-espresso/45 mt-0.5 italic">Mesa para {booking.guests} personas</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-espresso bg-caramel/10 px-2 py-0.5 rounded border border-caramel/20">
                      {booking.referenceCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-espresso/85 font-medium pt-2 border-t border-coffee/20">
                    <div>
                      <span className="text-[10px] text-espresso/50 block uppercase font-bold">Fecha</span>
                      <span>{booking.date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-espresso/50 block uppercase font-bold">Turno</span>
                      <span>{booking.timeSlot}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-coffee/20 flex justify-between items-center pl-2">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Confirmado
                  </span>
                  
                  <button
                    id={`cancel-booking-${booking.id}`}
                    onClick={() => onCancelBooking(booking.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-espresso/50 hover:text-rose-700 rounded-md hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Online Orders History */}
      <section>
        <div className="border-b border-coffee/40 pb-4 mb-6">
          <h2 className="font-serif text-2xl font-bold text-espresso flex items-center gap-2 italic">
            <Coffee className="h-6 w-6 text-caramel" /> Historial de Pedidos en Línea
          </h2>
          <p className="text-xs text-espresso/60 mt-1 italic">Revisa tus compras previas o duplica un pedido con un solo clic.</p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-coffee py-10 text-center bg-white/40">
            <ShoppingBag className="h-8 w-8 text-espresso/40 mx-auto mb-2" />
            <p className="text-espresso/60 text-sm font-medium italic">No has realizado ningún pedido todavía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={order.id}
                  className="rounded-2xl border border-coffee bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-mono font-bold text-espresso/70 bg-espresso/5 px-2 py-0.5 rounded border border-coffee">
                        #{order.id.substring(order.id.length - 8).toUpperCase()}
                      </span>
                      <span className="text-xs text-espresso/50 font-medium">{formattedDate}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        order.status === "Completado" ? "bg-emerald-700 text-white" : "bg-caramel text-white animate-pulse"
                      }`}>
                        {order.status === "Completado" ? "Entregado" : "En preparación"}
                      </span>
                    </div>

                    {/* Items brief */}
                    <div className="text-xs text-espresso/80 font-medium italic">
                      {order.items.map((item, idx) => (
                        <span key={idx}>
                          {item.quantity}x {item.name}
                          {idx < order.items.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>

                    {order.tableNumber && (
                      <p className="text-[10px] text-caramel font-bold italic">
                        Ubicación de entrega: {order.tableNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-coffee/20">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-espresso/50 block font-semibold uppercase">Total Pagado</span>
                      <span className="text-base font-extrabold text-espresso font-serif">${order.total.toFixed(2)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onViewTicket(order)}
                        className="flex items-center space-x-1.5 rounded-full border border-coffee px-4 py-2 text-xs font-bold text-espresso transition-all bg-white hover:bg-stone-50 shadow-xs hover:scale-101 cursor-pointer"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Ticket / Factura</span>
                      </button>

                      <button
                        id={`reorder-btn-${order.id}`}
                        onClick={() => handleReorderClick(order)}
                        className="flex items-center space-x-1.5 rounded-full bg-espresso px-4 py-2 text-xs font-bold text-paper transition-all hover:bg-caramel shadow-xs hover:scale-101 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Volver a Pedir</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
