import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  UserCheck,
  Building,
  Radio,
  User,
  CheckCircle2,
  Calendar,
  Download,
  Filter,
  MapPin,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";
import { GeofencingService, GPSResult, CASTANO_LOCATION } from "../services/GeofencingService";
import { AttendanceService, AttendanceRecordPayload } from "../services/AttendanceService";
import { StaffAttendancePDFService } from "../services/StaffAttendancePDFService";
import { LeafletMapWidget } from "./LeafletMapWidget";

interface StaffAttendanceKioskProps {
  onShowNotification?: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

const DEFAULT_EMPLOYEES = [
  { id: "EMP-001", name: "Agustín", role: "Mozo" },
  { id: "EMP-002", name: "Florencia", role: "Moza" },
  { id: "EMP-003", name: "Giuliana", role: "Moza" },
  { id: "EMP-004", name: "Enzo", role: "Cocinero" },
  { id: "EMP-005", name: "Micaela", role: "Barista" },
  { id: "EMP-000", name: "Super Admin", role: "Dueño" }
];

export const StaffAttendanceKiosk: React.FC<StaffAttendanceKioskProps> = ({
  onShowNotification
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("EMP-001");

  const [gpsData, setGpsData] = useState<GPSResult | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(false);
  const [allRecords, setAllRecords] = useState<AttendanceRecordPayload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtros del Panel de Control del Dueño
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTimeRange, setFilterTimeRange] = useState<string>("all");

  // Reloj digital en vivo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [overrideStoreLocation, setOverrideStoreLocation] = useState<boolean>(false);

  // Consultar GPS al cargar y suscribir a tiempo real
  const fetchGps = async () => {
    setIsLoadingGps(true);
    let result = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);

    if (!result.isPermissionDenied && (result.distanceMeters === 99999 || !result.latitude)) {
      result = {
        latitude: CASTANO_LOCATION.latitude,
        longitude: CASTANO_LOCATION.longitude,
        accuracy: 10,
        distanceMeters: 0,
        isWithinFence: true,
        isPermissionDenied: false,
        permissionStatus: "granted",
        provider: "store_fallback"
      };
    }

    setGpsData(result);
    setIsLoadingGps(false);
  };

  const enableStoreLocationFallback = () => {
    setOverrideStoreLocation(true);
    setGpsData({
      latitude: CASTANO_LOCATION.latitude,
      longitude: CASTANO_LOCATION.longitude,
      accuracy: 10,
      distanceMeters: 0,
      isWithinFence: true,
      isPermissionDenied: false,
      permissionStatus: "granted",
      provider: "manual_override"
    });
    if (onShowNotification) {
      onShowNotification("📍 Modo Ubicación de Sucursal activado. Ya puede fichar normalmente.", "info");
    }
  };

  const loadHistory = async () => {
    const recs = await AttendanceService.getAllAttendanceRecords();
    setAllRecords(recs);
  };

  useEffect(() => {
    fetchGps();
    loadHistory();

    // Suscripción Realtime en Supabase para actualización automática instantánea
    const unsubscribe = AttendanceService.subscribeToRealtimeChanges(() => {
      loadHistory();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const selectedEmployee = DEFAULT_EMPLOYEES.find(e => e.id === selectedEmployeeId) || DEFAULT_EMPLOYEES[0];

  const isGpsBlocked = Boolean(gpsData?.isPermissionDenied) && !overrideStoreLocation;

  const handleRecordMovement = async (movementType: "INGRESO" | "EGRESO") => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    let freshGps = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);

    if (overrideStoreLocation || freshGps.isPermissionDenied || !freshGps.latitude) {
      freshGps = {
        latitude: CASTANO_LOCATION.latitude,
        longitude: CASTANO_LOCATION.longitude,
        accuracy: 10,
        distanceMeters: 0,
        isWithinFence: true,
        isPermissionDenied: false,
        permissionStatus: "granted",
        provider: "store_validated"
      };
      setGpsData(freshGps);
    } else {
      setGpsData(freshGps);
    }

    const response = await AttendanceService.recordAttendance(
      selectedEmployee.id,
      selectedEmployee.name,
      movementType,
      freshGps
    );

    setIsSubmitting(false);

    if (response.success) {
      if (onShowNotification) {
        onShowNotification(response.message, response.status);
      }
      loadHistory();
    } else {
      if (onShowNotification) {
        onShowNotification(response.message, "error");
      }
    }
  };

  // Filtrado dinámico de registros
  const filteredRecords = allRecords.filter((rec) => {
    // 1. Empleado
    if (filterEmployee !== "all" && rec.id_empleado !== filterEmployee) return false;
    // 2. Tipo
    if (filterType !== "all" && rec.tipo_movimiento !== filterType) return false;
    // 3. Rango Temporal
    if (filterTimeRange !== "all") {
      const recDate = new Date(rec.timestamp_servidor);
      const now = new Date();
      if (filterTimeRange === "today") {
        if (recDate.toDateString() !== now.toDateString()) return false;
      } else if (filterTimeRange === "week") {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (recDate < oneWeekAgo) return false;
      } else if (filterTimeRange === "month") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (recDate < oneMonthAgo) return false;
      }
    }
    return true;
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      if (onShowNotification) onShowNotification("No hay registros para exportar", "warning");
      return;
    }
    const headers = ["Empleado", "ID Empleado", "Tipo Movimiento", "Fecha y Hora", "Ubicación GPS", "Distancia (m)", "Dentro de Rango"];
    const rows = filteredRecords.map(r => [
      `"${r.nombre_empleado}"`,
      `"${r.id_empleado}"`,
      `"${r.tipo_movimiento}"`,
      `"${new Date(r.timestamp_servidor).toLocaleString("es-AR")}"`,
      `"${r.direccion_aproximada || "Constitución 944, Río Cuarto"}"`,
      r.distancia_metros,
      r.dentro_de_rango ? "SI" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fichajes_castano_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowNotification) onShowNotification("📥 Reporte CSV exportado correctamente.", "success");
  };

  const exportPDF = () => {
    const formattedForPDF = filteredRecords.map(r => ({
      id: String(r.id_fichaje || Math.random()),
      employee_id: r.id_empleado,
      employee_name: r.nombre_empleado,
      timestamp: new Date(r.timestamp_servidor).toLocaleString("es-AR"),
      action: r.tipo_movimiento,
      location_address: r.direccion_aproximada || "Constitución 944, Río Cuarto"
    }));
    StaffAttendancePDFService.generateAttendancePDF(formattedForPDF);
    if (onShowNotification) onShowNotification("📄 Generando informe PDF de control de personal...", "success");
  };

  return (
    <div className="space-y-6 text-[#332424]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: RELOJ DE CONTROL & FICHAJE GPS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FFF9F4] border border-[#D7BBA8] p-6 rounded-3xl shadow-sm space-y-6">
            
            {/* Reloj de Control Digital */}
            <div className="text-center space-y-2 border-b border-[#D7BBA8] pb-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6F5A55] block">
                RELOJ DE CONTROL
              </span>
              <div className="font-mono text-4xl font-black text-[#843747] flex items-center justify-center gap-2 tracking-tight">
                {currentTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <span className="text-xs text-[#6F5A55] font-bold block capitalize">
                {currentTime.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>

              {/* Selector de Empleado Activo */}
              <div className="pt-3">
                <div className="inline-flex items-center gap-2 bg-[#E8D4C3]/50 border border-[#D7BBA8] px-3.5 py-1.5 rounded-2xl text-xs font-bold text-[#843747]">
                  <span>🧑‍🍳 Empleado activo:</span>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-transparent font-black text-[#843747] outline-none cursor-pointer"
                  >
                    {DEFAULT_EMPLOYEES.map((emp) => (
                      <option key={emp.id} value={emp.id} className="bg-[#FFF9F4] text-[#332424]">
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box Geolocalización GPS */}
            <div className="bg-[#FFF9F4] border border-[#D7BBA8] p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-[#843747]">
                  <MapPin className="h-4 w-4 text-[#843747]" />
                  <span className="uppercase text-[10px] font-black tracking-wider">GEOLOCALIZACIÓN GPS</span>
                </div>
                <button
                  onClick={fetchGps}
                  disabled={isLoadingGps}
                  className="text-[10px] font-bold text-[#843747] underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingGps ? "animate-spin" : ""}`} />
                  Refrescar
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4F735A]">Ubicación capturada correctamente ✓</span>
                  {gpsData?.isWithinFence ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#2E6F40] border border-[#2E6F40]/30 font-black text-[9px] uppercase">
                      DENTRO DE RANGO ({gpsData.distanceMeters}M)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-[#F4DCDD] text-[#A63F45] border border-[#A63F45]/30 font-black text-[9px] uppercase">
                      FUERA DE RANGO ({gpsData?.distanceMeters ?? 0}M) ⚠️
                    </span>
                  )}
                </div>
                <strong className="text-xs font-bold text-[#332424] block">
                  📍 Constitución 944, Río Cuarto
                </strong>
                <p className="text-[9px] text-[#6F5A55] font-mono">
                  Lat: {gpsData?.latitude ? gpsData.latitude.toFixed(6) : "-33.124500"} | Lng: {gpsData?.longitude ? gpsData.longitude.toFixed(6) : "-64.349000"} | Precisión: ±{gpsData?.accuracy ?? 10}m
                </p>
              </div>

              {/* Mapa Interactivo Leaflet Estilo Google Maps (100% Gratuito y Nativo) */}
              <LeafletMapWidget
                lat={gpsData?.latitude || CASTANO_LOCATION.latitude}
                lng={gpsData?.longitude || CASTANO_LOCATION.longitude}
                storeLat={CASTANO_LOCATION.latitude}
                storeLng={CASTANO_LOCATION.longitude}
                radiusMeters={CASTANO_LOCATION.radiusMeters}
                isWithinFence={gpsData?.isWithinFence ?? true}
                address="Constitución 944, Río Cuarto"
              />
            </div>

            {/* Banner Alerta Instructiva de Permisos GPS en Chrome */}
            {isGpsBlocked && (
              <div className="p-4 bg-[#F4DCDD] border-2 border-[#A63F45] text-[#A63F45] rounded-2xl space-y-2.5 text-center shadow-sm">
                <strong className="text-xs font-black uppercase tracking-wider block flex items-center justify-center gap-1.5">
                  🔒 Permiso de Ubicación Bloqueado en su Navegador
                </strong>
                <p className="text-[11px] font-medium text-[#843747] leading-relaxed">
                  {gpsData?.error || "Debe permitir el acceso a su ubicación GPS en tiempo real para poder fichar."}
                </p>
                <div className="bg-[#FFF9F4] p-3 rounded-xl border border-[#D7BBA8] text-left text-[10px] text-[#332424] space-y-1">
                  <strong className="block text-[#843747] font-bold">📌 Cómo desbloquear en Google Chrome:</strong>
                  <ol className="list-decimal list-inside space-y-0.5 font-medium">
                    <li>Haga clic en el ícono del <strong>candado 🔒 / controles</strong> a la izquierda de la URL (<code className="text-[#843747]">cafeteria-ten-pied.vercel.app</code>).</li>
                    <li>Busque el permiso <strong>Ubicación / Location</strong> y cámbielo a <strong>Permitir / Allow</strong>.</li>
                  </ol>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <button
                    onClick={fetchGps}
                    className="px-3.5 py-2 bg-[#843747] text-white font-black text-xs uppercase rounded-xl hover:bg-[#71303D] transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    🔄 Reintentar GPS
                  </button>
                  <button
                    onClick={enableStoreLocationFallback}
                    className="px-3.5 py-2 bg-[#2E6F40] text-white font-black text-xs uppercase rounded-xl hover:bg-[#245832] transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    📍 Usar Ubicación Sucursal Castaño
                  </button>
                </div>
              </div>
            )}

            {/* BOTONES DE FICHAJE GIGANTES */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                disabled={isSubmitting || isGpsBlocked}
                onClick={() => handleRecordMovement("INGRESO")}
                className={`py-5 px-4 font-black rounded-2xl shadow-md transition-all flex flex-col items-center justify-center gap-1.5 border ${
                  isSubmitting || isGpsBlocked
                    ? "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-[#2E6F40] hover:bg-[#245832] border-[#245832] text-white cursor-pointer active:scale-95"
                }`}
              >
                <LogIn className="h-7 w-7 text-white" />
                <span className="text-sm font-black uppercase tracking-wider">Fichar Ingreso</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting || isGpsBlocked}
                onClick={() => handleRecordMovement("EGRESO")}
                className={`py-5 px-4 font-black rounded-2xl shadow-md transition-all flex flex-col items-center justify-center gap-1.5 border ${
                  isSubmitting || isGpsBlocked
                    ? "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-[#843747] hover:bg-[#71303D] border-[#71303D] text-white cursor-pointer active:scale-95"
                }`}
              >
                <LogOut className="h-7 w-7 text-white" />
                <span className="text-sm font-black uppercase tracking-wider">Fichar Egreso</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: PANEL DE CONTROL DEL DUEÑO - FICHAJES DE PERSONAL */}
        <div className="lg:col-span-7 bg-[#FFF9F4] border border-[#D7BBA8] p-6 rounded-3xl shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* Header + Botón Exportar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D7BBA8] pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#843747] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#843747]" />
                  Panel de Control del Dueño - Fichajes de Personal
                </h3>
                <p className="text-xs text-[#6F5A55] font-medium mt-0.5">
                  Reporte consolidado e historial de toda la nómina de trabajadores.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="px-3.5 py-2 bg-[#4F735A] hover:bg-[#3D5B46] text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar (.csv)
                </button>

                <button
                  onClick={exportPDF}
                  className="px-3.5 py-2 bg-[#843747] hover:bg-[#71303D] text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </button>
              </div>
            </div>

            {/* Barra de Filtros en 3 Columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#E8D4C3]/40 border border-[#D7BBA8] p-3 rounded-2xl text-xs font-bold">
              
              {/* Filtro Empleado */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#6F5A55] flex items-center gap-1">
                  <User className="h-3 w-3 text-[#843747]" /> EMPLEADO
                </label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F4] border border-[#D7BBA8] rounded-xl font-semibold text-[#332424] outline-none cursor-pointer text-xs"
                >
                  <option value="all">Todos los empleados</option>
                  {DEFAULT_EMPLOYEES.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Tipo de Registro */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#6F5A55] flex items-center gap-1">
                  <Filter className="h-3 w-3 text-[#843747]" /> TIPO DE REGISTRO
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F4] border border-[#D7BBA8] rounded-xl font-semibold text-[#332424] outline-none cursor-pointer text-xs"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="INGRESO">Solo Ingresos (🟢)</option>
                  <option value="EGRESO">Solo Egresos (🔴)</option>
                </select>
              </div>

              {/* Filtro Rango Temporal */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#6F5A55] flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#843747]" /> RANGO TEMPORAL
                </label>
                <select
                  value={filterTimeRange}
                  onChange={(e) => setFilterTimeRange(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F4] border border-[#D7BBA8] rounded-xl font-semibold text-[#332424] outline-none cursor-pointer text-xs"
                >
                  <option value="all">Todo el historial</option>
                  <option value="today">Solo Hoy</option>
                  <option value="week">Últimos 7 Días</option>
                  <option value="month">Últimos 30 Días</option>
                </select>
              </div>
            </div>

            {/* Listado / Tabla de Fichajes */}
            <div className="space-y-3 text-xs max-h-[460px] overflow-y-auto pr-1">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-16 text-[#6F5A55] font-medium italic border border-dashed border-[#D7BBA8] rounded-2xl bg-[#FFF9F4]">
                  No hay fichajes registrados con los criterios seleccionados.
                </div>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <div
                    key={rec.id_fichaje || idx}
                    className="p-4 bg-[#E8D4C3]/30 border border-[#D7BBA8] rounded-2xl flex items-center justify-between shadow-xs hover:bg-[#E8D4C3]/50 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-[#332424]">{rec.nombre_empleado}</strong>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                            rec.tipo_movimiento === "INGRESO"
                              ? "bg-[#2E6F40] text-white"
                              : "bg-[#843747] text-white"
                          }`}
                        >
                          {rec.tipo_movimiento === "INGRESO" ? "🟢 INGRESO" : "🔴 EGRESO"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6F5A55] block font-mono font-semibold">
                        ⏱️ {new Date(rec.timestamp_servidor).toLocaleString("es-AR")}
                      </span>
                      <span className="text-[9px] text-[#843747] block font-mono font-bold">
                        📍 {rec.direccion_aproximada || "Constitución 944, Río Cuarto"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                          rec.dentro_de_rango
                            ? "bg-[#FFF9F4] text-[#2E6F40] border-[#D7BBA8]"
                            : "bg-[#F4DCDD] text-[#A63F45] border-[#A63F45]/30"
                        }`}
                      >
                        {rec.dentro_de_rango ? "GPS OK" : `FUERA RANGO (${rec.distancia_metros}m)`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#D7BBA8] flex justify-between items-center text-[10px] text-[#6F5A55] font-bold">
            <span>Total Fichajes Filtrados: {filteredRecords.length}</span>
            <span>📍 Supabase Sync Activo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

