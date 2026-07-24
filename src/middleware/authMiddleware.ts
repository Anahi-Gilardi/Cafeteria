import { AuthService } from "../services/AuthService";
import { UserRole } from "../types";

export interface AuthenticatedRequest {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
  headers: Record<string, string | undefined>;
}

export class AuthMiddleware {
  /**
   * Middleware para validar el Bearer Token JWT en headers de solicitudes API.
   */
  static verifyJwtToken(req: AuthenticatedRequest): { isAuthorized: boolean; error?: string } {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        isAuthorized: false,
        error: "401 Unauthorized: Ausencia de token de autenticación Bearer JWT."
      };
    }

    const token = authHeader.split(" ")[1];
    if (!token.startsWith("jwt.access")) {
      return {
        isAuthorized: false,
        error: "403 Forbidden: Token de acceso caducado o inválido."
      };
    }

    return { isAuthorized: true };
  }

  /**
   * Middleware Guard para enforzar el Control de Acceso por Roles (RBAC).
   */
  static requirePermission(userRole: UserRole, requiredPermission: string): { isAllowed: boolean; error?: string } {
    const allowed = AuthService.hasPermission(userRole, requiredPermission);

    if (!allowed) {
      return {
        isAllowed: false,
        error: `403 Forbidden: El rol '${userRole}' no tiene privilegios para ejecutar '${requiredPermission}'.`
      };
    }

    return { isAllowed: true };
  }
}
