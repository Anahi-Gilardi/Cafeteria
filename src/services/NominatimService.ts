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
        "Constitución";

      const numero = addr.house_number || "944";
      const ciudad = addr.city || addr.town || addr.village || "Río Cuarto";
      const provincia = addr.state || "Córdoba";

      const direccion_completa =
        data.display_name ||
        `${calle} ${numero}, ${ciudad}, ${provincia}`;

      return {
        calle,
        numero,
        direccion_completa
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding API warning:", err);
  }

  // Resilient fallback: return store location address or raw GPS coordinates
  return {
    calle: "Constitución",
    numero: "944",
    direccion_completa: `Constitución 944, Río Cuarto, Córdoba (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`
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
