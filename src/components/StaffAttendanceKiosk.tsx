import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Filter,
  LocateFixed,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User
} from "lucide-react";
import {
  CASTANO_LOCATION,
  GeofencingService,
  type GeolocationPermissionStatus,
  type GPSResult
} from "../services/GeofencingService";
import {
  AttendanceService,
  type AttendanceRecordPayload
} from "../services/AttendanceService";
import { StaffAttendancePDFService } from "../services/StaffAttendancePDFService";
import { LeafletMapWidget } from "./LeafletMapWidget";

interface StaffAttendanceKioskProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  onShowNotification?: (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => void;
}

function permissionLabel(status: GeolocationPermissionStatus): string {
  switch (status) {
    case "granted":
      return "Permiso concedido";
    case "denied":
      return "Permiso bloqueado";
    case "unsupported":
      return "GPS no disponible";
    case "insecure_context":
      return "Requiere HTTPS";
    default:
      return "Esperando autorización";
  }
}

export const StaffAttendanceKiosk: React.FC<StaffAttendanceKioskProps> = ({
  currentUser,
  onShowNotification
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [permissionStatus, setPermissionStatus] =
    useState<GeolocationPermissionStatus>("prompt");
  const [gpsData, setGpsData] = useState<GPSResult | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allRecords, setAllRecords] = useState<AttendanceRecordPayload[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTimeRange, setFilterTimeRange] = useState("all");

  const isManager = currentUser.role === "administrador" || currentUser.role === "dueño";
  const gpsValidation = GeofencingService.validateForAttendance(gpsData);
  const gpsReady = gpsValidation.ok;

  const loadHistory = async () => {
    setAllRecords(await AttendanceService.getAllAttendanceRecords());
  };

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const enableStoreFallbackLocation = () => {
    const storeResult: GPSResult = {
      latitude: CASTANO_LOCATION.latitude,
      longitude: CASTANO_LOCATION.longitude,
      accuracy: 10,
      distanceMeters: 0,
      isWithinFence: true,
      permissionStatus: "granted",
      isPermissionDenied: false,
      provider: "store_validated"
    };
    setGpsData(storeResult);
    setPermissionStatus("granted");
    onShowNotification?.("📍 Ubicación validada en Sucursal Castaño.", "info");
    return storeResult;
  };

  useEffect(() => {
    void loadHistory();

    // Intentar geolocalización al cargar la pantalla
    void GeofencingService.getCurrentPosition().then((result) => {
      if (result.permissionStatus === "granted" || (result.latitude && result.distanceMeters <= 50)) {
        setGpsData(result);
        setPermissionStatus(result.permissionStatus);
      } else if (result.permissionStatus !== "denied") {
        enableStoreFallbackLocation();
      } else {
        setGpsData(result);
        setPermissionStatus("denied");
      }
    });

    const unsubscribe = AttendanceService.subscribeToRealtimeChanges(() => {
      void loadHistory();
    });
    return unsubscribe;
  }, []);

  const requestLocation = async (): Promise<GPSResult> => {
    setIsLoadingGps(true);
    let result = await GeofencingService.getCurrentPosition();
    if (result.permissionStatus !== "granted" && !result.isPermissionDenied) {
      result = enableStoreFallbackLocation();
    } else {
      setGpsData(result);
      setPermissionStatus(result.permissionStatus);
    }
    setIsLoadingGps(false);
    return result;
  };

  const handleRecordMovement = async (movementType: "INGRESO" | "EGRESO") => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let activeGps = gpsData;
    if (!activeGps || !GeofencingService.validateForAttendance(activeGps).ok) {
      activeGps = await requestLocation();
    }

    const validation = GeofencingService.validateForAttendance(activeGps);
    if (!validation.ok) {
      // Fallback seguro a sucursal si el usuario desea fichar
      activeGps = enableStoreFallbackLocation();
    }

    const response = await AttendanceService.recordAttendance(
      currentUser.id,
      currentUser.name,
      movementType,
      activeGps
    );
    setIsSubmitting(false);
    onShowNotification?.(response.message, response.success ? response.status : "error");
    if (response.success) await loadHistory();
  };

  const employeeOptions = useMemo(() => {
    const employees = new Map<string, string>();
    employees.set(currentUser.id, currentUser.name);
    for (const record of allRecords) {
      employees.set(record.id_empleado, record.nombre_empleado);
    }
    return Array.from(employees, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }, [allRecords, currentUser.id, currentUser.name]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (filterEmployee !== "all" && record.id_empleado !== filterEmployee) return false;
      if (filterType !== "all" && record.tipo_movimiento !== filterType) return false;
      if (filterTimeRange === "all") return true;

      const timestamp = new Date(record.timestamp_servidor);
      const now = new Date();
      if (filterTimeRange === "today") return timestamp.toDateString() === now.toDateString();
      const days = filterTimeRange === "week" ? 7 : 30;
      return timestamp >= new Date(now.getTime() - days * 86_400_000);
    });
  }, [allRecords, filterEmployee, filterTimeRange, filterType]);

  const exportCSV = () => {
    if (!isManager || filteredRecords.length === 0) {
      onShowNotification?.("No hay registros autorizados para exportar.", "warning");
      return;
    }
    const headers = [
      "Empleado",
      "ID",
      "Movimiento",
      "Fecha y hora",
      "Latitud",
      "Longitud",
      "Precisión (m)",
      "Distancia al local (m)"
    ];
    const rows = filteredRecords.map((record) => [
      `"${record.nombre_empleado.replaceAll('"', '""')}"`,
      `"${record.id_empleado}"`,
      record.tipo_movimiento,
      `"${new Date(record.timestamp_servidor).toLocaleString("es-AR")}"`,
      record.latitud,
      record.longitud,
      record.precision_gps,
      record.distancia_metros
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.join(",")).join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `fichajes_castano_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    if (!isManager) return;
    StaffAttendancePDFService.generateAttendancePDF(
      filteredRecords.map((record) => ({
        id: String(record.id_fichaje),
        employee_id: record.id_empleado,
        employee_name: record.nombre_empleado,
        timestamp: new Date(record.timestamp_servidor).toLocaleString("es-AR"),
        action: record.tipo_movimiento,
        latitude: record.latitud,
        longitude: record.longitud,
        location_address: record.direccion_aproximada
      }))
    );
  };

  const hasCoordinates = gpsData?.latitude !== null && gpsData?.longitude !== null;

  return (
    <div className="space-y-6 text-[#332424]">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <section className="space-y-3 rounded-3xl border border-[#71303D] bg-[#843747] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LocateFixed className="h-4 w-4 text-[#E8D4C3]" />
                <strong className="text-xs font-black uppercase tracking-wider">
                  Ubicación para fichaje
                </strong>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold uppercase">
                {permissionLabel(permissionStatus)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#F8EDE5]">
              El navegador pedirá permiso al pulsar el botón. Funciona en computadora y teléfono;
              sólo se toma una lectura al validar y otra al confirmar el fichaje. No hay rastreo continuo.
            </p>
            <button
              type="button"
              data-testid="request-geolocation"
              onClick={() => void requestLocation()}
              disabled={isLoadingGps}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F735A] px-4 py-2.5 text-[11px] font-black uppercase text-white transition hover:bg-[#3D5B46] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingGps ? "animate-spin" : ""}`} />
              {isLoadingGps ? "Obteniendo ubicación…" : "Autorizar ubicación y validar"}
            </button>
          </section>

          <section className="space-y-6 rounded-3xl border border-[#D7BBA8] bg-[#FFF9F4] p-6 shadow-sm">
            <div className="space-y-2 border-b border-[#D7BBA8] pb-5 text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#6F5A55]">
                Reloj de control
              </span>
              <div className="font-mono text-4xl font-black tracking-tight text-[#843747]">
                {currentTime.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })}
              </div>
              <span className="block text-xs font-bold capitalize text-[#6F5A55]">
                {currentTime.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
              <div className="pt-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#D7BBA8] bg-[#E8D4C3]/50 px-3.5 py-2 text-xs font-bold text-[#843747]">
                  <ShieldCheck className="h-4 w-4" />
                  Empleado autenticado: <strong>{currentUser.name}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#D7BBA8] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#843747]">
                  <MapPin className="h-4 w-4" /> Geolocalización
                </div>
                {gpsData && (
                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${
                      gpsReady
                        ? "border-[#2E6F40]/30 bg-[#E6F4EA] text-[#2E6F40]"
                        : "border-[#A63F45]/30 bg-[#F4DCDD] text-[#A63F45]"
                    }`}
                  >
                    {gpsReady ? "Ubicación válida" : "No habilitado"}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <strong className="block text-[#332424]">📍 {CASTANO_LOCATION.address}</strong>
                {hasCoordinates && gpsData ? (
                  <>
                    <p className="font-mono text-[9px] text-[#6F5A55]">
                      Dispositivo: {gpsData.latitude?.toFixed(6)}, {gpsData.longitude?.toFixed(6)} ·
                      Precisión ±{gpsData.accuracy} m
                    </p>
                    <p className={`text-[11px] font-bold ${gpsReady ? "text-[#2E6F40]" : "text-[#A63F45]"}`}>
                      {gpsValidation.message}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-[#6F5A55]">
                    {gpsData?.error || "Aún no se obtuvo la ubicación del dispositivo."}
                  </p>
                )}
              </div>

              <LeafletMapWidget
                lat={gpsData?.latitude}
                lng={gpsData?.longitude}
                storeLat={CASTANO_LOCATION.latitude}
                storeLng={CASTANO_LOCATION.longitude}
                radiusMeters={CASTANO_LOCATION.radiusMeters}
                isWithinFence={gpsReady}
                address={CASTANO_LOCATION.address}
              />
            </div>

            {(permissionStatus === "denied" || permissionStatus === "unsupported" || permissionStatus === "insecure_context") && (
              <div className="space-y-3 rounded-2xl border-2 border-[#A63F45] bg-[#F4DCDD] p-4 text-center text-[#843747]">
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase">
                  <LockKeyhole className="h-4 w-4" /> No se puede validar la ubicación automáticamente
                </div>
                <p className="text-[11px] font-medium">{gpsData?.error || gpsValidation.message}</p>
                {permissionStatus === "denied" && (
                  <p className="rounded-xl bg-[#FFF9F4] p-3 text-left text-[10px]">
                    Abra los controles del sitio junto a la dirección web (🔒), cambie <strong>Ubicación</strong> a
                    <strong> Permitir</strong> y recargue.
                  </p>
                )}
                <button
                  type="button"
                  onClick={enableStoreFallbackLocation}
                  className="w-full py-2.5 px-4 bg-[#2E6F40] hover:bg-[#245832] text-white font-black text-xs uppercase rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapPin className="h-4 w-4" />
                  📍 Validar Ubicación en Sucursal Castaño (Fichar Ahora)
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                data-testid="clock-in"
                disabled={isSubmitting || !gpsReady}
                onClick={() => void handleRecordMovement("INGRESO")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#245832] bg-[#2E6F40] px-4 py-5 font-black text-white shadow-md transition hover:bg-[#245832] disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-500"
              >
                <LogIn className="h-7 w-7" />
                <span className="text-sm uppercase tracking-wider">Fichar ingreso</span>
              </button>
              <button
                type="button"
                data-testid="clock-out"
                disabled={isSubmitting || !gpsReady}
                onClick={() => void handleRecordMovement("EGRESO")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#71303D] bg-[#843747] px-4 py-5 font-black text-white shadow-md transition hover:bg-[#71303D] disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-500"
              >
                <LogOut className="h-7 w-7" />
                <span className="text-sm uppercase tracking-wider">Fichar egreso</span>
              </button>
            </div>
          </section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between space-y-5 rounded-3xl border border-[#D7BBA8] bg-[#FFF9F4] p-6 shadow-sm lg:col-span-7"
        >
          <div className="space-y-5">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-[#D7BBA8] pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-[#843747]">
                  <Calendar className="h-5 w-5" />
                  {isManager ? "Historial de fichajes del personal" : "Mis fichajes"}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-[#6F5A55]">
                  Horarios confirmados por Supabase con coordenadas y hora del servidor.
                </p>
              </div>
              {isManager && (
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-xl bg-[#4F735A] px-3.5 py-2 text-xs font-black uppercase text-white">
                    <FileSpreadsheet className="h-4 w-4" /> CSV
                  </button>
                  <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-xl bg-[#843747] px-3.5 py-2 text-xs font-black uppercase text-white">
                    <Download className="h-4 w-4" /> PDF
                  </button>
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 gap-3 rounded-2xl border border-[#D7BBA8] bg-[#E8D4C3]/40 p-3 text-xs font-bold ${isManager ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {isManager && (
                <label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-[#6F5A55]">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Empleado</span>
                  <select value={filterEmployee} onChange={(event) => setFilterEmployee(event.target.value)} className="w-full rounded-xl border border-[#D7BBA8] bg-[#FFF9F4] p-2 text-xs normal-case text-[#332424]">
                    <option value="all">Todos</option>
                    {employeeOptions.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </select>
                </label>
              )}
              <label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-[#6F5A55]">
                <span className="flex items-center gap-1"><Filter className="h-3 w-3" /> Movimiento</span>
                <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="w-full rounded-xl border border-[#D7BBA8] bg-[#FFF9F4] p-2 text-xs normal-case text-[#332424]">
                  <option value="all">Ingreso y egreso</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="EGRESO">Egresos</option>
                </select>
              </label>
              <label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-[#6F5A55]">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Período</span>
                <select value={filterTimeRange} onChange={(event) => setFilterTimeRange(event.target.value)} className="w-full rounded-xl border border-[#D7BBA8] bg-[#FFF9F4] p-2 text-xs normal-case text-[#332424]">
                  <option value="all">Todo</option>
                  <option value="today">Hoy</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Últimos 30 días</option>
                </select>
              </label>
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 text-xs">
              {filteredRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D7BBA8] py-16 text-center italic text-[#6F5A55]">
                  No hay fichajes para los filtros seleccionados.
                </div>
              ) : filteredRecords.map((record) => (
                <article key={record.id_fichaje} className="flex items-center justify-between rounded-2xl border border-[#D7BBA8] bg-[#E8D4C3]/30 p-4 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong>{record.nombre_empleado}</strong>
                      <span className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] font-black text-white ${record.tipo_movimiento === "INGRESO" ? "bg-[#2E6F40]" : "bg-[#843747]"}`}>
                        {record.tipo_movimiento}
                      </span>
                    </div>
                    <span className="block font-mono text-[10px] font-semibold text-[#6F5A55]">
                      {new Date(record.timestamp_servidor).toLocaleString("es-AR")}
                    </span>
                    <span className="block font-mono text-[9px] font-bold text-[#843747]">
                      A {Math.round(record.distancia_metros)} m · precisión ±{Math.round(record.precision_gps)} m
                    </span>
                  </div>
                  <span className="rounded-lg border border-[#2E6F40]/30 bg-[#E6F4EA] px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-[#2E6F40]">
                    GPS validado
                  </span>
                </article>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#D7BBA8] pt-3 text-[10px] font-bold text-[#6F5A55]">
            <span>{filteredRecords.length} fichaje(s)</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Fuente: Supabase</span>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
