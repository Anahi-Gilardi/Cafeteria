import { supabase } from "../lib/supabase";
import type { StaffRole } from "./AuthService";

export interface StaffProfile {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  direccion?: string;
  telefono?: string;
  telefono_contacto?: string;
  sueldo?: number;
  antiguedad?: number;
  permissions?: string[];
}

interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  direccion?: string;
  telefono?: string;
  telefono_contacto?: string;
  sueldo?: number;
  antiguedad?: number;
  permissions?: string[];
}

export const DEFAULT_STAFF: StaffProfile[] = [
  { id: "usr-admin-super", name: "Super Admin (Dueño)", email: "Super@admin.com", role: "administrador", active: true, sueldo: 350000, direccion: "Constitución 944, Río Cuarto", telefono: "+54 358 400-1000", telefono_contacto: "+54 358 400-1001", permissions: ["all"] },
  { id: "usr-caja", name: "Giuliana", email: "caja@castano.com", role: "cajero", active: true, sueldo: 0, direccion: "Constitución 944, Río Cuarto", telefono: "+54 358 555-3333", telefono_contacto: "+54 358 555-3334", permissions: ["all"] },
  { id: "usr-emp-1", name: "Agustín", email: "agustin@restobardelteatro.com", role: "mesero", active: true, sueldo: 180000, direccion: "Río Cuarto, Córdoba", telefono: "+54 358 555-1111", telefono_contacto: "+54 358 555-1112" },
  { id: "usr-emp-2", name: "Florencia", email: "florencia@restobardelteatro.com", role: "cajero", active: true, sueldo: 200000, direccion: "Río Cuarto, Córdoba", telefono: "+54 358 555-2222", telefono_contacto: "+54 358 555-2223", permissions: ["all"] },
  { id: "usr-emp-3", name: "Giuliana", email: "giuliana@restobardelteatro.com", role: "barista", active: true, sueldo: 190000, direccion: "Río Cuarto, Córdoba", telefono: "+54 358 555-3333", telefono_contacto: "+54 358 555-3334" },
  { id: "usr-emp-4", name: "Enzo", email: "enzo@restobardelteatro.com", role: "administrador", active: true, sueldo: 300000, direccion: "Río Cuarto, Córdoba", telefono: "+54 358 555-4444", telefono_contacto: "+54 358 555-4445", permissions: ["all"] },
  { id: "usr-emp-5", name: "Micaela", email: "micaela@restobardelteatro.com", role: "mesero", active: true, sueldo: 180000, direccion: "Río Cuarto, Córdoba", telefono: "+54 358 555-5555", telefono_contacto: "+54 358 555-5556" }
];

export class StaffService {
  static async list(): Promise<StaffProfile[]> {
    try {
      const { data, error } = await supabase
        .from("users_accounts")
        .select(
          "id, auth_user_id, name, email, role, active, direccion, telefono, telefono_contacto, sueldo, antiguedad, permissions"
        )
        .order("name");
      if (!error && data && data.length > 0) {
        return data as StaffProfile[];
      }
    } catch {
      // Intentar auto-crear si la tabla está vacía
    }

    // Auto-sembrar plantilla predeterminada si no hay registros
    try {
      await supabase.from("users_accounts").upsert(
        DEFAULT_STAFF.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          active: true,
          sueldo: s.sueldo,
          direccion: s.direccion,
          telefono: s.telefono,
          telefono_contacto: s.telefono_contacto
        }))
      );
    } catch {
      // Ignorar fallo de inserción si existe restricción
    }

    return DEFAULT_STAFF;
  }

  static async create(input: CreateStaffInput): Promise<StaffProfile> {
    // 1. Try edge function if available
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "create", profile: input }
      });
      if (!error && data?.profile) {
        return data.profile as StaffProfile;
      }
    } catch {
      // Fallback to direct DB insert
    }

    // 2. Direct DB insert into users_accounts table
    const newId = `usr-${Date.now()}`;
    const recordPayload = {
      id: newId,
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      active: true,
      direccion: input.direccion || null,
      telefono: input.telefono || null,
      telefono_contacto: input.telefono_contacto || null,
      sueldo: input.sueldo || 0,
      antiguedad: input.antiguedad || 0,
      permissions: input.permissions || []
    };

    const { data: dbData, error: dbError } = await supabase
      .from("users_accounts")
      .insert(recordPayload)
      .select()
      .single();

    if (dbError) {
      console.warn("Direct insert into users_accounts failed, using created object:", dbError.message);
      return recordPayload as StaffProfile;
    }

    return (dbData || recordPayload) as StaffProfile;
  }

  static async update(
    id: string,
    changes: Partial<Omit<StaffProfile, "id" | "auth_user_id" | "email">>
  ): Promise<StaffProfile> {
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "update", id, changes }
      });
      if (!error && data?.profile) return data.profile as StaffProfile;
    } catch {
      // Fallback
    }

    const { data: dbData } = await supabase
      .from("users_accounts")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    return (dbData || { id, ...changes }) as StaffProfile;
  }

  static async remove(id: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "delete", id }
      });
      if (!error && data?.success) return;
    } catch {
      // Fallback
    }

    await supabase.from("users_accounts").delete().eq("id", id);
  }
}
