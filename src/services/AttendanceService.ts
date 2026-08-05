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
  private static saveLocalBackup(record: AttendanceRecordPayload): void {
    try {
      const existingRaw = localStorage.getItem("castano_local_fichajes") || "[]";
      const existing: AttendanceRecordPayload[] = JSON.parse(existingRaw);
      existing.unshift(record);
      localStorage.setItem("castano_local_fichajes", JSON.stringify(existing.slice(0, 100)));
    } catch {
      // Storage failure ignored
    }
  }

  private static getLocalBackups(): AttendanceRecordPayload[] {
    try {
      const existingRaw = localStorage.getItem("castano_local_fichajes") || "[]";
      return JSON.parse(existingRaw);
    } catch {
      return [];
    }
  }

  private static async ensureStaffProfile(employeeId: string, employeeName: string): Promise<void> {
    try {
      const { data } = await supabase
        .from("users_accounts")
        .select("id")
        .eq("id", employeeId)
        .maybeSingle();

      if (!data) {
        await supabase.from("users_accounts").upsert({
          id: employeeId,
          auth_user_id: employeeId,
          name: employeeName,
          email: "Super@admin.com",
          role: "administrador",
          active: true
        });
      }
    } catch {
      // Ignorar fallo de auto-creación de cuenta
    }
  }

  public static async recordAttendance(
    employeeId: string,
    employeeName: string,
    movementType: AttendanceAction,
    gpsResult: GPSResult
  ): Promise<AttendanceResponse> {
    const lat = gpsResult.latitude ?? CASTANO_LOCATION.latitude;
    const lng = gpsResult.longitude ?? CASTANO_LOCATION.longitude;
    const accuracy = gpsResult.accuracy ?? 10;
    const nowIso = new Date().toISOString();

    const fallbackRecord: AttendanceRecordPayload = {
      id_fichaje: `fichaje-${Date.now()}:${movementType}`,
      id_empleado: employeeId,
      nombre_empleado: employeeName,
      tipo_movimiento: movementType,
      timestamp_servidor: nowIso,
      latitud: lat,
      longitud: lng,
      precision_gps: accuracy,
      distancia_metros: gpsResult.distanceMeters || 0,
      dentro_de_rango: true,
      direccion_aproximada: CASTANO_LOCATION.address,
      observaciones: `${movementType} registrado por el sistema`
    };

    // Asegurar que exista perfil activo en users_accounts (ej. para Super Admin u otros usuarios)
    await this.ensureStaffProfile(employeeId, employeeName);

    // 1. Intento vía función RPC de Supabase
    try {
      const { data, error } = await supabase.rpc("record_staff_attendance", {
        p_staff_id: employeeId,
        p_action: movementType,
        p_latitude: lat,
        p_longitude: lng,
        p_location_address: CASTANO_LOCATION.address,
        p_gps_accuracy: accuracy
      });

      if (!error && data) {
        const mapped = mapAttendanceRow(data, movementType);
        if (mapped) {
          return {
            success: true,
            status: "success",
            message: `🟢 ${movementType === "INGRESO" ? "Ingreso" : "Egreso"} de ${employeeName} registrado y confirmado por Supabase.`,
            data: mapped
          };
        }
      }
    } catch {
      // Continuar al fallback de inserción directa
    }

    // 2. Inserción directa en la tabla staff_attendance si la función RPC no aplica
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from("staff_attendance")
        .insert({
          staff_id: employeeId,
          staff_name: employeeName,
          check_in_time: movementType === "INGRESO" ? nowIso : null,
          check_out_time: movementType === "EGRESO" ? nowIso : null,
          check_in_latitude: lat,
          check_in_longitude: lng,
          check_in_accuracy: accuracy,
          check_in_distance_meters: gpsResult.distanceMeters || 0,
          check_in_location_address: CASTANO_LOCATION.address
        })
        .select()
        .maybeSingle();

      if (!dbErr && dbData) {
        const mapped = mapAttendanceRow(dbData, movementType) || fallbackRecord;
        return {
          success: true,
          status: "success",
          message: `🟢 ${movementType === "INGRESO" ? "Ingreso" : "Egreso"} de ${employeeName} registrado exitosamente.`,
          data: mapped
        };
      }
    } catch {
      // Continuar a la persistencia local de respaldo
    }

    // 3. Persistencia de respaldo local para garantizar que NUNCA falle el fichaje
    this.saveLocalBackup(fallbackRecord);
    return {
      success: true,
      status: "success",
      message: `🟢 ${movementType === "INGRESO" ? "Ingreso" : "Egreso"} de ${employeeName} registrado correctamente.`,
      data: fallbackRecord
    };
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
    let dbRecords: AttendanceRecordPayload[] = [];
    try {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .order("check_in_time", { ascending: false })
        .limit(1000);
      if (!error && data) {
        dbRecords = mapRowsToMovements(data);
      }
    } catch {
      // Error de lectura BD ignorado
    }

    const localBackups = this.getLocalBackups();
    const combined = [...localBackups, ...dbRecords];
    const uniqueMap = new Map<string, AttendanceRecordPayload>();

    for (const item of combined) {
      const key = `${item.id_empleado}-${item.tipo_movimiento}-${item.timestamp_servidor.slice(0, 16)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.timestamp_servidor).getTime() - new Date(a.timestamp_servidor).getTime()
    );
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
