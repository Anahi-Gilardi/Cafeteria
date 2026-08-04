import { useState, useMemo, useEffect, FormEvent } from "react";
import { Table, BookingTimeSlot, Reservation } from "../types";
import { Calendar, Clock, Users, MapPin, Check, Phone, User, Landmark, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface TableReservationProps {
  bookings: Reservation[];
  onConfirmReservation: (
    reservation: Reservation
  ) => void | boolean | Promise<void | boolean>;
}

export default function TableReservation({ bookings = [], onConfirmReservation }: TableReservationProps) {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    let active = true;
    supabase
      .from("restaurant_tables")
      .select("id,name,capacity")
      .eq("active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("No se pudieron cargar las mesas disponibles:", error.message);
          setTables([]);
          return;
        }
        const tableTypes: Table["type"][] = ["window", "sofa", "bar", "terrace", "reading"];
        setTables(
          (data || []).map((table, index) => ({
            id: table.id,
            name: table.name,
            capacity: Number(table.capacity),
            type: tableTypes[index % tableTypes.length],
            description: `Mesa de salón para ${table.capacity} comensales.`,
            coordX: 18 + (index % 4) * 18,
            coordY: 22 + Math.floor(index / 4) * 26,
            status: "Libre"
          }))
        );
      });
    return () => {
      active = false;
    };
  }, []);

  // Input states
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<BookingTimeSlot>("Tarde");
  const [selectedGuests, setSelectedGuests] = useState<number>(2);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Customer Details Form
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isBooked, setIsBooked] = useState<boolean>(false);
  const [recentBooking, setRecentBooking] = useState<Reservation | null>(null);

  // Form Validation
  const [formError, setFormError] = useState<string>("");

  // Determine unavailable tables based on actual bookings and guest capacity
  const unavailableTableIds = useMemo(() => {
    const blocked: string[] = [];
    
    // 1. Block tables that are already booked for the selected date & slot
    if (Array.isArray(bookings)) {
      bookings.forEach(b => {
        if (b.date === selectedDate && b.timeSlot === selectedTimeSlot && b.tableId) {
          if (!blocked.includes(b.tableId)) {
            blocked.push(b.tableId);
          }
        }
      });
    }
    
    // 2. Also block tables based on guest capacity
    if (tables.length > 0) {
      tables.forEach(t => {
        if (t.capacity < selectedGuests && !blocked.includes(t.id)) {
          blocked.push(t.id);
        }
      });
    }

    return blocked;
  }, [selectedDate, selectedTimeSlot, selectedGuests, bookings, tables]);

  // Selected Table Details
  const selectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || null;
  }, [selectedTableId, tables]);

  // Handle reserve submission
  const handleSubmitBooking = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim()) {
      setFormError("Por favor, ingrese su nombre para la reserva.");
      return;
    }
    if (!customerPhone.trim()) {
      setFormError("Por favor, ingrese un teléfono de contacto.");
      return;
    }

    const targetTableId = selectedTableId || (tables.length > 0 ? tables[0].id : "mesa_1");
    const matchedTable = tables.find(t => t.id === targetTableId);
    const tableName = matchedTable ? matchedTable.name : "Mesa de Salón";
    
    // Generate a unique reference
    const ref = `REF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const booking: Reservation = {
      id: "res-" + Date.now(),
      tableId: targetTableId,
      tableName: tableName,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      guests: selectedGuests,
      customerName,
      customerPhone,
      createdAt: new Date().toISOString(),
      referenceCode: ref
    };

    const result = await onConfirmReservation(booking);
    if (result === false) return;
    setRecentBooking(booking);
    setIsBooked(true);
  };

  const handleReset = () => {
    setSelectedTableId(null);
    setCustomerName("");
    setCustomerPhone("");
    setIsBooked(false);
    setRecentBooking(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#EBDAC5] block mb-1">Experiencia Gastronómica & Salón</span>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-white sm:text-4xl italic">Reserve su Mesa</h1>
        <p className="mx-auto mt-2 max-w-lg text-[#EBDAC5]/80 font-medium text-xs">
          Elija la fecha, turno y cantidad de personas para su reserva gratuita e instantánea.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isBooked ? (
          <form onSubmit={handleSubmitBooking} className="space-y-6">
            {/* Step 1: Cuándo y Quiénes */}
            <div className="rounded-3xl border border-[#CFB5A0]/40 bg-[#FAF2E6] p-6 shadow-xl text-[#2D0E13] space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#5C1D27] flex items-center gap-2 border-b border-[#CFB5A0] pb-3">
                <Clock className="h-5 w-5 text-[#5C1D27]" /> 1. Cuándo y Quiénes
              </h3>

              {/* Date Input */}
              <div>
                <label htmlFor="booking-date" className="text-xs font-bold uppercase tracking-wider text-[#5E393F] block mb-1.5 font-semibold">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5E393F]" />
                  <input
                    type="date"
                    id="booking-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-[#CFB5A0] bg-[#FAF2E6] py-2.5 pr-4 pl-10 text-sm font-semibold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              {/* Time Slot */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5E393F] block mb-1.5 font-semibold">Turno del Día</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "Desayuno", label: "Desayuno", time: "8:00 - 11:00" },
                    { id: "Media Mañana", label: "Brunch", time: "11:00 - 13:30" },
                    { id: "Almuerzo", label: "Almuerzo", time: "13:30 - 16:00" },
                    { id: "Tarde", label: "Merienda", time: "16:00 - 19:30" },
                    { id: "Cena", label: "Cena", time: "19:30 - 22:30" },
                  ].map((slot) => {
                    const isSel = selectedTimeSlot === slot.id;
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => setSelectedTimeSlot(slot.id as BookingTimeSlot)}
                        className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? "border-[#5C1D27] bg-[#5C1D27] text-white font-black shadow-xs"
                            : "border-[#CFB5A0] bg-white text-[#2D0E13] hover:bg-[#EBDAC5]"
                        }`}
                      >
                        <span className="text-xs font-bold">{slot.label}</span>
                        <span className={`text-[10px] leading-none mt-0.5 ${isSel ? "text-white/80" : "text-[#5E393F]"}`}>{slot.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label htmlFor="booking-guests-selector" className="text-xs font-bold uppercase tracking-wider text-[#5C1D27] block mb-1.5 font-semibold">Personas</label>
                <div id="booking-guests-selector" className="flex items-center space-x-1.5 rounded-xl bg-[#4A151D] p-1 border border-[#5C1D27]/30">
                  {[1, 2, 4, 6].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setSelectedGuests(num)}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedGuests === num
                          ? "bg-gradient-to-r from-[#EBDAC5] to-[#5C1D27] text-[#2D0E13] font-black shadow-sm"
                          : "text-[#FAF2E6]/70 hover:text-[#FAF2E6] bg-[#2D0E13]"
                      }`}
                    >
                      {num === 1 ? "1p" : num === 2 ? "2p" : num === 4 ? "4p" : "6p+"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Detalles de Contacto */}
            <div className="rounded-3xl border border-[#CFB5A0]/40 bg-[#FAF2E6] p-6 shadow-xl text-[#2D0E13] space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#5C1D27] flex items-center gap-2 border-b border-[#CFB5A0] pb-3">
                <User className="h-5 w-5 text-[#5C1D27]" /> 2. Detalles de Contacto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label htmlFor="booking-name-input" className="text-xs font-bold uppercase tracking-wider text-[#5C1D27] block mb-1.5 font-semibold">Nombre Completo *</label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5C1D27]" />
                    <input
                      type="text"
                      id="booking-name-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ingrese su nombre"
                      className="w-full rounded-xl border border-[#CFB5A0] bg-white py-2.5 pr-4 pl-10 text-sm font-semibold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="booking-phone-input" className="text-xs font-bold uppercase tracking-wider text-[#5C1D27] block mb-1.5 font-semibold">Teléfono Móvil *</label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5C1D27]" />
                    <input
                      type="tel"
                      id="booking-phone-input"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="ej: +54 358 504 2311"
                      className="w-full rounded-xl border border-[#CFB5A0] bg-white py-2.5 pr-4 pl-10 text-sm font-semibold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 p-2.5 rounded-lg">{formError}</p>
              )}

              <div className="pt-3 border-t border-[#CFB5A0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#5E393F] leading-snug font-medium">
                  Reservando para <strong className="text-[#5C1D27] font-bold">{selectedGuests} personas</strong> el <strong className="text-[#2D0E13] font-bold">{selectedDate}</strong> ({selectedTimeSlot}).
                </div>
                <button
                  type="submit"
                  id="confirm-booking-submit-btn"
                  className={`w-full sm:w-auto rounded-xl px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer ${
                    customerName.trim() && customerPhone.trim()
                      ? "bg-[#5C1D27] hover:bg-[#4A151D]"
                      : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                  disabled={!customerName.trim() || !customerPhone.trim()}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Confirmar Reserva Gratis</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* RESERVATION TICKET - SUCCESS SCREEN */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-xl text-center flex flex-col items-center"
          >
            {/* Ticket Graphic representation */}
            <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-coffee bg-white relative flex flex-col mt-6">
              {/* Top aesthetics card header */}
              <div className="bg-espresso text-paper px-8 py-7 flex flex-col items-center text-center relative">
                {/* Simulated half-holes on sides of ticket */}
                <div className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-paper border-r border-coffee" />
                <div className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-paper border-l border-coffee" />

                <div className="h-12 w-12 rounded-full bg-caramel/20 flex items-center justify-center text-caramel mb-3 shadow-inner">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </div>
                <h3 className="font-serif text-2xl font-bold tracking-tight">¡Mesa Confirmada!</h3>
                <p className="text-xs text-caramel mt-1 uppercase tracking-widest font-semibold leading-none">Reserva Guardada con éxito</p>
              </div>

              {/* Ticket details (Middle segment) */}
              <div className="px-8 py-8 space-y-6 flex-1 text-left relative bg-linear-to-b from-caramel/5 to-paper/30">
                {/* Simulated half-holes matching top */}
                <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-transparent" />
                <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-transparent" />

                <div className="flex justify-between items-start border-b border-dashed border-coffee pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block">Cliente</span>
                    <span className="text-base font-bold text-espresso">{recentBooking?.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block">Código</span>
                    <span className="text-base font-mono font-bold text-caramel bg-caramel/10 px-2.5 py-0.5 rounded-md border border-caramel/20">
                      {recentBooking?.referenceCode}
                    </span>
                  </div>
                </div>

                {/* Date & Time grids */}
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-coffee pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-caramel" /> Fecha
                    </span>
                    <span className="text-sm font-semibold text-espresso">{recentBooking?.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block flex items-center gap-1">
                      <Clock className="h-3 w-3 text-caramel" /> Turno / Horario
                    </span>
                    <span className="text-sm font-semibold text-espresso">{recentBooking?.timeSlot}</span>
                  </div>
                </div>

                {/* Table & Guests */}
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-coffee pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block flex items-center gap-1">
                      <Landmark className="h-3 w-3 text-caramel" /> Mesa Asignada
                    </span>
                    <span className="text-sm font-bold text-espresso">{recentBooking?.tableName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block flex items-center gap-1">
                      <Users className="h-3 w-3 text-caramel" /> Comensales
                    </span>
                    <span className="text-sm font-semibold text-espresso">{recentBooking?.guests} personas</span>
                  </div>
                </div>

                {/* Custom procedural SVG barcode style */}
                <div className="flex flex-col items-center justify-center pt-3 text-center">
                  <div className="bg-white border border-coffee rounded-lg p-2 flex flex-col items-center shadow-xs">
                    {/* Simulated SVG barcode */}
                    <svg className="w-56 h-10" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="1" width="1.5" height="18" fill="black" />
                      <rect x="5" y="1" width="0.7" height="18" fill="black" />
                      <rect x="7" y="1" width="2" height="18" fill="black" />
                      <rect x="11" y="1" width="0.5" height="18" fill="black" />
                      <rect x="13" y="1" width="1" height="18" fill="black" />
                      <rect x="16" y="1" width="2.5" height="18" fill="black" />
                      <rect x="20" y="1" width="0.6" height="18" fill="black" />
                      <rect x="22" y="1" width="1.8" height="18" fill="black" />
                      <rect x="26" y="1" width="0.7" height="18" fill="black" />
                      <rect x="28" y="1" width="2.2" height="18" fill="black" />
                      <rect x="31" y="1" width="1" height="18" fill="black" />
                      <rect x="34" y="1" width="0.5" height="18" fill="black" />
                      <rect x="36" y="1" width="2" height="18" fill="black" />
                      <rect x="40" y="1" width="1.5" height="18" fill="black" />
                      <rect x="43" y="1" width="0.7" height="18" fill="black" />
                      <rect x="46" y="1" width="1" height="18" fill="black" />
                      <rect x="49" y="1" width="2.2" height="18" fill="black" />
                      <rect x="53" y="1" width="0.5" height="18" fill="black" />
                      <rect x="55" y="1" width="1.8" height="18" fill="black" />
                      <rect x="58" y="1" width="2" height="18" fill="black" />
                      <rect x="62" y="1" width="0.8" height="18" fill="black" />
                      <rect x="64" y="1" width="1.5" height="18" fill="black" />
                      <rect x="67" y="1" width="2.3" height="18" fill="black" />
                      <rect x="71" y="1" width="0.5" height="18" fill="black" />
                      <rect x="73" y="1" width="1" height="18" fill="black" />
                      <rect x="76" y="1" width="2.1" height="18" fill="black" />
                      <rect x="79" y="1" width="0.6" height="18" fill="black" />
                      <rect x="81" y="1" width="1.5" height="18" fill="black" />
                      <rect x="84" y="1" width="2" height="18" fill="black" />
                      <rect x="87" y="1" width="0.5" height="18" fill="black" />
                      <rect x="89" y="1" width="2.5" height="18" fill="black" />
                      <rect x="93" y="1" width="1" height="18" fill="black" />
                      <rect x="96" y="1" width="2" height="18" fill="black" />
                    </svg>
                    <span className="text-[9px] font-mono tracking-widest text-espresso/40 mt-1">{recentBooking?.referenceCode}</span>
                  </div>
                  <p className="text-[10px] text-espresso/50 mt-3 max-w-xs leading-normal">
                    Presente este comprobante al llegar. Le guardaremos la mesa por un máximo de 15 minutos de cortesía sobre el turno elegido.
                  </p>
                </div>
              </div>

              {/* Ticket Footer details */}
              <div className="bg-paper border-t border-dashed border-coffee p-5 flex items-center justify-between text-xs text-espresso/60 font-medium">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Reserva Activa</span>
                </div>
                <span>Ubicación: consulte el domicilio publicado del comercio</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                id="reset-booking-btn"
                onClick={handleReset}
                className="rounded-full border border-coffee bg-white px-6 py-2.5 text-sm font-bold text-espresso shadow-xs hover:bg-paper cursor-pointer transition-all"
              >
                Hacer otra reserva
              </button>
              <button
                id="booking-done-btn"
                onClick={handleReset} 
                className="rounded-full bg-espresso px-6 py-2.5 text-sm font-bold text-paper shadow-md hover:bg-caramel cursor-pointer transition-all"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
