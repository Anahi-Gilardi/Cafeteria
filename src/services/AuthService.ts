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

const SYSTEM_CREDENTIAL_ACCOUNTS = [
  {
    id: "usr-cocina",
    emails: ["cocina@castaño.com", "cocina@castano.com"],
    passwords: ["Castaño1234", "Castano1234", "castaño1234", "castano1234"],
    name: "Cocinero (Cocina & Chef)",
    role: "barista" as StaffRole
  },
  {
    id: "usr-dueno",
    emails: ["dueño@castaño.com", "dueno@castano.com", "dueño@castano.com"],
    passwords: ["Castaño2026/", "Castano2026/", "castaño2026/", "castano2026/"],
    name: "Dueño Castaño",
    role: "dueño" as StaffRole
  },
  {
    id: "usr-caja",
    emails: ["caja@castaño.com", "caja@castano.com"],
    passwords: ["Mostrador1234", "mostrador1234"],
    name: "Cajero Mostrador",
    role: "cajero" as StaffRole
  },
  {
    id: "usr-superadmin",
    emails: ["super@admin.com"],
    passwords: ["Superadmin1998", "superadmin1998"],
    name: "Superadmin",
    role: "administrador" as StaffRole
  },
  {
    id: "usr-admin-legacy",
    emails: ["admin@restobardelteatro.com", "admin"],
    passwords: ["1998"],
    name: "Administrador Castaño",
    role: "administrador" as StaffRole
  }
];

function normalizeEmail(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");
}

export class AuthService {
  private static clearLegacySessionCache(): void {
    try {
      localStorage.removeItem("castano_session_cache");
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
    const normEmail = normalizeEmail(rawEmail);
    const pass = passwordInput.trim();
    this.clearLegacySessionCache();

    // 1. Check system accounts pre-configured credentials
    const matchedAccount = SYSTEM_CREDENTIAL_ACCOUNTS.find((acc) => {
      const matchEmail = acc.emails.some(
        (e) => e.toLowerCase() === rawEmail || normalizeEmail(e) === normEmail
      );
      const matchPass = acc.passwords.includes(pass) || acc.passwords.includes(passwordInput);
      return matchEmail && matchPass;
    });

    if (matchedAccount) {
      const sysProfile: UserRoleProfile = {
        id: matchedAccount.id,
        authUserId: matchedAccount.id,
        email: matchedAccount.emails[0],
        name: matchedAccount.name,
        role: matchedAccount.role
      };
      try {
        localStorage.setItem("castano_active_user", JSON.stringify(sysProfile));
      } catch {
        // storage fallback
      }
      return { success: true, user: sysProfile };
    }

    if (!rawEmail.includes("@")) {
      return {
        success: false,
        error: "Ingrese el correo completo o credenciales válidas registradas."
      };
    }

    // 2. Try Supabase Auth
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
    return role === "administrador" || role === "dueño" || role === "cajero" || role === "barista" || role === "mesero";
  }

  public static hasPermission(role: string | undefined, permission: string): boolean {
    if (!role) return false;
    // Cocinero (barista) has access to all application views but CANNOT issue manual invoices
    if (role === "barista" && (permission === "manual_invoice" || permission === "invoice:manual")) {
      return false;
    }
    return true;
  }

  public static async logout(): Promise<void> {
    this.clearLegacySessionCache();
    await supabase.auth.signOut().catch(() => undefined);
  }
}
