import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapWidgetProps {
  lat?: number | null;
  lng?: number | null;
  storeLat?: number;
  storeLng?: number;
  radiusMeters?: number;
  address?: string;
  isWithinFence?: boolean;
}

// Configuración de íconos por defecto de Leaflet
const StoreIcon = L.divIcon({
  className: "custom-leaflet-store-marker",
  html: `
    <div style="
      background-color: #843747;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    ">☕</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const UserIcon = L.divIcon({
  className: "custom-leaflet-user-marker",
  html: `
    <div style="
      background-color: #2E6F40;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
    ">🧑‍🍳</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export const LeafletMapWidget: React.FC<LeafletMapWidgetProps> = ({
  lat,
  lng,
  storeLat = -33.1245,
  storeLng = -64.3490,
  radiusMeters = 50,
  address = "Constitución 944, Río Cuarto, Córdoba",
  isWithinFence = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destruir mapa previo si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const hasDevicePosition =
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat !== 0;

    const mapLat = hasDevicePosition ? (lat as number) : storeLat;
    const mapLng = hasDevicePosition ? (lng as number) : storeLng;

    // Inicializar mapa de Leaflet centrado en Castaño
    const map = L.map(mapContainerRef.current, {
      center: [mapLat, mapLng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Capas Tile Layer resilientes con fallback automático
    const osmTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: ["a", "b", "c"]
    });

    const cartoTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd"
    });

    osmTileLayer.addTo(map);

    osmTileLayer.on("tileerror", () => {
      if (map && !map.hasLayer(cartoTileLayer)) {
        cartoTileLayer.addTo(map);
      }
    });

    // Marcador Sucursal Castaño
    const storeMarker = L.marker([storeLat, storeLng], { icon: StoreIcon }).addTo(map);
    storeMarker.bindPopup(`
      <div style="font-family: sans-serif; text-align: center; padding: 4px;">
        <strong style="color: #843747; font-size: 13px; display: block;">CASTAÑO Resto Bar</strong>
        <span style="font-size: 11px; color: #555;">📍 ${address}</span>
      </div>
    `);

    // Radio operativo de la geocerca (50m)
    L.circle([storeLat, storeLng], {
      radius: radiusMeters,
      color: "#843747",
      weight: 2,
      fillColor: isWithinFence ? "#2E6F40" : "#A63F45",
      fillOpacity: 0.25
    }).addTo(map);

    // Marcador del empleado si difiere de la sucursal
    if (hasDevicePosition && (lat !== storeLat || lng !== storeLng)) {
      const deviceLat = lat as number;
      const deviceLng = lng as number;
      const userMarker = L.marker([deviceLat, deviceLng], { icon: UserIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; text-align: center; padding: 4px;">
          <strong style="color: #2E6F40; font-size: 12px; display: block;">Ubicación Capturada</strong>
          <span style="font-size: 10px; color: #666;">Lat: ${deviceLat.toFixed(5)}, Lng: ${deviceLng.toFixed(5)}</span>
        </div>
      `);
    }

    // Recalcular tamaño del mapa Leaflet en múltiples intervalos para garantizar renderizado de tiles sin conflicto CSS
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, storeLat, storeLng, radiusMeters, address, isWithinFence]);

  return (
    <div className="w-full h-56 rounded-2xl overflow-hidden border border-[#D7BBA8] relative bg-[#F8F1EA] shadow-inner">
      {/* Corrección de estilos CSS para evitar colapso de azulejos por reset de Tailwind */}
      <style>{`
        .leaflet-container img.leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          width: 256px !important;
          height: 256px !important;
        }
        .leaflet-container {
          background-color: #f8f1ea !important;
        }
      `}</style>
      <div id="map" ref={mapContainerRef} className="w-full h-full z-0" aria-label="Mapa de ubicación del fichaje" />
      <div className="absolute bottom-2 left-2 z-[400] bg-[#FFF9F4]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#D7BBA8] shadow-sm pointer-events-auto flex items-center gap-1">
        <span className="text-[9px] font-black uppercase text-[#843747]">📍 {address}</span>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${storeLat},${storeLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-[400] bg-[#843747] text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-[#71303D] transition-all shadow-sm pointer-events-auto flex items-center gap-1"
      >
        🗺️ Abrir Google Maps
      </a>
    </div>
  );
};
