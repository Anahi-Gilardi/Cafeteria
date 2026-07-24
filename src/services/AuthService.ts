import { UserRole } from "../types";

export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  pin: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PermissionDefinition {
  role: UserRole;
  allowedActions: string[];
}

export class AuthService {
  private static failedPinAttempts: Record<string, { count: number; lockUntil: number }> = {};

  /**
   * Matriz RBAC de Control de Permisos por Rol
   */
  private static ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    administrador: [
      "dashboard:read", "stock:read", "stock:write", "menu:read", "menu:write", 
      "salon:read", "salon:write", "pos:read", "pos:write", "pos:modify_price", 
      "pos:cancel_order", "users:read", "users:write", "reports:read"
    ],
    dueño: [
      "dashboard:read", "stock:read", "stock:write", "menu:read", "menu:write", 
      "salon:read", "salon:write", "pos:read", "pos:write", "pos:modify_price", 
      "pos:cancel_order", "users:read", "users:write", "reports:read"
    ],
    cajero: [
      "dashboard:read", "pos:read", "pos:write", "pos:arca_billing", 
      "salon:read", "reports:read"
    ],
    mesero: [
      "salon:read", "salon:write", "pos:create_order", "pos:request_bill"
    ],
    barista: [
      "kds:read", "kds:update_status", "stock:read"
    ]
  };

  /**
   * Autenticación Ultra-Rápida por PIN de 4 dígitos para Mozos y Personal de Barra/Cocina.
   */
  static authenticateByPin(pin: string, users: any[]): { success: boolean; user?: any; error?: string } {
    const clientKey = "device-pin-auth";
    const now = Date.now();

    // Protección contra Fuerza Bruta: Verificar bloqueo
    const attemptInfo = this.failedPinAttempts[clientKey];
    if (attemptInfo && attemptInfo.lockUntil > now) {
      const remainingSecs = Math.ceil((attemptInfo.lockUntil - now) / 1000);
      return {
        success: false,
        error: `⛔ Demasiados intentos fallidos. Dispositivo bloqueado por ${remainingSecs} segundos.`
      };
    }

    // Buscar usuario por PIN de 4 dígitos
    const matchedUser = users.find(u => u.pin === pin);

    if (!matchedUser) {
      // Registrar intento fallido
      const current = attemptInfo ? attemptInfo.count + 1 : 1;
      const lockUntil = current >= 5 ? now + 60000 : 0; // Bloqueo de 60s al quinto fallo
      this.failedPinAttempts[clientKey] = { count: current, lockUntil };

      return {
        success: false,
        error: current >= 5 ? "⛔ Bloqueado por seguridad tras 5 intentos incorrectos." : `PIN incorrecto (${current}/5 intentos).`
      };
    }

    // Resetear contador al autenticar con éxito
    delete this.failedPinAttempts[clientKey];

    // Generar Tokens de Sesión (Simulación JWT + Silent Refresh)
    const session = this.generateSessionTokens(matchedUser);

    return {
      success: true,
      user: { ...matchedUser, ...session }
    };
  }

  /**
   * Valida si un rol posee un permiso específico en la matriz RBAC.
   */
  static hasPermission(role: UserRole, action: string): boolean {
    if (role === "administrador" || role === "dueño") return true;
    const permissions = this.ROLE_PERMISSIONS[role] || [];
    return permissions.includes(action);
  }

  /**
   * Generación de Access Token (15 min) y Refresh Token silencioso.
   */
  private static generateSessionTokens(user: any): { accessToken: string; refreshToken: string; expiresAt: number } {
    const now = Date.now();
    return {
      accessToken: `jwt.access.${user.id}.${now + 15 * 60 * 1000}`,
      refreshToken: `jwt.refresh.${user.id}.${now + 7 * 24 * 60 * 60 * 1000}`,
      expiresAt: now + 15 * 60 * 1000
    };
  }

  /**
   * Renovación Silenciosa de Sesión (Silent Refresh Engine) para Tablets de Salón/KDS.
   */
  static refreshSession(refreshToken: string, user: any): { accessToken: string; expiresAt: number } | null {
    if (!refreshToken || !refreshToken.startsWith("jwt.refresh")) {
      return null;
    }
    const now = Date.now();
    return {
      accessToken: `jwt.access.${user.id}.${now + 15 * 60 * 1000}`,
      expiresAt: now + 15 * 60 * 1000
    };
  }
}
