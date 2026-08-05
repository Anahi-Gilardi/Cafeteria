export interface NominatimGeocodeResult {
  calle: string;
  numero: string;
  direccion_completa: string;
}

/**
 * Reverse geocoding via OpenStreetMap Nominatim API.
 * Extracts exact street name (calle), house number (numero) and full display address.
 */
export async function reverseGeocodeNominatim(
  lat: number,
  lng: number
): Promise<NominatimGeocodeResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "CastanoCafeteriaApp/1.0"
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const calle =
        addr.road ||
        addr.pedestrian ||
        addr.street ||
        addr.suburb ||
        "Ubicación GPS Real";

      const numero = addr.house_number || "";
      const ciudad = addr.city || addr.town || addr.village || "Río Cuarto";
      const provincia = addr.state || "Córdoba";

      const direccion_completa =
        data.display_name ||
        (numero ? `${calle} ${numero}, ${ciudad}, ${provincia}` : `${calle}, ${ciudad}, ${provincia}`);

      return {
        calle,
        numero,
        direccion_completa
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding API warning:", err);
  }

  // Resilient fallback: return exact GPS coordinates display string
  return {
    calle: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    numero: "",
    direccion_completa: `GPS Posición Real (${lat.toFixed(5)}, ${lng.toFixed(5)}), Río Cuarto`
  };
}

/**
 * Helper to format timestamp as YYYY-MM-DD HH:mm:ss
 */
export function formatPreciseTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Calculate Haversine distance in meters between user position (lat1, lon1)
 * and store location (default: Sucursal Castaño -33.1245, -64.3490).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number = -33.1245,
  lon2: number = -64.3490
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
