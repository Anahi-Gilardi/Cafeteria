import { supabase } from "../lib/supabase";
import type { Reservation } from "../types";

export class ReservationService {
  static async createPublic(
    reservation: Reservation
  ): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
    const { data, error } = await supabase.functions.invoke<{
      reservation?: Reservation;
      error?: string;
    }>("create-public-reservation", {
      body: {
        tableId: reservation.tableId,
        tableName: reservation.tableName,
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        guests: reservation.guests,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone
      }
    });
    if (error || !data?.reservation) {
      return {
        success: false,
        error: data?.error || error?.message || "No se pudo confirmar la reserva."
      };
    }
    return { success: true, reservation: data.reservation };
  }
}
