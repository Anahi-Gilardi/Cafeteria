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
  error?: string;
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
   */
  public static getCurrentPosition(
    config: GeofenceConfig = CASTANO_LOCATION
  ): Promise<GPSResult> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          distanceMeters: 99999,
          isWithinFence: false,
          error: "El navegador no soporta geolocalización GPS."
        });
        return;
      }

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

          const isWithinFence = distanceMeters <= config.radiusMeters;

          resolve({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(accuracy * 10) / 10,
            distanceMeters,
            isWithinFence
          });
        },
        (error) => {
          let errorMsg = "Error al obtener la ubicación GPS.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Permiso de ubicación denegado. Active el GPS en su navegador.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Ubicación GPS no disponible en este momento.";
              break;
            case error.TIMEOUT:
              errorMsg = "Tiempo de espera agotado al consultar la ubicación GPS.";
              break;
          }

          resolve({
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            distanceMeters: 99999,
            isWithinFence: false,
            error: errorMsg
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }
}
