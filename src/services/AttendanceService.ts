import { supabase } from "../lib/supabase";
import {
  CASTANO_LOCATION,
  GeofencingService,
  type GPSResult
} from "./GeofencingService";

export interface AttendanceRecordPayload {
  id_fichaje?: string;
  id_empleado: string;
  nombre_empleado: string;
  tipo_movimiento: "INGRESO" | "EGRESO";
  timestamp_servidor: string;
  latitud: number;
  longitud: number;
  precision_gps: number;
  distancia_metros: number;
  dentro_de_rango: boolean;
  direccion_aproximada?: string;
  observaciones?: string;
}

export interface AttendanceResponse {
  success: boolean;
  status: "success" | "warning" | "error";
  message: string;
  data?: AttendanceRecordPayload;
  error?: string;
}

type AttendanceAction = "INGRESO" | "EGRESO";

function numberOrZero(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapAttendanceRow(row: any, action: AttendanceAction): AttendanceRecordPayload | null {
  const isEntry = action === "INGRESO";
  const timestamp = isEntry ? row.check_in_time : row.check_out_time;
  if (!timestamp) return null;

  const latitude = numberOrZero(
    isEntry ? row.check_in_latitude ?? row.latitude : row.check_out_latitude ?? row.latitude
  );
  const longitude = numberOrZero(
    isEntry ? row.check_in_longitude ?? row.longitude : row.check_out_longitude ?? row.longitude
  );
  const accuracy = numberOrZero(
    isEntry ? row.check_in_accuracy ?? row.gps_accuracy : row.check_out_accuracy ?? row.gps_accuracy
  );
  const distance = numberOrZero(
    isEntry ? row.check_in_distance_meters : row.check_out_distance_meters
  );
  const locationAddress =
    (isEntry ? row.check_in_location_address : row.check_out_location_address) ||
    row.location_address ||
    CASTANO_LOCATION.address;

  return {
    id_fichaje: `${row.id}:${action}`,
    id_empleado: row.staff_id,
    nombre_empleado: row.staff_name,
    tipo_movimiento: action,
    timestamp_servidor: timestamp,
    latitud: latitude,
    longitud: longitude,
    precision_gps: accuracy,
    distancia_metros: distance,
    dentro_de_rango: distance <= CASTANO_LOCATION.radiusMeters,
    direccion_aproximada: locationAddress,
    observaciones: `Validado por servidor a ${Math.round(distance)} m del local`
  };
}

function mapRowsToMovements(rows: any[]): AttendanceRecordPayload[] {
  return rows
    .flatMap((row) => [
      mapAttendanceRow(row, "INGRESO"),
      mapAttendanceRow(row, "EGRESO")
    ])
    .filter((record): record is AttendanceRecordPayload => record !== null)
    .sort(
      (a, b) =>
        new Date(b.timestamp_servidor).getTime() - new Date(a.timestamp_servidor).getTime()
    );
}

function explainRpcError(error: { message?: string; code?: string }): string {
  const message = error.message || "Supabase rechazó el fichaje";
  if (error.code === "42501") {
    return "La sesión no corresponde al empleado. Cierre sesión y vuelva a ingresar con su propia cuenta.";
  }
  if (error.code === "23505" || message.includes("open shift")) {
    return "Ya existe un ingreso abierto. Debe registrar el egreso antes de volver a ingresar.";
  }
  if (message.includes("no open shift")) {
    return "No existe un ingreso abierto para registrar el egreso.";
  }
  if (message.includes("outside attendance geofence")) {
    return `La ubicación está fuera del radio permitido de ${CASTANO_LOCATION.radiusMeters} m.`;
  }
  if (message.includes("GPS accuracy")) {
    return `La precisión GPS no es suficiente; debe ser de ±${CASTANO_LOCATION.maxAccuracyMeters} m o menos.`;
  }
  if (message.includes("active staff profile not found")) {
    return "La cuenta autenticada no tiene un perfil de personal activo.";
  }
  return `${message}${error.code ? ` (${error.code})` : ""}`;
}

export class AttendanceService {
  public static async recordAttendance(
    employeeId: string,
    employeeName: string,
    movementType: AttendanceAction,
    gpsResult: GPSResult
  ): Promise<AttendanceResponse> {
    const validation = GeofencingService.validateForAttendance(gpsResult);
    if (
      !validation.ok ||
      gpsResult.latitude === null ||
      gpsResult.longitude === null ||
      gpsResult.accuracy === null
    ) {
      return {
        success: false,
        status: "error",
        message: validation.message,
        error: "INVALID_GEOLOCATION"
      };
    }

    try {
      const { data, error } = await supabase.rpc("record_staff_attendance", {
        p_staff_id: employeeId,
        p_action: movementType,
        p_latitude: gpsResult.latitude,
        p_longitude: gpsResult.longitude,
        p_location_address: CASTANO_LOCATION.address,
        p_gps_accuracy: gpsResult.accuracy
      });

      if (error) {
        return {
          success: false,
          status: "error",
          message: explainRpcError(error),
          error: error.code || error.message
        };
      }
      if (!data) {
        return {
          success: false,
          status: "error",
          message: "El servidor no confirmó el fichaje.",
          error: "EMPTY_RPC_RESPONSE"
        };
      }

      const mapped = mapAttendanceRow(data, movementType);
      if (!mapped) {
        return {
          success: false,
          status: "error",
          message: "El servidor devolvió un fichaje incompleto.",
          error: "INVALID_RPC_RESPONSE"
        };
      }

      return {
        success: true,
        status: "success",
        message: `${movementType === "INGRESO" ? "Ingreso" : "Egreso"} de ${employeeName} registrado y validado por el servidor.`,
        data: mapped
      };
    } catch (error) {
      return {
        success: false,
        status: "error",
        message: "No se pudo conectar con Supabase. El fichaje no fue registrado; vuelva a intentar.",
        error: error instanceof Error ? error.message : "NETWORK_ERROR"
      };
    }
  }

  public static async getLastEmployeeRecord(
    employeeId: string
  ): Promise<AttendanceRecordPayload | null> {
    try {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", employeeId)
        .order("check_in_time", { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      const row = data[0];
      return mapAttendanceRow(row, row.check_out_time ? "EGRESO" : "INGRESO");
    } catch {
      return null;
    }
  }

  public static async getAllAttendanceRecords(): Promise<AttendanceRecordPayload[]> {
    try {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .order("check_in_time", { ascending: false })
        .limit(1000);
      if (error) {
        console.warn("No se pudo cargar el historial de asistencia:", error.message);
        return [];
      }
      return mapRowsToMovements(data || []);
    } catch {
      return [];
    }
  }

  public static subscribeToRealtimeChanges(onChanged: () => void): () => void {
    try {
      const channel = supabase
        .channel("public:staff_attendance_realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "staff_attendance" },
          onChanged
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      return () => undefined;
    }
  }
}
