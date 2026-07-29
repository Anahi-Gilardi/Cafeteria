import { supabase } from "../lib/supabase";

export interface UserRoleProfile {
  id: string;
  email: string;
  name: string;
  role: "administrador" | "dueño" | "barista" | "mesero";
}

export class AuthService {
  /**
   * Performs secure authentication via Supabase Auth or fallback RBAC
   */
  public static async loginWithCredentials(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserRoleProfile; error?: string }> {
    try {
      // 1. Attempt Supabase Auth login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.includes("@") ? emailInput : `${emailInput}@restobardelteatro.com.ar`,
        password: passwordInput
      });

      if (!error && data.user) {
        const role = (data.user.user_metadata?.role as any) || "administrador";
        const name = data.user.user_metadata?.name || data.user.email?.split("@")[0] || "Administrador";

        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || emailInput,
            name,
            role
          }
        };
      }
    } catch (e) {
      console.warn("Supabase Auth sign-in warning:", e);
    }

    // 2. Local role fallback for initial demo/offline mode
    const cleanUser = emailInput.trim().toLowerCase();
    if (cleanUser === "admin" || cleanUser === "admin@restobardelteatro.com" || cleanUser === "pablo@restobardelteatro.com") {
      if (passwordInput === "1998" || passwordInput === "pablo123") {
        return {
          success: true,
          user: {
            id: "usr-admin",
            email: "admin@restobardelteatro.com",
            name: "Administrador Teatro",
            role: "administrador"
          }
        };
      }
    }

    if (cleanUser === "barista" || cleanUser === "rami@restobardelteatro.com") {
      if (passwordInput === "barista123" || passwordInput === "2222") {
        return {
          success: true,
          user: {
            id: "usr-barista",
            email: "barista@restobardelteatro.com",
            name: "Barista Principal",
            role: "barista"
          }
        };
      }
    }

    if (cleanUser === "mesero" || cleanUser === "silvana@restobardelteatro.com") {
      if (passwordInput === "mesero123" || passwordInput === "3333") {
        return {
          success: true,
          user: {
            id: "usr-mesero",
            email: "mesero@restobardelteatro.com.ar",
            name: "Mozo de Salón",
            role: "mesero"
          }
        };
      }
    }

    return { success: false, error: "Credenciales de acceso incorrectas." };
  }

  /**
   * Validates if a user role has access to administrative functions
   */
  public static isAuthorizedAdmin(role: string | undefined): boolean {
    return role === "administrador" || role === "dueño";
  }

  /**
   * Validates if a user role has specific permission
   */
  public static hasPermission(role: string | undefined, permission: string): boolean {
    if (!role) return false;
    if (role === "administrador" || role === "dueño") return true;
    if (role === "barista") {
      return permission.startsWith("kds:") || permission.startsWith("kitchen:") || permission.startsWith("pos:read");
    }
    if (role === "mesero") {
      return permission.startsWith("pos:") || permission.startsWith("orders:");
    }
    return false;
  }

  /**
   * Signs out user session cleanly
   */
  public static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign-out exception:", e);
    }
  }
}
