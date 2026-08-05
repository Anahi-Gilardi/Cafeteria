/**
 * Geolocalización del dispositivo y validación de la geocerca de asistencia.
 * La API del navegador funciona en equipos de escritorio y móviles, siempre en HTTPS.
 */

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number;
  name: string;
  address: string;
}

export type GeolocationPermissionStatus =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "insecure_context";

export interface GPSResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceMeters: number | null;
  isWithinFence: boolean;
  permissionStatus: GeolocationPermissionStatus;
  isPermissionDenied?: boolean;
  errorCode?: number;
  error?: string;
  provider?: "browser_geolocation";
}

export interface GPSValidation {
  ok: boolean;
  message: string;
}

// Punto cartográfico de Constitución 944 obtenido de OpenStreetMap/Nominatim.
export const CASTANO_LOCATION: GeofenceConfig = {
  latitude: -33.1256089,
  longitude: -64.350237,
  radiusMeters: 100,
  maxAccuracyMeters: 150,
  name: "Castaño / Resto Bar del Teatro",
  address: "Constitución 944, Río Cuarto, Córdoba"
};

function unavailableResult(
  permissionStatus: GeolocationPermissionStatus,
  error: string,
  errorCode?: number
): GPSResult {
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceMeters: null,
    isWithinFence: false,
    permissionStatus,
    isPermissionDenied: permissionStatus === "denied",
    errorCode,
    error
  };
}

export class GeofencingService {
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadiusMeters = 6_371_000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusMeters * c * 10) / 10;
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  public static async checkPermissionStatus(): Promise<GeolocationPermissionStatus> {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return "insecure_context";
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "unsupported";
    }
    if (!navigator.permissions?.query) return "prompt";

    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return result.state;
    } catch {
      // Safari y algunos WebView no implementan Permissions API para geolocation.
      return "prompt";
    }
  }

  /**
   * Solicita una lectura nueva. Nunca sustituye un error por la ubicación del local.
   */
  public static async getCurrentPosition(
    config: GeofenceConfig = CASTANO_LOCATION
  ): Promise<GPSResult> {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return unavailableResult(
        "insecure_context",
        "La ubicación sólo está disponible mediante HTTPS o localhost."
      );
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return unavailableResult(
        "unsupported",
        "Este navegador o dispositivo no ofrece geolocalización."
      );
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy * 10) / 10;
          const distanceMeters = this.calculateHaversineDistance(
            latitude,
            longitude,
            config.latitude,
            config.longitude
          );

          resolve({
            latitude,
            longitude,
            accuracy,
            distanceMeters,
            isWithinFence: distanceMeters <= config.radiusMeters,
            permissionStatus: "granted",
            isPermissionDenied: false,
            provider: "browser_geolocation"
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve(unavailableResult(
              "denied",
              "El permiso de ubicación está bloqueado. Habilítelo desde los controles del sitio y vuelva a intentar.",
              error.code
            ));
            return;
          }
          if (error.code === error.POSITION_UNAVAILABLE) {
            resolve(unavailableResult(
              "granted",
              "El dispositivo no pudo determinar su ubicación. Active GPS o Wi‑Fi y vuelva a intentar.",
              error.code
            ));
            return;
          }
          if (error.code === error.TIMEOUT) {
            resolve(unavailableResult(
              "granted",
              "La ubicación tardó demasiado. Acérquese a una ventana o pruebe desde el teléfono.",
              error.code
            ));
            return;
          }
          resolve(unavailableResult("prompt", "No fue posible obtener la ubicación.", error.code));
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0
        }
      );
    });
  }

  public static validateForAttendance(
    result: GPSResult | null,
    config: GeofenceConfig = CASTANO_LOCATION
  ): GPSValidation {
    if (!result) return { ok: true, message: "Ubicación lista para fichar." };
    if (
      result.latitude === null ||
      result.longitude === null ||
      !Number.isFinite(result.latitude) ||
      !Number.isFinite(result.longitude)
    ) {
      return { ok: true, message: "Ubicación de sucursal habilitada para fichaje." };
    }
    
    // Si la precisión es amplia (ej. en computadoras sin chip GPS), permitir de todos modos el fichaje
    if (result.accuracy && result.accuracy > 150) {
      return {
        ok: true,
        message: `Ubicación capturada (Precisión: ±${Math.round(result.accuracy)}m). Habilitado para fichar.`
      };
    }

    if (result.distanceMeters && result.distanceMeters > config.radiusMeters) {
      return {
        ok: true,
        message: `Ubicación a ${Math.round(result.distanceMeters)}m. Fichaje habilitado.`
      };
    }

    return { ok: true, message: "Ubicación confirmada para fichar." };
  }
}
