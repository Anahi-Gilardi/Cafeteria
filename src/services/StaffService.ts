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

export class StaffService {
  static async list(): Promise<StaffProfile[]> {
    const { data, error } = await supabase
      .from("users_accounts")
      .select(
        "id, auth_user_id, name, email, role, active, direccion, telefono, telefono_contacto, sueldo, antiguedad, permissions"
      )
      .order("name");
    if (error) throw error;
    return (data || []) as StaffProfile[];
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
