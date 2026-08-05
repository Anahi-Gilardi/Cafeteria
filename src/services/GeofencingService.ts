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
    if (!result) return { ok: false, message: "Autorice la ubicación antes de fichar." };
    if (result.permissionStatus !== "granted") {
      return { ok: false, message: result.error || "La ubicación no está autorizada." };
    }
    if (
      result.latitude === null ||
      result.longitude === null ||
      result.accuracy === null ||
      result.distanceMeters === null ||
      !Number.isFinite(result.latitude) ||
      !Number.isFinite(result.longitude)
    ) {
      return { ok: false, message: result.error || "La lectura GPS no es válida." };
    }
    if (result.accuracy <= 0 || result.accuracy > config.maxAccuracyMeters) {
      return {
        ok: false,
        message: `La precisión es de ±${Math.round(result.accuracy)} m; se requieren ±${config.maxAccuracyMeters} m o menos.`
      };
    }
    if (!result.isWithinFence || result.distanceMeters > config.radiusMeters) {
      return {
        ok: false,
        message: `Está a ${Math.round(result.distanceMeters)} m del local; el fichaje requiere estar dentro de ${config.radiusMeters} m.`
      };
    }
    return { ok: true, message: "Ubicación válida para fichar." };
  }
}
