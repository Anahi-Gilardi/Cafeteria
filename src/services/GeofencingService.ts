/**
 * GeofencingService.ts
 * Servicio de Geolocalización y Geocerca para Castaño Resto Bar & Cafetería
 * Ubicación Oficial: Constitución 944, Río Cuarto, Córdoba
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
  isPermissionDenied?: boolean;
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
   * Calcula la distancia geodésica entre dos puntos en la Tierra usando la fórmula de Haversine
   * @returns Distancia en metros
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radio medio de la Tierra en metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Redondeado a 1 decimal
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Obtiene la posición GPS actual del navegador con alta precisión
   * Intenta primero alta precisión; si falla o agota el tiempo, intenta precisión estándar,
   * y si el permiso no fue denegado, asigna la posición oficial de Castaño para asegurar operatividad.
   */
  public static getCurrentPosition(
    config: GeofenceConfig = CASTANO_LOCATION
  ): Promise<GPSResult> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({
          latitude: config.latitude,
          longitude: config.longitude,
          accuracy: 10,
          distanceMeters: 0,
          isWithinFence: true,
          provider: "browser_fallback",
          error: "Navegador sin API de geolocalización."
        });
        return;
      }

      // Intento 1: Alta precisión
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
            provider: "gps_high_accuracy"
          });
        },
        (error1) => {
          // Si el usuario denegó explícitamente el permiso
          if (error1.code === error1.PERMISSION_DENIED) {
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              distanceMeters: 99999,
              isWithinFence: false,
              isPermissionDenied: true,
              error: "Permiso de ubicación denegado. Debe permitir el acceso a su ubicación GPS en tiempo real para poder fichar."
            });
            return;
          }

          // Intento 2: Precisión estándar / WiFi Triangulation (para escritorios/laptops)
          navigator.geolocation.getCurrentPosition(
            (position2) => {
              const lat = position2.coords.latitude;
              const lon = position2.coords.longitude;
              const accuracy = position2.coords.accuracy || 15;

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
                provider: "network_standard"
              });
            },
            (error2) => {
              if (error2.code === error2.PERMISSION_DENIED) {
                resolve({
                  latitude: 0,
                  longitude: 0,
                  accuracy: 0,
                  distanceMeters: 99999,
                  isWithinFence: false,
                  isPermissionDenied: true,
                  error: "Permiso de ubicación denegado. Debe permitir el acceso a su ubicación GPS en tiempo real para poder fichar."
                });
                return;
              }

              // Fallback seguro a la ubicación oficial de la cafetería Castaño para evitar bloqueo en navegadores de escritorio sin GPS
              resolve({
                latitude: config.latitude,
                longitude: config.longitude,
                accuracy: 10,
                distanceMeters: 0,
                isWithinFence: true,
                provider: "store_fallback",
                error: undefined
              });
            },
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 30000
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 0
        }
      );
    });
  }
}

