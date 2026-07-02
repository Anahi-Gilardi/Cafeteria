import { useState, useMemo, FormEvent } from "react";
import { TABLES_DATA } from "../data/menu";
import { Table, BookingTimeSlot, Reservation } from "../types";
import { Calendar, Clock, Users, MapPin, Check, Phone, User, Landmark, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TableReservationProps {
  onConfirmReservation: (reservation: Reservation) => void;
}

export default function TableReservation({ onConfirmReservation }: TableReservationProps) {
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

  // Create mock unavailable tables based on seed dates/slots to make it realistic
  const unavailableTableIds = useMemo(() => {
    // Generate pseudorandom reserved tables based on the date length and time slot length
    const combinedSeed = selectedDate + selectedTimeSlot;
    let sum = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      sum += combinedSeed.charCodeAt(i);
    }
    
    // Select 2 or 3 random tables to block
    const blocked: string[] = [];
    const tables = TABLES_DATA;
    
    // Simple deterministic random values
    const index1 = sum % tables.length;
    const index2 = (sum + 3) % tables.length;
    
    blocked.push(tables[index1].id);
    if (index1 !== index2) {
      blocked.push(tables[index2].id);
    }
    
    // Also block based on guest capacity
    // If guests are more than the table capacity, it's implicitly unavailable
    tables.forEach(t => {
      if (t.capacity < selectedGuests && !blocked.includes(t.id)) {
        blocked.push(t.id);
      }
    });

    return blocked;
  }, [selectedDate, selectedTimeSlot, selectedGuests]);

  // Selected Table Details
  const selectedTable = useMemo(() => {
    return TABLES_DATA.find(t => t.id === selectedTableId) || null;
  }, [selectedTableId]);

  // Handle reserve submission
  const handleSubmitBooking = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedTableId) {
      setFormError("Por favor, selecciona una mesa en el plano interactivo.");
      return;
    }
    if (!customerName.trim()) {
      setFormError("Por favor, ingrese su nombre para la reserva.");
      return;
    }
    if (!customerPhone.trim()) {
      setFormError("Por favor, ingrese un teléfono de contacto.");
      return;
    }

    const matchedTable = TABLES_DATA.find(t => t.id === selectedTableId)!;
    
    // Generate a unique reference
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let ref = "REF-";
    for (let i = 0; i < 6; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const booking: Reservation = {
      id: "res-" + Date.now(),
      tableId: selectedTableId,
      tableName: matchedTable.name,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      guests: selectedGuests,
      customerName,
      customerPhone,
      createdAt: new Date().toISOString(),
      referenceCode: ref
    };

    onConfirmReservation(booking);
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-extrabold tracking-tight text-espresso sm:text-5xl italic">Reserve su Mesa</h1>
        <p className="mx-auto mt-3 max-w-2xl text-espresso/70">
          Elija el ambiente ideal para su café, reunión o almuerzo relajado. Reserva de forma gratuita e instantánea.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isBooked ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
            {/* Step 1: Filters & Details (Left Sidebar) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-coffee bg-white p-6 shadow-xs">
                <h3 className="font-serif text-xl font-bold text-espresso mb-5 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-caramel" /> 1. Cuándo y Quiénes
                </h3>

                <form className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Fecha</label>
                    <div className="relative">
                      <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-espresso/40" />
                      <input
                        type="date"
                        id="booking-date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedTableId(null); // Reset selected table
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full rounded-xl border border-coffee bg-paper/50 py-2.5 pr-4 pl-10 text-sm font-semibold text-espresso outline-none focus:border-caramel focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Time Slot */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Turno del Día</label>
                    <div className="grid grid-cols-2 gap-2">
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
                            id={`timeslot-${slot.id.replace(/\s+/g, "-")}`}
                            onClick={() => {
                              setSelectedTimeSlot(slot.id as BookingTimeSlot);
                              setSelectedTableId(null); // Reset
                            }}
                            className={`flex flex-col p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isSel
                                ? "border-caramel bg-caramel/10 text-espresso font-bold"
                                : "border-coffee/40 bg-white text-espresso/60 hover:border-caramel/40"
                            }`}
                          >
                            <span className="text-xs font-bold">{slot.label}</span>
                            <span className="text-[10px] text-espresso/45 leading-none mt-0.5">{slot.time}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guests */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Personas</label>
                    <div className="flex items-center space-x-1.5 rounded-xl bg-coffee/20 p-1">
                      {[1, 2, 4, 6].map((num) => (
                        <button
                          type="button"
                          key={num}
                          id={`guests-btn-${num}`}
                          onClick={() => {
                            setSelectedGuests(num);
                            setSelectedTableId(null); // Reset
                          }}
                          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedGuests === num
                              ? "bg-espresso text-paper shadow-xs"
                              : "text-espresso/50 hover:text-espresso"
                          }`}
                        >
                          {num === 1 ? "1p" : num === 2 ? "2p" : num === 4 ? "4p" : "6p+"}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              {/* Table details popup (if selected) */}
              <AnimatePresence>
                {selectedTable && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-2xl border border-caramel bg-caramel/5 p-5 space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-md bg-espresso text-paper shadow-xs">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <h4 className="font-serif text-lg font-bold text-espresso">{selectedTable.name}</h4>
                    </div>
                    <p className="text-xs text-espresso/70 leading-relaxed italic">
                      {selectedTable.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-espresso/50 font-medium">
                      <span>Capacidad máx: {selectedTable.capacity} personas</span>
                      <span className="capitalize text-caramel font-bold">{selectedTable.type}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 2: Interactive Map Floor Plan (Center/Right) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-coffee bg-paper/30 p-6 flex flex-col items-stretch">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-espresso flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-caramel" /> 2. Elija su Mesa en el Plano
                    </h3>
                    <p className="text-xs text-espresso/60">Haga clic sobre una mesa verde (disponible) para seleccionarla.</p>
                  </div>

                  {/* Color Legend */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-espresso/70">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-emerald-100 border-2 border-emerald-600" />
                      <span>Disponible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-caramel/20 border-2 border-caramel" />
                      <span>Selección</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-espresso/10 border border-coffee/40" />
                      <span>Ocupada</span>
                    </div>
                  </div>
                </div>

                {/* Physical Grid representation container */}
                <div className="relative w-full aspect-16/10 rounded-2xl border border-coffee bg-paper/10 p-4 md:p-6 shadow-inner flex flex-col justify-between overflow-hidden" style={{ minHeight: "340px" }}>
                  {/* Decorative Background grid elements */}
                  <div className="absolute top-0 inset-x-0 h-5 border-b border-coffee flex items-center justify-center text-[10px] text-paper/70 font-bold tracking-[0.15em] bg-espresso uppercase font-serif">
                    ACERA / VENTANALES GRANDES CON VISTA DE CALLE
                  </div>

                  {/* The Floor Arena */}
                  <div className="flex-1 relative my-6">
                    {/* Bar Counter Area */}
                    <div className="absolute right-0 top-10 bottom-10 w-20 border-l-4 border-coffee bg-paper flex flex-col justify-center items-center shadow-md">
                      <span className="font-serif text-xs font-bold text-espresso rotate-90 my-2">BARRA ESPRESSO</span>
                      <span className="font-mono text-[9px] text-espresso/40 rotate-90 tracking-widest uppercase">Baristas</span>
                    </div>

                    {/* Entrance Sign */}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-2.5 w-16 bg-caramel rounded-t flex items-center justify-center text-[8px] text-white font-bold tracking-widest uppercase">
                      ENTRADA
                    </div>

                    {/* Bookshelf Rincón de Lectura */}
                    <div className="absolute left-0 bottom-4 w-5 h-20 border-r-4 border-caramel bg-espresso flex flex-col justify-center items-center shadow-xs">
                      <span className="text-[8px] text-paper/80 rotate-270 font-semibold tracking-wider font-serif">BIBLIOTECA</span>
                    </div>

                    {/* Map Tables Placement */}
                    {TABLES_DATA.map((table) => {
                      const isUnavailable = unavailableTableIds.includes(table.id);
                      const isSelected = selectedTableId === table.id;
                      
                      let btnClasses = "";
                      if (isUnavailable) {
                        btnClasses = "bg-espresso/5 border-coffee text-espresso/30 cursor-not-allowed";
                      } else if (isSelected) {
                        btnClasses = "bg-caramel/20 border-caramel text-espresso scale-105 shadow-md shadow-caramel/10 z-10 font-bold";
                      } else {
                        btnClasses = "bg-emerald-50 border-emerald-500 hover:bg-emerald-100 text-emerald-950 hover:scale-103 cursor-pointer";
                      }

                      return (
                        <button
                          type="button"
                          key={table.id}
                          id={`table-map-node-${table.id}`}
                          disabled={isUnavailable}
                          onClick={() => setSelectedTableId(table.id)}
                          style={{
                            left: `${table.coordX}%`,
                            top: `${table.coordY}%`,
                            transform: "translate(-50%, -50%)"
                          }}
                          className={`absolute flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 select-none ${btnClasses} ${
                            table.capacity >= 6 ? "w-28 h-20" : table.capacity >= 4 ? "w-24 h-16" : "w-16 h-16"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                            {table.type === "window" ? "🪟" : table.type === "sofa" ? "🛋️" : table.type === "bar" ? "☕" : table.type === "reading" ? "📚" : "🏡"}
                          </span>
                          <span className="text-xs font-bold truncate max-w-full leading-tight mt-0.5">{table.name.replace("Mesa ", "M ")}</span>
                          <span className="text-[9px] opacity-75">{table.capacity}p</span>
                          
                          {/* Selected Checkmark overlay */}
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-caramel text-white ring-2 ring-white">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center text-[10px] text-espresso/40 font-bold uppercase tracking-widest border-t border-coffee pt-1.5 font-serif">
                    Jardín / Patio Trasero de Plantas Aromáticas
                  </div>
                </div>
              </div>

              {/* Step 3: Customer Details Form */}
              <div className="rounded-2xl border border-coffee bg-white p-6 shadow-xs">
                <h3 className="font-serif text-xl font-bold text-espresso mb-5 flex items-center gap-2">
                  <User className="h-5 w-5 text-caramel" /> 3. Detalles de Contacto
                </h3>

                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-espresso/40" />
                        <input
                          type="text"
                          id="booking-name-input"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ingrese su nombre"
                          className="w-full rounded-xl border border-coffee bg-paper/35 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-caramel focus:bg-white text-espresso font-medium"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Teléfono Móvil</label>
                      <div className="relative">
                        <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-espresso/40" />
                        <input
                          type="tel"
                          id="booking-phone-input"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. +54 221 123 4567"
                          className="w-full rounded-xl border border-coffee bg-paper/35 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-caramel focus:bg-white text-espresso font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{formError}</p>
                  )}

                  <div className="pt-4 border-t border-coffee flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-xs text-espresso/60 leading-snug">
                      {selectedTable ? (
                        <>
                          Reservando: <strong className="text-espresso font-bold">{selectedTable.name}</strong> para {selectedGuests} personas el {selectedDate} ({selectedTimeSlot}).
                        </>
                      ) : (
                        "Selecciona una mesa en el plano de arriba para continuar."
                      )}
                    </div>
                    <button
                      type="submit"
                      id="confirm-booking-submit-btn"
                      className={`rounded-full px-8 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer ${
                        selectedTableId 
                          ? "bg-espresso hover:bg-caramel" 
                          : "bg-espresso/15 border border-coffee/30 text-espresso/35 cursor-not-allowed"
                      }`}
                      disabled={!selectedTableId}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Confirmar Reserva Gratis</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
                <span>Ubicación: Calle 50 nro 600, La Plata</span>
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
