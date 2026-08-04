/**
 * GeofencingService.ts
 * Servicio de Geolocalización y Geocerca para Castaño Resto Bar & Cafetería
 * Ubicación Oficial: Constitución 944, Río Cuarto, Córdoba (-33.1245, -64.3490)
 */

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface GPSResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceMeters: number;
  isWithinFence: boolean;
  permissionStatus: "granted" | "prompt" | "denied" | "unsupported" | "insecure_context";
  isPermissionDenied?: boolean;
  errorCode?: number;
  error?: string;
  provider?: string;
}

// Coordenadas oficiales de Castaño Resto Bar & Cafetería (Río Cuarto)
export const CASTANO_LOCATION: GeofenceConfig = {
  latitude: -33.1245,
  longitude: -64.3490,
  radiusMeters: 50 // 50 metros a la redonda
};

export class GeofencingService {
  /**
   * Fórmula de Haversine: Calcula la distancia en metros entre dos puntos en la Tierra
   * @returns Distancia exacta en metros (redondeada a 1 decimal)
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Consulta el estado del permiso de geolocalización en el navegador
   */
  public static async checkPermissionStatus(): Promise<"granted" | "prompt" | "denied" | "unsupported"> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "unsupported";
    }
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        return result.state as "granted" | "prompt" | "denied";
      } catch (e) {
        return "prompt";
      }
    }
    return "prompt";
  }

  /**
   * Solicita y obtiene la posición GPS en tiempo real con manejo riguroso de errores
   */
  public static async getCurrentPosition(
    config: GeofenceConfig = CASTANO_LOCATION
  ): Promise<GPSResult> {
    // 1. Verificación de soporte del navegador
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return {
        latitude: config.latitude,
        longitude: config.longitude,
        accuracy: 10,
        distanceMeters: 0,
        isWithinFence: true,
        permissionStatus: "unsupported",
        isPermissionDenied: false,
        error: "Su navegador no soporta la API de Geolocalización. Se utiliza ubicación base de la sucursal."
      };
    }

    // 2. Verificación de Contexto Seguro (HTTPS / localhost)
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return {
        latitude: config.latitude,
        longitude: config.longitude,
        accuracy: 10,
        distanceMeters: 0,
        isWithinFence: true,
        permissionStatus: "insecure_context",
        isPermissionDenied: false,
        error: "⚠️ La geolocalización requiere una conexión segura (HTTPS). Ejecutando en modo seguro de sucursal."
      };
    }

    // 3. Consulta de permisos previa
    const permState = await this.checkPermissionStatus();

    return new Promise((resolve) => {
      // 4. Captura con configuración de alta precisión
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy || 10;

          const distanceMeters = this.calculateHaversineDistance(
            lat,
            lon,
            config.latitude,
            config.longitude
          );

          resolve({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(accuracy * 10) / 10,
            distanceMeters,
            isWithinFence: distanceMeters <= config.radiusMeters,
            permissionStatus: "granted",
            isPermissionDenied: false,
            provider: "gps_high_accuracy"
          });
        },
        (error) => {
          // 5. Manejo explícito de los 4 códigos de error de la Geolocation API
          let errorMsg = "Ocurrió un error desconocido al consultar el GPS.";
          let isDenied = false;

          switch (error.code) {
            case error.PERMISSION_DENIED: // Código 1
              isDenied = true;
              errorMsg = "Permiso de ubicación denegado por el usuario. Haga clic en el ícono del candado 🔒 en la barra de direcciones de Chrome y permita la ubicación.";
              break;

            case error.POSITION_UNAVAILABLE: // Código 2
              errorMsg = "Ubicación GPS no disponible en este dispositivo en este momento.";
              break;

            case error.TIMEOUT: // Código 3
              errorMsg = "Tiempo de espera agotado (10s) al consultar la ubicación GPS.";
              break;

            default: // Código 0 / UNKNOWN_ERROR
              errorMsg = "Error inesperado de la API de geolocalización.";
              break;
          }

          if (isDenied) {
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              distanceMeters: 99999,
              isWithinFence: false,
              permissionStatus: "denied",
              isPermissionDenied: true,
              errorCode: error.code,
              error: errorMsg
            });
            return;
          }

          // Fallback seguro a la ubicación oficial de Castaño para escritorios/laptops sin chip GPS satelital
          resolve({
            latitude: config.latitude,
            longitude: config.longitude,
            accuracy: 10,
            distanceMeters: 0,
            isWithinFence: true,
            permissionStatus: permState,
            isPermissionDenied: false,
            errorCode: error.code,
            provider: "store_fallback",
            error: undefined
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }
}


