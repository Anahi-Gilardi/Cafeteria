/**
 * AttendanceService.ts
 * Servicio de Fichaje y Control de Asistencia con Resiliencia Offline y Supabase Realtime
 * Castaño Resto Bar & Cafetería
 */

import { supabase } from "../lib/supabase";
import { GPSResult } from "./GeofencingService";

export interface AttendanceRecordPayload {
  id_fichaje?: number | string;
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
  fecha?: string;
  hora?: string;
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
      const now = new Date();
      const nowIso = now.toISOString();
      const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Castaño App";

      // Validar máquina de estados para evitar marcas inconsistentes
      const lastRecord = await this.getLastEmployeeRecord(employeeId);
      if (lastRecord && lastRecord.tipo_movimiento === movementType) {
        return {
          success: false,
          status: "error",
          message: `⚠️ No se puede fichar un ${movementType} consecutivo. Su última marca fue ${movementType} el ${new Date(lastRecord.timestamp_servidor).toLocaleTimeString("es-AR")}.`,
          error: "DUPLICATE_MOVEMENT"
        };
      }

      if (!lastRecord && movementType === "EGRESO") {
        return {
          success: false,
          status: "error",
          message: `⚠️ No se puede registrar un EGRESO sin un INGRESO previo.`,
          error: "MISSING_INGRESO"
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
        direccion_aproximada: gpsResult.isWithinFence ? "Constitución 944, Río Cuarto" : `A ${gpsResult.distanceMeters}m de la sucursal`,
        observaciones: gpsResult.isWithinFence
          ? "Fichaje en sucursal dentro del radio permitido"
          : `⚠️ Alerta: Fichaje fuera de rango (a ${gpsResult.distanceMeters}m)`,
        fecha: dateStr,
        hora: timeStr
      };

      // Payload para tabla SQL `fichajes` según especificación requerida
      const fichajesTablePayload = {
        empleado_id: employeeId,
        nombre_completo: employeeName,
        tipo: movementType,
        fecha: dateStr,
        hora: timeStr,
        latitud: gpsResult.latitude,
        longitud: gpsResult.longitude,
        precision_metros: gpsResult.accuracy,
        dentro_de_rango: gpsResult.isWithinFence,
        distancia_sucursal_metros: gpsResult.distanceMeters,
        direccion_texto: recordPayload.direccion_aproximada,
        user_agent: userAgent
      };

      // Guardar localmente para disponibilidad e historial inmediato
      this.saveLocalRecord(recordPayload);

      // Intentar inserción en Supabase (primero tabla `fichajes`, luego `registros_fichaje`)
      try {
        const { error: err1 } = await supabase.from("fichajes").insert([fichajesTablePayload]);
        if (err1) {
          await supabase.from("registros_fichaje").insert([recordPayload]);
        }
      } catch (err) {
        console.warn("📌 Fallo de red Supabase, guardado en cola offline:", err);
        this.enqueueOfflineRecord(recordPayload);
      }

      const statusMsg = gpsResult.isWithinFence
        ? `¡${movementType === "INGRESO" ? "Ingreso" : "Egreso"} registrado con éxito!`
        : `⚠️ ${movementType === "INGRESO" ? "Ingreso" : "Egreso"} registrado (FUERA DE RANGO: a ${gpsResult.distanceMeters}m).`;

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
    try {
      const { data: d1 } = await supabase
        .from("fichajes")
        .select("*")
        .eq("empleado_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (d1 && d1.length > 0) {
        const r = d1[0];
        return {
          id_fichaje: r.id,
          id_empleado: r.empleado_id,
          nombre_empleado: r.nombre_completo,
          tipo_movimiento: r.tipo as "INGRESO" | "EGRESO",
          timestamp_servidor: r.created_at,
          latitud: Number(r.latitud),
          longitud: Number(r.longitud),
          precision_gps: Number(r.precision_metros),
          distancia_metros: Number(r.distancia_sucursal_metros),
          dentro_de_rango: r.dentro_de_rango,
          dispositivo_info: r.user_agent,
          direccion_aproximada: r.direccion_texto
        };
      }

      const { data: d2 } = await supabase
        .from("registros_fichaje")
        .select("*")
        .eq("id_empleado", employeeId)
        .order("timestamp_servidor", { ascending: false })
        .limit(1);

      if (d2 && d2.length > 0) {
        return d2[0] as AttendanceRecordPayload;
      }
    } catch (e) {
      // Ignore
    }

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
      const { data: d1, error: err1 } = await supabase
        .from("fichajes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!err1 && d1 && d1.length > 0) {
        return d1.map(r => ({
          id_fichaje: r.id,
          id_empleado: r.empleado_id,
          nombre_empleado: r.nombre_completo,
          tipo_movimiento: r.tipo as "INGRESO" | "EGRESO",
          timestamp_servidor: r.created_at,
          latitud: Number(r.latitud),
          longitud: Number(r.longitud),
          precision_gps: Number(r.precision_metros),
          distancia_metros: Number(r.distancia_sucursal_metros),
          dentro_de_rango: r.dentro_de_rango,
          dispositivo_info: r.user_agent,
          direccion_aproximada: r.direccion_texto
        }));
      }

      const { data: d2, error: err2 } = await supabase
        .from("registros_fichaje")
        .select("*")
        .order("timestamp_servidor", { ascending: false });

      if (!err2 && d2 && d2.length > 0) {
        return d2 as AttendanceRecordPayload[];
      }
    } catch (e) {
      // Ignore
    }

    return this.getLocalRecords();
  }

  /**
   * Suscribe a cambios en tiempo real en Supabase (Realtime Subscription)
   */
  public static subscribeToRealtimeChanges(onNewRecord: () => void) {
    try {
      const channel = supabase
        .channel("public:fichajes_realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "fichajes" },
          () => onNewRecord()
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "registros_fichaje" },
          () => onNewRecord()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      return () => {};
    }
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
}

