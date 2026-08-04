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
  CheckCircle2
} from "lucide-react";
import { GeofencingService, GPSResult, CASTANO_LOCATION } from "../services/GeofencingService";
import { AttendanceService, AttendanceRecordPayload } from "../services/AttendanceService";

interface StaffAttendanceKioskProps {
  onShowNotification?: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

const DEFAULT_EMPLOYEES = [
  { id: "EMP-001", name: "Agustín", role: "Mozo" },
  { id: "EMP-002", name: "Florencia", role: "Moza" },
  { id: "EMP-003", name: "Giuliana", role: "Moza" },
  { id: "EMP-004", name: "Enzo", role: "Cocinero" },
  { id: "EMP-005", name: "Micaela", role: "Barista" }
];

export const StaffAttendanceKiosk: React.FC<StaffAttendanceKioskProps> = ({
  onShowNotification
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("EMP-001");

  const [gpsData, setGpsData] = useState<GPSResult | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(false);
  const [lastRecord, setLastRecord] = useState<AttendanceRecordPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reloj digital en vivo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Consultar GPS al cargar
  const fetchGps = async () => {
    setIsLoadingGps(true);
    const result = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);
    setGpsData(result);
    setIsLoadingGps(false);
  };

  useEffect(() => {
    fetchGps();
  }, []);

  // Cargar estado del último fichaje al seleccionar colaborador
  useEffect(() => {
    if (selectedEmployeeId) {
      AttendanceService.getLastEmployeeRecord(selectedEmployeeId).then((rec) => {
        setLastRecord(rec);
      });
    }
  }, [selectedEmployeeId]);

  const selectedEmployee = DEFAULT_EMPLOYEES.find(e => e.id === selectedEmployeeId) || DEFAULT_EMPLOYEES[0];

  const handleRecordMovement = async (movementType: "INGRESO" | "EGRESO") => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    // Refrescar GPS justo antes de fichar
    const freshGps = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);
    setGpsData(freshGps);

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
      setLastRecord(response.data || null);
    } else {
      if (onShowNotification) {
        onShowNotification(response.message, "error");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-[#332424]">
      {/* Top Header Card */}
      <div className="bg-[#843747] text-white p-6 rounded-3xl shadow-sm border border-[#71303D] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Building className="h-5 w-5 text-[#E7C8CF]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#E7C8CF]">Castaño Resto Bar</span>
          </div>
          <h2 className="font-serif text-2xl font-bold">Control de Asistencia & Fichaje GPS</h2>
          <p className="text-xs text-[#E7C8CF]/80">Constitución 944 • Río Cuarto, Córdoba</p>
        </div>

        {/* Reloj Digital en Vivo */}
        <div className="bg-[#71303D] border border-white/20 px-6 py-3 rounded-2xl text-center shadow-xs">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#E7C8CF] block">Hora Oficial Servidor (ARG)</span>
          <div className="font-mono text-2xl font-black text-white flex items-center justify-center gap-2 mt-0.5">
            <Clock className="h-5 w-5 text-[#FFF9F4] animate-pulse" />
            {currentTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <span className="text-[10px] text-[#FFF9F4]/70 block font-semibold mt-0.5">
            {currentTime.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* GPS Status Bar */}
      <div className="bg-[#FFF9F4] border border-[#D7BBA8] p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 text-xs font-bold shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${gpsData?.isWithinFence ? "bg-[#E6F4EA] text-[#2E6F40]" : "bg-[#F4DCDD] text-[#A63F45]"}`}>
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-[#843747]">Estado Geocerca Castaño (50m):</span>
              {isLoadingGps ? (
                <span className="text-xs font-mono text-[#6F5A55]">Obteniendo posición GPS...</span>
              ) : gpsData?.isWithinFence ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#2E6F40] border border-[#2E6F40]/30 font-black text-[10px] uppercase">
                  🟢 Dentro de Rango ({gpsData.distanceMeters}m)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-[#F4DCDD] text-[#A63F45] border border-[#A63F45]/30 font-black text-[10px] uppercase">
                  ⚠️ Fuera de Rango ({gpsData?.distanceMeters ?? "?"}m)
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#6F5A55] mt-0.5 font-mono">
              Lat: {gpsData?.latitude ? gpsData.latitude.toFixed(6) : "—"} | Lng: {gpsData?.longitude ? gpsData.longitude.toFixed(6) : "—"} | Precisión: ±{gpsData?.accuracy ?? 0}m
            </p>
          </div>
        </div>

        <button
          onClick={fetchGps}
          disabled={isLoadingGps}
          className="px-3.5 py-2 rounded-xl bg-[#E8D4C3] text-[#843747] hover:bg-[#E7C8CF] border border-[#D7BBA8] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGps ? "animate-spin" : ""}`} />
          Refrescar GPS
        </button>
      </div>

      {/* Main Kiosk View: Employee List + Direct Ingreso / Egreso Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Selector de Empleado */}
        <div className="md:col-span-5 bg-[#FFF9F4] border border-[#D7BBA8] p-5 rounded-3xl space-y-4 shadow-sm">
          <div className="border-b border-[#D7BBA8] pb-3">
            <h3 className="font-serif text-lg font-bold text-[#843747] flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#843747]" />
              Seleccionar Colaborador
            </h3>
            <p className="text-xs text-[#6F5A55] font-medium mt-0.5">Haga clic en su nombre para registrar asistencia:</p>
          </div>

          <div className="space-y-2.5">
            {DEFAULT_EMPLOYEES.map((emp) => {
              const isSelected = selectedEmployeeId === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? "bg-[#843747] border-[#843747] text-white shadow-sm font-bold scale-[1.01]"
                      : "bg-[#E8D4C3]/40 border-[#D7BBA8] text-[#332424] hover:bg-[#E8D4C3]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-[#71303D] text-white" : "bg-[#FFF9F4] text-[#843747]"}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <strong className="block text-base font-serif">{emp.name}</strong>
                      <span className={`text-[10px] font-mono uppercase font-bold ${isSelected ? "text-[#E7C8CF]" : "text-[#6F5A55]"}`}>
                        {emp.role} • ID: {emp.id}
                      </span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-6 w-6 text-[#FFF9F4]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Panel de Fichaje Directo (Botones de Ingreso y Egreso) */}
        <div className="md:col-span-7 bg-[#FFF9F4] border border-[#D7BBA8] p-6 rounded-3xl space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header del Colaborador Seleccionado */}
            <div className="p-4 bg-[#843747] text-white rounded-2xl border border-[#71303D] flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E7C8CF] block">Colaborador Seleccionado</span>
                <h3 className="font-serif text-2xl font-bold mt-0.5">{selectedEmployee.name}</h3>
                <span className="text-xs font-semibold text-[#E7C8CF] block">Cargo: {selectedEmployee.role} • ID: {selectedEmployee.id}</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#71303D] border border-white/20 flex items-center justify-center text-white font-black text-xl">
                {selectedEmployee.name.charAt(0)}
              </div>
            </div>

            {/* Tarjeta de Estado del Último Fichaje */}
            <div className="p-4 bg-[#E8D4C3]/40 border border-[#D7BBA8] rounded-2xl flex flex-wrap justify-between items-center gap-2 text-xs font-bold">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#6F5A55] block">Último Fichaje Registrado</span>
                {lastRecord ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono ${
                        lastRecord.tipo_movimiento === "INGRESO"
                          ? "bg-[#2E6F40] text-white"
                          : "bg-[#843747] text-white"
                      }`}
                    >
                      {lastRecord.tipo_movimiento === "INGRESO" ? "🟢 INGRESO" : "🔴 EGRESO"}
                    </span>
                    <span className="font-mono text-[#332424]">
                      {new Date(lastRecord.timestamp_servidor).toLocaleString("es-AR")}
                    </span>
                  </div>
                ) : (
                  <p className="text-[#6F5A55] italic mt-1">Sin fichajes previos hoy.</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#FFF9F4] text-[#2E6F40] rounded-lg border border-[#D7BBA8]">
                  GPS ACTIVO
                </span>
              </div>
            </div>

            {/* BOTONES DIRECTOS: MARCAR INGRESO / MARCAR EGRESO */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6F5A55] block text-center">
                Seleccione la Acción a Registrar
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRecordMovement("INGRESO")}
                  disabled={isSubmitting}
                  className="py-6 px-6 bg-[#2E6F40] hover:bg-[#245832] text-white font-black rounded-3xl shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 border border-[#245832]"
                >
                  <LogIn className="h-10 w-10 text-white" />
                  <span className="text-xl font-black uppercase tracking-wider">MARCAR INGRESO</span>
                  <span className="text-[11px] font-semibold text-[#E6F4EA]/90">Entrada / Inicio de Turno</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecordMovement("EGRESO")}
                  disabled={isSubmitting}
                  className="py-6 px-6 bg-[#843747] hover:bg-[#71303D] text-white font-black rounded-3xl shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 border border-[#71303D]"
                >
                  <LogOut className="h-10 w-10 text-white" />
                  <span className="text-xl font-black uppercase tracking-wider">MARCAR EGRESO</span>
                  <span className="text-[11px] font-semibold text-[#E7C8CF]/90">Salida / Fin de Turno</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D7BBA8] text-center">
            <span className="text-[10px] text-[#6F5A55] font-semibold">
              📍 El fichaje registrará automáticamente la hora oficial e inspección GPS.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
