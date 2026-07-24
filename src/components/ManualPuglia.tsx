import React, { useState } from "react";
import { BookOpen, Shield, ShieldAlert, DollarSign, Calculator, Percent, Layers, Landmark, AlertTriangle, CheckCircle, Info, UserCheck, Clock, Award, BarChart3, TrendingUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ManualPuglia() {
  const [activeSection, setActiveSection] = useState<string>("contexto");

  // State for pricing calculator
  const [ingCost, setIngCost] = useState<number>(100);

  // State for banking distribution simulator
  const [ventasDigitales, setVentasDigitales] = useState<number>(12000);
  const [costosOperativos, setCostosOperativos] = useState<number>(8500);

  // State for Tip calculator
  const [totalPropinas, setTotalPropinas] = useState<number>(3500);
  const [empleadosPropinas, setEmpleadosPropinas] = useState<number>(5);

  // State for Profit Sharing calculator
  const [ventasSemestrales, setVentasSemestrales] = useState<number>(80000);
  const [gananciaNeta, setGananciaNeta] = useState<number>(18000);
  const [horasTotales, setHorasTotales] = useState<number>(4500);
  const [horasEmpleado, setHorasEmpleado] = useState<number>(900);
  const [antiguedadEmpleado, setAntiguedadEmpleado] = useState<number>(8); // months

  // Calculation helpers
  const calculatedPrice = ingCost * 1.70;
  
  const excedenteNeto = Math.max(0, ventasDigitales - costosOperativos);
  const cuentaMantenimiento = excedenteNeto * 0.40;
  const cuentaInversion = excedenteNeto * 0.60;

  const propinaPorEmpleado = empleadosPropinas > 0 ? totalPropinas / empleadosPropinas : 0;

  // Profit sharing calculations
  const URM = ventasSemestrales * 0.06; // 6% floor
  const superaSueldos = gananciaNeta > URM;
  const pozoProfitSharing = superaSueldos ? (gananciaNeta - URM) * 0.10 : 0;
  const parteEquitativaTotal = pozoProfitSharing * 0.50;
  const parteProporcionalTotal = pozoProfitSharing * 0.50;
  
  // Simulated team size of 6-month+ employees
  const totalEmpleadosAptos = 4; 
  const miEquitativo = pozoProfitSharing > 0 ? parteEquitativaTotal / totalEmpleadosAptos : 0;
  const miProporcional = (horasTotales > 0 && pozoProfitSharing > 0) ? (horasEmpleado / horasTotales) * parteProporcionalTotal : 0;
  const miRepartoTotal = antiguedadEmpleado >= 6 ? miEquitativo + miProporcional : 0;

  const sections = [
    { id: "contexto", label: "Identidad y Marca", icon: BookOpen },
    { id: "gobierno", label: "Gobierno Interno", icon: Shield },
    { id: "financiero", label: "Económico-Financiero", icon: Landmark },
    { id: "software", label: "Protocolos de Software", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Title Header */}
      <div className="mb-10 text-center">
        <span className="text-[10px] font-bold tracking-widest text-caramel uppercase block mb-2">Documento de Referencia Operativa</span>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#FDFBF7] sm:text-5xl italic">Resto Bar Del Teatro</h1>
        <p className="mx-auto mt-2 max-w-2xl text-[#FDFBF7]/70 text-sm leading-relaxed italic font-medium">
          Manual Operativo y Protocolos Institucionales de Ingeniería de Procesos.
          <span className="block font-bold text-[#D4AF37] not-italic text-xs mt-1">Uso Interno y Obligatorio para todos los Miembros del Equipo</span>
          <span className="block text-[10px] text-[#FDFBF7]/50 mt-0.5">Constitución 944, Río Cuarto, Provincia de Córdoba, Argentina</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex w-full items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left shadow-xs cursor-pointer border ${
                  isActive
                    ? "bg-espresso text-paper border-espresso"
                    : "bg-white text-espresso/80 border-coffee/30 hover:border-caramel hover:text-espresso"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-caramel" : "text-espresso/45"}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Viewer Area */}
        <div className="lg:col-span-9">
          <div className="rounded-3xl border border-coffee bg-white p-6 md:p-8 shadow-md min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeSection === "contexto" && (
                <motion.div
                  key="context"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-coffee/20 pb-4">
                    <h2 className="font-serif text-2xl font-bold text-espresso italic">El Espíritu de Café Puglia</h2>
                    <p className="text-[10px] text-espresso/50 uppercase font-semibold mt-1">Identidad de Marca e Historial Familiar</p>
                  </div>

                  <p className="text-xs text-espresso/80 leading-relaxed">
                    Café Puglia nace como un emprendimiento familiar en honor a la hospitalidad, la bonhomía, la calidez y la alegría con que <strong>Julio Puglia</strong> (nacido y criado en Rauch, interior de la Provincia de Buenos Aires) eligió vivir su vida. 
                  </p>
                  
                  <p className="text-xs text-espresso/80 leading-relaxed italic">
                    "No pretendemos ser iguales a nadie; buscamos la excelencia en agasajar a quienes nos visiten, combinando solemnidad, elegancia moderna y descontractura en un ambiente de estilo ecléctico."
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    <div className="p-5 rounded-2xl bg-paper/30 border border-coffee/40">
                      <h4 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <TrendingUp className="h-4.5 w-4.5 text-caramel" />
                        Nuestra Misión
                      </h4>
                      <p className="text-[11px] text-espresso/70 mt-2 leading-relaxed">
                        Recibir al comensal en la puerta y transformar su visita en un lugar apacible de encuentro, sosiego, trabajo o inspiración donde sienta que las horas no pasan.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-paper/30 border border-coffee/40">
                      <h4 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <BookOpen className="h-4.5 w-4.5 text-caramel" />
                        Nuestra Visión
                      </h4>
                      <p className="text-[11px] text-espresso/70 mt-2 leading-relaxed">
                        Transmitir a nuestros Huéspedes la devoción por el Café de Especialidad de Excelencia, educando sobre su historia, métodos de tostado, molienda, filtrado y degustación.
                      </p>
                    </div>
                  </div>

                  {/* Critical Value Box - Formal Treat Rule */}
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                    <h4 className="font-bold text-xs flex items-center gap-2 text-amber-900">
                      <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0" />
                      VALOR FUNDAMENTAL INNEGOCIABLE: Trato Respetuoso ("Usted")
                    </h4>
                    <p className="text-[11px] leading-relaxed">
                      La calidez humana de cada miembro del equipo resulta más importante que la calidad de los productos de nuestra carta. El trato con los Huéspedes debe ser <strong>absolutamente respetuoso</strong>, utilizando siempre el <strong>"Ud."</strong> y omitiendo de forma tajante tuteos o modismos informales (como <em>"Hola"</em>, <em>"chicos"</em>, <em>"vos"</em> u <em>"OK"</em>).
                    </p>
                  </div>
                </motion.div>
              )}

              {activeSection === "gobierno" && (
                <motion.div
                  key="government"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-coffee/20 pb-4">
                    <h2 className="font-serif text-2xl font-bold text-espresso italic">Sección I: Protocolo de Gobierno Interno</h2>
                    <p className="text-[10px] text-espresso/50 uppercase font-semibold mt-1">Estructura, Asistencia, Uniformes y Capacitaciones</p>
                  </div>

                  {/* Areas Cards */}
                  <div>
                    <h3 className="font-serif font-bold text-sm text-espresso mb-3">Art. 1: Áreas de Trabajo y Estructura Organizativa</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { title: "Área de Atención al Huésped", desc: "Mostrador, Caja, Stock de Salón y Mozos. Supervisado por el Maître/Maestro.", color: "border-coffee" },
                        { title: "Área de Cocina y Pastelería", desc: "Cocina, Pastelería, Bacha, Insumos y Reposición. Supervisado por el Chef/Jefe.", color: "border-coffee" },
                        { title: "Área de Limpieza y Mantenimiento", desc: "Tareas de higienización interna (propia) y externa (personal tercerizado).", color: "border-coffee" },
                        { title: "Despacho Rápido y Eventos", desc: "Take Away, Coffee Raves, actividades académicas y festejos extraordinarios.", color: "border-coffee" }
                      ].map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${item.color} bg-paper/10`}>
                          <h4 className="font-bold text-espresso text-xs mb-1">{item.title}</h4>
                          <p className="text-[10px] text-espresso/70 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Rule Warning */}
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs">
                    <span className="font-bold block text-red-800 uppercase tracking-wide mb-1">Regla de Seguridad Física Innegociable (Art. 1 ter)</span>
                    Queda absolutamente prohibido el ingreso de personas ajenas al equipo a los sectores de <strong>Caja, Mostrador, Barista y Cocina</strong>. La autorización de ingreso no permitida por parte de un colaborador será causal inmediata de rescisión de la relación laboral.
                  </div>

                  {/* Hiring and Attendance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <h4 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <UserCheck className="h-4.5 w-4.5 text-caramel" />
                        Requisitos de Ingreso (Art. 2)
                      </h4>
                      <ul className="list-disc pl-4 text-[11px] text-espresso/70 space-y-1">
                        <li>Ser mayor de edad o estar legalmente emancipado.</li>
                        <li>Título Secundario formal (o constancia en trámite).</li>
                        <li>Certificado de Manipulación de Alimentos vigente.</li>
                        <li><strong>Estética:</strong> Sin tatuajes visibles en el rostro ni expansores/abridores.</li>
                        <li>Libreta Sanitaria con chequeos y Examen Médico Preocupacional completo.</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <Clock className="h-4.5 w-4.5 text-caramel" />
                        Asistencia y Puntualidad (Art. 3)
                      </h4>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        Tolerancia máxima de <strong>15 minutos</strong> para el ingreso. Superar este margen descuenta automáticamente el <strong>Adicional por Presentismo (10% del básico)</strong>.
                      </p>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        Acumular 4 inasistencias injustificadas o 4 apercibimientos escritos en un año faculta a la rescisión contractual. Las notificaciones por WhatsApp corporativo o correo son válidas y vinculantes.
                      </p>
                    </div>
                  </div>

                  {/* Uniforms & Training */}
                  <div className="border-t border-coffee/20 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-serif font-bold text-sm text-espresso">Uniformes (Art. 4)</h4>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        Es de uso obligatorio el uniforme provisto por la dirección. Asistir sin el uniforme completo inhabilitará al empleado para prestar servicio esa jornada, perdiendo el presentismo y descontándose el día.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-serif font-bold text-sm text-espresso">Reuniones y Capacitación (Art. 5)</h4>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        Reuniones de Gestión Semanales son obligatorias y grabadas. Las capacitaciones externas son <strong>cofinanciadas (50% a cargo de la empresa)</strong>. El descuento por cuotas al empleado no puede superar el 10% del sueldo neto, y no se permite disolver el vínculo manteniendo saldos deudores de capacitación.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === "financiero" && (
                <motion.div
                  key="financial"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-coffee/20 pb-4">
                    <h2 className="font-serif text-2xl font-bold text-espresso italic">Sección II: Protocolo Político y Económico-Financiero</h2>
                    <p className="text-[10px] text-espresso/50 uppercase font-semibold mt-1">Margen, Pérdidas, Flujo de Caja y Cuentas de Consumo</p>
                  </div>

                  {/* Costing Rule and Price Calculator */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-3">
                      <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <Calculator className="h-4.5 w-4.5 text-caramel" />
                        Art. 6: Determinación de Precios de Venta
                      </h3>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        El precio de venta se calcula de manera rigurosa aplicando un <strong>margen mínimo del 70%</strong> sobre los ingredientes netos según receta. No se computan costos indirectos como el alquiler o los sueldos en esta fórmula.
                      </p>
                      <div className="p-3 bg-paper/20 rounded-xl border border-coffee/40 font-mono text-center text-xs">
                        Precio de Venta = Costo de Ingredientes × 1.70
                      </div>
                    </div>

                    {/* Pricing Calculator Widget */}
                    <div className="p-5 rounded-2xl bg-stone-50 border border-coffee/50 space-y-3">
                      <h4 className="font-bold text-xs text-espresso uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="h-4 w-4 text-caramel" />
                        Simulador de Precios Puglia
                      </h4>
                      <div>
                        <label className="text-[10px] font-bold text-espresso/60 block mb-1">Costo de Materia Prima (Ingredientes)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-espresso/50">$</span>
                          <input
                            type="number"
                            value={ingCost}
                            onChange={(e) => setIngCost(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full pl-7 pr-3 py-1.5 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-coffee/30 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-espresso/50 uppercase">Precio de Venta Sugerido:</span>
                        <span className="text-sm font-extrabold text-caramel font-serif">${calculatedPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock control Concept ( FIFO / Waste ) */}
                  <div className="border-t border-coffee/20 pt-4">
                    <h3 className="font-serif font-bold text-sm text-espresso mb-2">Art. 7: Control de Pérdidas</h3>
                    <p className="text-[11px] text-espresso/70 leading-relaxed mb-3">
                      Se diferencian la <strong>Merma</strong> (pérdida inevitable de volumen en cocción/calibración) del <strong>Desperdicio</strong> (pérdidas totales por mala planificación o roturas, con una meta operativa estricta inferior al <strong>3% de Waste Ratio</strong>). Se aplica estrictamente el sistema FIFO (First In - First Out) y la reconversión de merma a subproductos (por ejemplo croissants viejos convertidos en budín de pan).
                    </p>
                  </div>

                  {/* Bank Accounts Distribution Flowchart and Simulator */}
                  <div className="border-t border-coffee/20 pt-4 space-y-4">
                    <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-caramel" />
                      Art. 8: Estructura Financiera de 4 Cuentas
                    </h3>
                    <p className="text-[11px] text-espresso/70 leading-relaxed">
                      Para garantizar el orden fiscal, Café Puglia centraliza cobros y distribuye el excedente (luego de pagar Proveedores, Alquiler, Sueldos, Créditos e Impuestos en la Cuenta 1) a las cuentas específicas:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                      {/* Financial Simulator Widget */}
                      <div className="md:col-span-5 p-5 rounded-2xl bg-stone-50 border border-coffee/50 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="font-bold text-xs text-espresso uppercase tracking-wider flex items-center gap-1.5 mb-3">
                            <Layers className="h-4 w-4 text-caramel" />
                            Simulador de Distribución
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[9px] font-bold text-espresso/60 block mb-0.5">Ingreso por Ventas (Cuenta 1)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-espresso/50">$</span>
                                <input
                                  type="number"
                                  value={ventasDigitales}
                                  onChange={(e) => setVentasDigitales(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full pl-6 pr-3 py-1 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-espresso/60 block mb-0.5">Costos Operativos Obligatorios</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-espresso/50">$</span>
                                <input
                                  type="number"
                                  value={costosOperativos}
                                  onChange={(e) => setCostosOperativos(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full pl-6 pr-3 py-1 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-coffee/30 space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-espresso/60 font-semibold">Excedente Neto:</span>
                            <span className="font-bold text-espresso">${excedenteNeto.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-indigo-700">
                            <span className="font-semibold">Mantenimiento (40%):</span>
                            <span className="font-extrabold">${cuentaMantenimiento.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span className="font-semibold">Inversión (60%):</span>
                            <span className="font-extrabold">${cuentaInversion.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Flow diagram */}
                      <div className="md:col-span-7 p-5 bg-paper/10 border border-coffee/40 rounded-2xl flex flex-col justify-between">
                        <div className="space-y-3.5 text-[10px]">
                          {/* Step 1: Cuenta General */}
                          <div className="p-2 border border-coffee bg-white rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="h-5 w-5 bg-espresso text-caramel rounded-full flex items-center justify-center font-bold">1</span>
                              <span className="font-bold text-espresso">Cuenta General 1 (Operativa)</span>
                            </div>
                            <span className="font-mono text-espresso font-bold">${ventasDigitales.toFixed(2)}</span>
                          </div>

                          {/* Arrow down */}
                          <div className="h-4 flex items-center justify-center">
                            <span className="text-espresso/40">⬇️ Pago de Alquiler, Proveedores y Sueldos (${costosOperativos.toFixed(2)})</span>
                          </div>

                          {/* Excedente */}
                          <div className="p-2 bg-espresso text-paper rounded-xl flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-caramel">Excedente Neto Recalculado</span>
                            <span className="font-mono font-bold">${excedenteNeto.toFixed(2)}</span>
                          </div>

                          {/* Split branches */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 border border-indigo-200 bg-indigo-50/50 rounded-xl text-center">
                              <span className="text-indigo-900 font-bold block">Cuenta 2 (Mantenimiento)</span>
                              <span className="text-[9px] text-indigo-900/60 block mt-0.5">40% para máquinas y local</span>
                              <span className="font-mono font-extrabold text-indigo-900 block mt-1">${cuentaMantenimiento.toFixed(2)}</span>
                            </div>
                            
                            <div className="p-2.5 border border-emerald-200 bg-emerald-50/50 rounded-xl text-center">
                              <span className="text-emerald-900 font-bold block">Cuenta 3 (Inversión)</span>
                              <span className="text-[9px] text-emerald-900/60 block mt-0.5">60% capital indisponible</span>
                              <span className="font-mono font-extrabold text-emerald-900 block mt-1">${cuentaInversion.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="p-2 border border-stone-200 bg-white rounded-xl text-center">
                            <span className="font-bold text-espresso block">Cuenta 4 (Sueldo del Dueño)</span>
                            <span className="text-[9px] text-espresso/60 block mt-0.5">Sueldo neto establecido por la Dirección</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Finance Rules */}
                    <div className="p-4 rounded-xl border border-coffee/30 bg-paper/20 text-xs leading-relaxed space-y-2">
                      <p>
                        🚫 <strong>Prohibición de Cuentas Corrientes (Art. 9):</strong> Café Puglia opera de manera profesional. Quedan absolutamente prohibidas las cuentas corrientes ("fiado") o descuentos para amigos, familiares o miembros de la dirección. Todo consumo debe ser abonado de forma inmediata al precio completo de la carta vigente.
                      </p>
                      <p>
                        💳 <strong>Regla de Liquidez Comercial:</strong> Durante los primeros doce meses, la empresa no utilizará tarjetas de crédito corporativas ni cheques físicos. Los instrumentos de crédito se limitarán exclusivamente al formato de <strong>E-Cheques</strong>.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === "software" && (
                <motion.div
                  key="software"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-coffee/20 pb-4">
                    <h2 className="font-serif text-2xl font-bold text-espresso italic">Sección III: Protocolos Operativos y Requisitos de Software</h2>
                    <p className="text-[10px] text-espresso/50 uppercase font-semibold mt-1">Automatizaciones, Trazabilidad, Propinas y Control de Stock</p>
                  </div>

                  {/* 1. Barista y Trazabilidad */}
                  <div>
                    <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                      <CheckCircle className="h-4.5 w-4.5 text-caramel shrink-0" />
                      1. Panel del Barista y Ficha de Calibración
                    </h3>
                    <p className="text-[11px] text-espresso/70 leading-relaxed mt-1">
                      El software exige de manera <strong>obligatoria</strong> completar la Planilla de Calibración al inicio del turno y ante cambios climáticos drásticos (gr. de café, ml. de bebida, tiempo y temperatura). Al facturar, el sistema asocia e imprime de forma automática la <strong>Tarjeta de Trazabilidad</strong> con los datos del grano y finca para entregar al Huésped.
                    </p>
                  </div>

                  {/* 2. Propinas Digitales */}
                  <div className="border-t border-coffee/20 pt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    <div className="md:col-span-7 space-y-2">
                      <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                        <Award className="h-4.5 w-4.5 text-caramel shrink-0" />
                        2. Módulo de Gestión de Propinas Virtuales
                      </h3>
                      <p className="text-[11px] text-espresso/70 leading-relaxed">
                        Queda prohibido exponer QRs de cobros individuales para mozos. Las propinas digitales se cargan en la adición y se derivan automáticamente a una cuenta colectiva que devenga intereses (Fondo de Propinas). Cada viernes al cierre, el sistema divide el acumulado en <strong>partes exactamente iguales</strong> entre todos los colaboradores activos (incluso francos o licencias).
                      </p>
                    </div>

                    {/* Tip Calculator Widget */}
                    <div className="md:col-span-5 p-4 rounded-xl bg-stone-50 border border-coffee/50 space-y-2">
                      <h4 className="font-bold text-[10px] text-espresso uppercase tracking-wider">Simulador de Reparto</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-espresso/50 block">Pozo Acumulado ($)</label>
                          <input
                            type="number"
                            value={totalPropinas}
                            onChange={(e) => setTotalPropinas(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-2 py-1 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-espresso/50 block">Empleados Activos</label>
                          <input
                            type="number"
                            value={empleadosPropinas}
                            onChange={(e) => setEmpleadosPropinas(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-coffee/30 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-espresso/60">Pago Individual:</span>
                        <span className="font-extrabold text-caramel">${propinaPorEmpleado.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Profit-Sharing Semestral */}
                  <div className="border-t border-coffee/20 pt-4 space-y-4">
                    <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-caramel shrink-0" />
                      3. Profit-Sharing Semestral (Marzo y Septiembre)
                    </h3>
                    <p className="text-[11px] text-espresso/70 leading-relaxed">
                      Distribución semestral del <strong>10% neto</strong> del excedente financiero que supere el **Umbral de Rentabilidad Mínima (URM)** fijado en un **6% de las ventas semestrales brutas**.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                      {/* Profit Sharing Simulator */}
                      <div className="md:col-span-6 p-4 rounded-xl bg-stone-50 border border-coffee/50 space-y-3 text-[10px]">
                        <h4 className="font-bold text-[9px] text-espresso uppercase tracking-wider">Simulador de Utilidades</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-espresso/60">Ventas Semestrales ($)</label>
                            <input
                              type="number"
                              value={ventasSemestrales}
                              onChange={(e) => setVentasSemestrales(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-2 py-0.5 border border-coffee bg-white rounded-md font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                          
                          <div>
                            <label className="font-semibold text-espresso/60">Ganancia Neta ($)</label>
                            <input
                              type="number"
                              value={gananciaNeta}
                              onChange={(e) => setGananciaNeta(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-2 py-0.5 border border-coffee bg-white rounded-md font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="font-semibold text-espresso/50">Horas Totales Equipo</label>
                            <input
                              type="number"
                              value={horasTotales}
                              onChange={(e) => setHorasTotales(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-1.5 py-0.5 border border-coffee bg-white rounded-md font-mono focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-espresso/50">Mis Horas Semestrales</label>
                            <input
                              type="number"
                              value={horasEmpleado}
                              onChange={(e) => setHorasEmpleado(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full px-1.5 py-0.5 border border-coffee bg-white rounded-md font-mono focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-espresso/50">Antigüedad (Meses)</label>
                            <input
                              type="number"
                              value={antiguedadEmpleado}
                              onChange={(e) => setAntiguedadEmpleado(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full px-1.5 py-0.5 border border-coffee bg-white rounded-md font-mono focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Calculated values summary */}
                        <div className="pt-2.5 border-t border-coffee/20 space-y-1 font-semibold">
                          <div className="flex justify-between">
                            <span>Umbral de Rentabilidad Mínima (URM 6%):</span>
                            <span>${URM.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Supera Umbral:</span>
                            <span className={superaSueldos ? "text-emerald-700" : "text-red-700"}>{superaSueldos ? "Sí (Se reparte)" : "No"}</span>
                          </div>
                          <div className="flex justify-between text-indigo-700">
                            <span>Fondo Total a Repartir (10%):</span>
                            <span>${pozoProfitSharing.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Result of simulation */}
                      <div className="md:col-span-6 p-4 rounded-xl bg-paper/10 border border-coffee/40 flex flex-col justify-between text-xs">
                        <div className="space-y-3">
                          <h4 className="font-bold text-espresso text-xs border-b border-coffee/20 pb-1">Tu Retribución Estimada</h4>
                          
                          {antiguedadEmpleado < 6 ? (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[10px]">
                              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                              <p className="leading-normal">
                                <strong>Antigüedad insuficiente:</strong> Debe poseer al menos 6 meses de servicio para calificar en el profit-sharing.
                              </p>
                            </div>
                          ) : !superaSueldos ? (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[10px]">
                              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                              <p className="leading-normal">
                                <strong>Sin pozo excedente:</strong> La ganancia del semestre no superó el URM del 6% bruto. No se reparten utilidades.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 text-[10px] leading-relaxed">
                              <div className="flex justify-between border-b border-coffee/10 pb-1.5">
                                <span>1. Parte Equitativa (50% del pozo / 4 emp.):</span>
                                <span className="font-mono font-bold">${miEquitativo.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-b border-coffee/10 pb-1.5">
                                <span>2. Parte Proporcional por Horas ({((horasEmpleado/horasTotales)*100).toFixed(1)}%):</span>
                                <span className="font-mono font-bold">${miProporcional.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-xs pt-1">
                                <span className="text-espresso">MI PAGO TOTAL ESTIMADO:</span>
                                <span className="text-caramel font-serif">${miRepartoTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-[9px] text-espresso/50 leading-tight italic pt-4">
                          * Nota: Se reserva además un fondo del <strong>3% del margen semestral (BOC)</strong> sujeto a KPIs colectivos de reducción de desperdicio y ticket promedio.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Control de Stock y Alertas */}
                  <div className="border-t border-coffee/20 pt-4 space-y-3">
                    <h3 className="font-serif font-bold text-sm text-espresso flex items-center gap-1.5">
                      <AlertTriangle className="h-4.5 w-4.5 text-caramel shrink-0" />
                      4. Módulo Avanzado de Stock e Inventario (Alertas Semafóricas)
                    </h3>
                    <p className="text-[11px] text-espresso/70 leading-relaxed">
                      El inventario gestiona 13 categorías bajo alertas semafóricas automáticas. El punto crítico (Alerta Roja) se calcula automáticamente para cubrir exactamente <strong>7 días de producción</strong>, bloqueando comandas en salón y enviando órdenes de compra urgentes:
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse border border-coffee/20">
                        <thead>
                          <tr className="bg-espresso text-paper">
                            <th className="p-2 border border-coffee/20">Semáforo</th>
                            <th className="p-2 border border-coffee/20">Significado Operativo</th>
                            <th className="p-2 border border-coffee/20">Acción Requerida</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          <tr>
                            <td className="p-2 border border-coffee/20 font-bold text-emerald-700">🟢 Verde</td>
                            <td className="p-2 border border-coffee/20">Nivel de stock óptimo para producción regular.</td>
                            <td className="p-2 border border-coffee/20">Monitoreo pasivo habitual.</td>
                          </tr>
                          <tr className="bg-amber-50/30">
                            <td className="p-2 border border-coffee/20 font-bold text-amber-700">🟡 Amarillo</td>
                            <td className="p-2 border border-coffee/20">Inventario en zona de revisión preventiva.</td>
                            <td className="p-2 border border-coffee/20">Pre-alerta e inclusión en compra de los viernes.</td>
                          </tr>
                          <tr className="bg-red-50/30">
                            <td className="p-2 border border-coffee/20 font-bold text-red-700">🔴 Rojo</td>
                            <td className="p-2 border border-coffee/20">Stock crítico (para cubrir 7 días de consumo).</td>
                            <td className="p-2 border border-coffee/20">Bloqueo de comanda al llegar a cero y OC inmediata.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-espresso/70 leading-relaxed">
                      <strong>Doble Control e Ingreso de Insumos:</strong> Escaneo por código de barras. Cotejo físico de remito vs orden digital. En caso de discrepancias, el Encargado de Caja "testa" o tacha digitalmente el insumo dañado antes del conforme.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
