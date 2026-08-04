/**
 * AttendanceService.ts
 * Servicio de Fichaje y Control de Asistencia con Resiliencia Offline y Supabase
 * Castaño Resto Bar & Cafetería
 */

import { supabase } from "../lib/supabase";
import { GeofencingService, GPSResult, CASTANO_LOCATION } from "./GeofencingService";

export interface AttendanceRecordPayload {
  id_fichaje?: number;
  id_empleado: string;
  nombre_empleado: string;
  tipo_movimiento: "INGRESO" | "EGRESO";
  timestamp_servidor: string;
  latitud: number;
  longitud: number;
  precision_gps: number;
  distancia_metros: number;
  dentro_de_rango: boolean;
  dispositivo_info?: string;
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

const OFFLINE_QUEUE_KEY = "castano_attendance_offline_queue";
const LOCAL_ATTENDANCE_KEY = "castano_attendance_local_records";

export class AttendanceService {
  /**
   * Registra una marca de Ingreso o Egreso de un empleado
   */
  public static async recordAttendance(
    employeeId: string,
    employeeName: string,
    movementType: "INGRESO" | "EGRESO",
    gpsResult: GPSResult
  ): Promise<AttendanceResponse> {
    try {
      const nowIso = new Date().toISOString();
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Castaño App";

      // Validar máquina de estados para evitar duplicados
      const lastRecord = await this.getLastEmployeeRecord(employeeId);
      if (lastRecord && lastRecord.tipo_movimiento === movementType) {
        return {
          success: false,
          status: "error",
          message: `⚠️ No se puede registrar un nuevo ${movementType.toLowerCase()} consecutivo. Su última marca fue ${movementType}.`,
          error: "DUPLICATE_MOVEMENT"
        };
      }

      const recordPayload: AttendanceRecordPayload = {
        id_empleado: employeeId,
        nombre_empleado: employeeName,
        tipo_movimiento: movementType,
        timestamp_servidor: nowIso,
        latitud: gpsResult.latitude,
        longitud: gpsResult.longitude,
        precision_gps: gpsResult.accuracy,
        distancia_metros: gpsResult.distanceMeters,
        dentro_de_rango: gpsResult.isWithinFence,
        dispositivo_info: userAgent,
        direccion_aproximada: gpsResult.isWithinFence ? "Constitución 944, Río Cuarto" : "Ubicación remota",
        observaciones: gpsResult.isWithinFence
          ? "Fichaje normal dentro del radio de la cafetería"
          : `⚠️ Alerta: Fichaje fuera de rango (a ${gpsResult.distanceMeters}m)`
      };

      // Guardar localmente para disponibilidad inmediata
      this.saveLocalRecord(recordPayload);

      // Intentar persistencia en Supabase
      try {
        const { data, error } = await supabase
          .from("registros_fichaje")
          .insert([recordPayload])
          .select()
          .single();

        if (error) {
          console.warn("📌 Error Supabase, encolando offline:", error.message);
          this.enqueueOfflineRecord(recordPayload);
        } else if (data) {
          recordPayload.id_fichaje = data.id_fichaje;
        }
      } catch (err) {
        console.warn("📌 Fallo de red, encolando offline:", err);
        this.enqueueOfflineRecord(recordPayload);
      }

      const statusMsg = gpsResult.isWithinFence
        ? `¡${movementType === "INGRESO" ? "Ingreso" : "Egreso"} registrado con éxito!`
        : `⚠️ ${movementType === "INGRESO" ? "Ingreso" : "Egreso"} registrado con advertencia: Fichaje fuera del rango de la cafetería (${gpsResult.distanceMeters}m).`;

      return {
        success: true,
        status: gpsResult.isWithinFence ? "success" : "warning",
        message: statusMsg,
        data: recordPayload
      };
    } catch (e: any) {
      return {
        success: false,
        status: "error",
        message: "Ocurrió un error inesperado al registrar el fichaje.",
        error: e.message
      };
    }
  }

  /**
   * Obtiene la última marca registrada para un empleado
   */
  public static async getLastEmployeeRecord(
    employeeId: string
  ): Promise<AttendanceRecordPayload | null> {
    // Buscar primero en Supabase
    try {
      const { data, error } = await supabase
        .from("registros_fichaje")
        .select("*")
        .eq("id_empleado", employeeId)
        .order("timestamp_servidor", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0] as AttendanceRecordPayload;
      }
    } catch (e) {
      // Ignorar fallo y recurrir a local
    }

    // Fallback en localStorage
    const local = this.getLocalRecords();
    const employeeRecords = local.filter((r) => r.id_empleado === employeeId);
    if (employeeRecords.length > 0) {
      employeeRecords.sort(
        (a, b) => new Date(b.timestamp_servidor).getTime() - new Date(a.timestamp_servidor).getTime()
      );
      return employeeRecords[0];
    }

    return null;
  }

  /**
   * Obtiene todos los registros de fichaje
   */
  public static async getAllAttendanceRecords(): Promise<AttendanceRecordPayload[]> {
    try {
      const { data, error } = await supabase
        .from("registros_fichaje")
        .select("*")
        .order("timestamp_servidor", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as AttendanceRecordPayload[];
      }
    } catch (e) {
      // Ignore
    }

    return this.getLocalRecords();
  }

  // --- MÉTODOS OFFLINE Y LOCALSTORAGE ---

  private static getLocalRecords(): AttendanceRecordPayload[] {
    try {
      const str = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
      return str ? JSON.parse(str) : [];
    } catch (e) {
      return [];
    }
  }

  private static saveLocalRecord(record: AttendanceRecordPayload) {
    try {
      const records = this.getLocalRecords();
      records.unshift(record);
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records.slice(0, 500)));
    } catch (e) {
      console.error("Error guardando registro local:", e);
    }
  }

  private static enqueueOfflineRecord(record: AttendanceRecordPayload) {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      queue.push(record);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Error encolando fichaje offline:", e);
    }
  }

  /**
   * Sincroniza fichajes guardados offline
   */
  public static async syncOfflineRecords(): Promise<number> {
    try {
      const queue: AttendanceRecordPayload[] = JSON.parse(
        localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"
      );
      if (queue.length === 0) return 0;

      let syncedCount = 0;
      const remaining: AttendanceRecordPayload[] = [];

      for (const item of queue) {
        try {
          const { error } = await supabase.from("registros_fichaje").insert([item]);
          if (!error) {
            syncedCount++;
          } else {
            remaining.push(item);
          }
        } catch (e) {
          remaining.push(item);
        }
      }

      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      return syncedCount;
    } catch (e) {
      return 0;
    }
  }
}
