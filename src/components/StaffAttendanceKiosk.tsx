import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Building,
  Radio,
  Delete
} from "lucide-react";
import { GeofencingService, GPSResult, CASTANO_LOCATION } from "../services/GeofencingService";
import { AttendanceService, AttendanceRecordPayload } from "../services/AttendanceService";

interface StaffAttendanceKioskProps {
  onShowNotification?: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

const DEFAULT_EMPLOYEES = [
  { id: "EMP-001", name: "Agustín", role: "Mozo", pin: "1001" },
  { id: "EMP-002", name: "Florencia", role: "Moza", pin: "1002" },
  { id: "EMP-003", name: "Giuliana", role: "Moza", pin: "1003" },
  { id: "EMP-004", name: "Enzo", role: "Cocinero", pin: "1004" },
  { id: "EMP-005", name: "Micaela", role: "Barista", pin: "1005" }
];

export const StaffAttendanceKiosk: React.FC<StaffAttendanceKioskProps> = ({
  onShowNotification
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("EMP-001");
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<typeof DEFAULT_EMPLOYEES[0] | null>(null);

  const [gpsData, setGpsData] = useState<GPSResult | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(false);
  const [lastRecord, setLastRecord] = useState<AttendanceRecordPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reloj digital en vivo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Consultar GPS al cargar y refrescar cada 30s
  const fetchGps = async () => {
    setIsLoadingGps(true);
    const result = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);
    setGpsData(result);
    setIsLoadingGps(false);
  };

  useEffect(() => {
    fetchGps();
  }, []);

  // Cargar estado del último fichaje al seleccionar o autenticar empleado
  useEffect(() => {
    if (authenticatedEmployee) {
      AttendanceService.getLastEmployeeRecord(authenticatedEmployee.id).then((rec) => {
        setLastRecord(rec);
      });
    }
  }, [authenticatedEmployee]);

  const handleNumpadPress = (num: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      setPinError(false);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleClearPin = () => {
    setEnteredPin("");
    setPinError(false);
  };

  const verifyPin = (pinToVerify: string) => {
    const emp = DEFAULT_EMPLOYEES.find((e) => e.id === selectedEmployeeId && e.pin === pinToVerify);
    if (emp) {
      setAuthenticatedEmployee(emp);
      if (onShowNotification) {
        onShowNotification(`🔑 Identidad verificada: ${emp.name} (${emp.role})`, "info");
      }
    } else {
      setPinError(true);
      setEnteredPin("");
      if (onShowNotification) {
        onShowNotification("⚠️ PIN incorrecto. Intente nuevamente.", "error");
      }
    }
  };

  const handleRecordMovement = async (movementType: "INGRESO" | "EGRESO") => {
    if (!authenticatedEmployee) return;

    setIsSubmitting(true);
    // Refrescar GPS justo antes de fichar
    const freshGps = await GeofencingService.getCurrentPosition(CASTANO_LOCATION);
    setGpsData(freshGps);

    const response = await AttendanceService.recordAttendance(
      authenticatedEmployee.id,
      authenticatedEmployee.name,
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

  const nextAllowedMovement = lastRecord
    ? lastRecord.tipo_movimiento === "INGRESO"
      ? "EGRESO"
      : "INGRESO"
    : "INGRESO";

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#332424]">
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

      {!authenticatedEmployee ? (
        /* Pantalla 1: Selección de Empleado e Ingreso de PIN */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Selector de Empleado */}
          <div className="md:col-span-5 bg-[#FFF9F4] border border-[#D7BBA8] p-5 rounded-3xl space-y-4 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#843747] flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#843747]" />
              Seleccionar Empleado
            </h3>
            <p className="text-xs text-[#6F5A55]">Elija su nombre de la lista e ingrese su PIN de 4 dígitos:</p>

            <div className="space-y-2">
              {DEFAULT_EMPLOYEES.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setEnteredPin("");
                    setPinError(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                    selectedEmployeeId === emp.id
                      ? "bg-[#843747] border-[#843747] text-white shadow-xs font-bold"
                      : "bg-[#E8D4C3]/40 border-[#D7BBA8] text-[#332424] hover:bg-[#E8D4C3]"
                  }`}
                >
                  <div>
                    <strong className="block text-sm">{emp.name}</strong>
                    <span className={`text-[10px] font-mono uppercase ${selectedEmployeeId === emp.id ? "text-[#E7C8CF]" : "text-[#6F5A55]"}`}>
                      {emp.role} • ID: {emp.id}
                    </span>
                  </div>
                  {selectedEmployeeId === emp.id && <ShieldCheck className="h-5 w-5 text-[#FFF9F4]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Teclado Numérico Numpad */}
          <div className="md:col-span-7 bg-[#FFF9F4] border border-[#D7BBA8] p-6 rounded-3xl space-y-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#6F5A55]">Verificación de Seguridad</span>
                <h4 className="font-serif text-xl font-bold text-[#843747]">Ingrese PIN de 4 dígitos</h4>

                {/* PIN Mask Display */}
                <div className="flex justify-center items-center gap-3 py-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                        pinError
                          ? "border-[#A63F45] bg-[#F4DCDD] text-[#A63F45]"
                          : enteredPin.length > idx
                          ? "border-[#843747] bg-[#843747] text-white shadow-xs"
                          : "border-[#D7BBA8] bg-[#E8D4C3]/30 text-[#6F5A55]"
                      }`}
                    >
                      {enteredPin.length > idx ? "●" : ""}
                    </div>
                  ))}
                </div>

                {pinError && <p className="text-xs text-[#A63F45] font-bold">⚠️ PIN incorrecto. Intente nuevamente.</p>}
              </div>

              {/* Grid Numpad */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mt-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="h-14 rounded-2xl bg-[#E8D4C3] border border-[#D7BBA8] text-[#843747] text-xl font-black hover:bg-[#E7C8CF] transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleClearPin}
                  className="h-14 rounded-2xl bg-[#F4DCDD] border border-[#A63F45]/30 text-[#A63F45] text-xs font-black hover:bg-[#E7C8CF] transition-all cursor-pointer flex items-center justify-center"
                >
                  <Delete className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleNumpadPress("0")}
                  className="h-14 rounded-2xl bg-[#E8D4C3] border border-[#D7BBA8] text-[#843747] text-xl font-black hover:bg-[#E7C8CF] transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  0
                </button>
                <div className="h-14 rounded-2xl flex items-center justify-center text-[10px] text-[#6F5A55] font-mono font-bold">
                  PIN 4 Díg.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pantalla 2: Empleado Autenticado - Marcar Ingreso / Egreso */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFF9F4] border border-[#D7BBA8] p-6 rounded-3xl space-y-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#D7BBA8] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#2E6F40] text-[10px] font-black uppercase border border-[#2E6F40]/30">
                  Sesión Autenticada
                </span>
                <span className="text-xs font-mono font-bold text-[#6F5A55]">{authenticatedEmployee.id}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#843747] mt-1">{authenticatedEmployee.name}</h3>
              <p className="text-xs text-[#6F5A55] font-bold">Cargo: {authenticatedEmployee.role}</p>
            </div>

            <button
              onClick={() => {
                setAuthenticatedEmployee(null);
                setEnteredPin("");
              }}
              className="px-4 py-2 rounded-xl bg-[#E8D4C3] text-[#843747] text-xs font-black uppercase hover:bg-[#E7C8CF] border border-[#D7BBA8] transition-all cursor-pointer"
            >
              🔒 Cambiar Empleado
            </button>
          </div>

          {/* Tarjeta de Estado Último Fichaje */}
          <div className="p-4 bg-[#E8D4C3]/30 border border-[#D7BBA8] rounded-2xl flex justify-between items-center text-xs font-bold">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#6F5A55] block">Último Fichaje Registrado</span>
              {lastRecord ? (
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      lastRecord.tipo_movimiento === "INGRESO"
                        ? "bg-[#E6F4EA] text-[#2E6F40]"
                        : "bg-[#F4DCDD] text-[#A63F45]"
                    }`}
                  >
                    {lastRecord.tipo_movimiento}
                  </span>
                  <span className="font-mono text-[#332424]">
                    {new Date(lastRecord.timestamp_servidor).toLocaleString("es-AR")}
                  </span>
                </div>
              ) : (
                <p className="text-[#6F5A55] italic mt-1">Sin fichajes registrados el día de hoy.</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#6F5A55] block">Próxima Marca Permitida</span>
              <strong className="text-sm font-black text-[#843747] block mt-1">{nextAllowedMovement}</strong>
            </div>
          </div>

          {/* Botones de Acción Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <button
              onClick={() => handleRecordMovement("INGRESO")}
              disabled={isSubmitting || nextAllowedMovement !== "INGRESO"}
              className={`p-6 rounded-3xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 shadow-xs ${
                nextAllowedMovement === "INGRESO"
                  ? "bg-[#2E6F40] hover:bg-[#245832] border-[#245832] text-white cursor-pointer"
                  : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              <LogIn className="h-8 w-8" />
              <strong className="text-lg font-black uppercase tracking-wider">MARCAR INGRESO</strong>
              <span className="text-[10px] font-medium opacity-80">Registrar inicio de turno laboral</span>
            </button>

            <button
              onClick={() => handleRecordMovement("EGRESO")}
              disabled={isSubmitting || nextAllowedMovement !== "EGRESO"}
              className={`p-6 rounded-3xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 shadow-xs ${
                nextAllowedMovement === "EGRESO"
                  ? "bg-[#843747] hover:bg-[#71303D] border-[#71303D] text-white cursor-pointer"
                  : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              <LogOut className="h-8 w-8" />
              <strong className="text-lg font-black uppercase tracking-wider">MARCAR EGRESO</strong>
              <span className="text-[10px] font-medium opacity-80">Registrar fin de turno laboral</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
