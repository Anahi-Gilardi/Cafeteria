import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type StaffRole = "administrador" | "dueño" | "cajero" | "barista" | "mesero";

export interface UserRoleProfile {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  role: StaffRole;
}

const ALLOWED_ROLES = new Set<StaffRole>([
  "administrador",
  "dueño",
  "cajero",
  "barista",
  "mesero"
]);

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<string>> = {
  administrador: new Set(["*"]),
  dueño: new Set(["*"]),
  cajero: new Set(["caja:cobrar", "cash:open", "cash:close", "orders:read", "orders:update", "attendance:own"]),
  barista: new Set(["orders:read", "orders:update", "inventory:read", "inventory:update", "attendance:own"]),
  mesero: new Set(["orders:create", "orders:read", "orders:update", "attendance:own"])
};

export class AuthService {
  private static clearLegacySessionCache(): void {
    try {
      localStorage.removeItem("castano_session_cache");
      localStorage.removeItem("castano_active_user");
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  }

  private static async profileFromAuthUser(user: User): Promise<UserRoleProfile | null> {
    const { data, error } = await supabase
      .from("users_accounts")
      .select("id, auth_user_id, email, name, role, active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!error && data && data.active !== false && ALLOWED_ROLES.has(data.role)) {
      return {
        id: data.id,
        authUserId: user.id,
        email: data.email || user.email || "",
        name: data.name || user.user_metadata?.name || user.email || "Personal",
        role: data.role
      };
    }
    return null;
  }

  public static async loginWithCredentials(
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: UserRoleProfile; error?: string }> {
    const rawEmail = emailInput.trim().toLowerCase();
    this.clearLegacySessionCache();

    if (!rawEmail.includes("@") || passwordInput.length === 0) {
      return { success: false, error: "Ingrese un correo electrónico y una contraseña válidos." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: passwordInput
      });

      if (!error && data?.user) {
        const profile = await this.profileFromAuthUser(data.user);
        if (profile) {
          return { success: true, user: profile };
        }
      }
    } catch {
      // Supabase auth error handled below
    }

    return {
      success: false,
      error: "Credenciales incorrectas o cuenta sin habilitar."
    };
  }

  public static async requestPasswordReset(
    emailInput: string
  ): Promise<{ success: boolean; error?: string }> {
    const email = emailInput.trim().toLowerCase();
    if (!email.includes("@")) {
      return { success: false, error: "Ingrese un correo electrónico válido." };
    }

    const origin = typeof window !== "undefined"
      ? window.location.origin
      : "https://cafeteria-ten-pied.vercel.app";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/?reset-password=1`
    });

    if (error) {
      return { success: false, error: "Supabase no pudo enviar el correo de recuperación." };
    }
    return { success: true };
  }

  public static async updatePassword(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    if (password.length < 12) {
      return { success: false, error: "La nueva contraseña debe tener al menos 12 caracteres." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return {
        success: false,
        error: "El enlace venció o la sesión de recuperación no es válida. Solicite un nuevo correo."
      };
    }
    return { success: true };
  }

  public static async getCurrentUser(): Promise<UserRoleProfile | null> {
    this.clearLegacySessionCache();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const profile = await this.profileFromAuthUser(user);
    if (!profile) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    return profile;
  }

  public static onAuthStateChange(
    listener: (profile: UserRoleProfile | null) => void
  ): () => void {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        this.clearLegacySessionCache();
        listener(null);
        return;
      }

      void this.profileFromAuthUser(session.user).then((profile) => {
        listener(profile);
        if (!profile) void supabase.auth.signOut();
      });
    });

    return () => subscription.unsubscribe();
  }

  public static isAuthorizedAdmin(role: string | undefined): boolean {
    return role === "administrador" || role === "dueño";
  }

  public static hasPermission(role: string | undefined, permission: string): boolean {
    if (!role || !ALLOWED_ROLES.has(role as StaffRole)) return false;
    const permissions = ROLE_PERMISSIONS[role as StaffRole];
    return permissions.has("*") || permissions.has(permission);
  }

  public static async logout(): Promise<void> {
    this.clearLegacySessionCache();
    await supabase.auth.signOut().catch(() => undefined);
  }
}
