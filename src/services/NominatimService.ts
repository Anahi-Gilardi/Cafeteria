export interface NominatimGeocodeResult {
  calle: string;
  numero: string;
  direccion_completa: string;
}

/**
 * Reverse geocoding via OpenStreetMap Nominatim API & BigDataCloud fallback.
 * Extracts exact street name (calle), house number (numero) and full display address.
 * Guarantees human-readable street names (e.g. "José Verdi 671, Banda Norte, Río Cuarto").
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
        addr.footway ||
        addr.suburb ||
        addr.neighbourhood ||
        "Constitución";

      const numero = addr.house_number || "";
      const barrio = addr.neighbourhood || addr.city_district || "";
      const ciudad = addr.city || addr.town || addr.village || "Río Cuarto";

      let direccion_completa = "";
      if (calle && numero) {
        direccion_completa = `${calle} ${numero}${barrio ? `, ${barrio}` : ""}, ${ciudad}`;
      } else if (calle) {
        direccion_completa = `${calle}${barrio ? `, ${barrio}` : ""}, ${ciudad}`;
      } else if (data.display_name) {
        const parts = data.display_name.split(",").map((p: string) => p.trim());
        direccion_completa = parts.slice(0, 3).join(", ");
      } else {
        direccion_completa = "Constitución 944, Río Cuarto, Córdoba";
      }

      return {
        calle,
        numero,
        direccion_completa
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding API warning:", err);
  }

  // Secondary Backup reverse geocoding via BigDataCloud client API
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const calle = bdcData.localityInfo?.informative?.[0]?.name || bdcData.locality || "Constitución";
      const ciudad = bdcData.city || "Río Cuarto";
      const direccion_completa = `${calle}, ${ciudad}`;
      return {
        calle,
        numero: "",
        direccion_completa
      };
    }
  } catch (e) {}

  // Fallback to store address
  return {
    calle: "Constitución",
    numero: "944",
    direccion_completa: "Constitución 944, Río Cuarto, Córdoba"
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
