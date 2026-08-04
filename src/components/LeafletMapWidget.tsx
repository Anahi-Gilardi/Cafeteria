import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapWidgetProps {
  lat: number;
  lng: number;
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
  storeLng = -64.349,
  radiusMeters = 50,
  address = "Constitución 944, Río Cuarto",
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

    const mapLat = lat && lat !== 0 ? lat : storeLat;
    const mapLng = lng && lng !== 0 ? lng : storeLng;

    // Inicializar mapa de Leaflet centrado en la sucursal de Castaño
    const map = L.map(mapContainerRef.current, {
      center: [mapLat, mapLng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Capa de Mapas de Alta Velocidad (OpenStreetMap Standard + CartoDB + Esri World Street Map)
    const osmTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: ["a", "b", "c"]
    });

    const esriTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    });

    osmTileLayer.addTo(map);

    osmTileLayer.on("tileerror", () => {
      if (map && !map.hasLayer(esriTileLayer)) {
        esriTileLayer.addTo(map);
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

    // Radio de Geocerca de 50 metros
    L.circle([storeLat, storeLng], {
      radius: radiusMeters,
      color: "#843747",
      weight: 2,
      fillColor: isWithinFence ? "#2E6F40" : "#A63F45",
      fillOpacity: 0.25
    }).addTo(map);

    // Marcador del empleado si difiere de la sucursal
    if (lat && lng && (lat !== storeLat || lng !== storeLng)) {
      const userMarker = L.marker([lat, lng], { icon: UserIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; text-align: center; padding: 4px;">
          <strong style="color: #2E6F40; font-size: 12px; display: block;">Ubicación Capturada</strong>
          <span style="font-size: 10px; color: #666;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>
        </div>
      `);
    }

    // Recalcular tamaño del mapa Leaflet en múltiples intervalos para garantizar renderizado de tiles
    const timer1 = setTimeout(() => map.invalidateSize(), 50);
    const timer2 = setTimeout(() => map.invalidateSize(), 250);
    const timer3 = setTimeout(() => map.invalidateSize(), 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, storeLat, storeLng, radiusMeters, address, isWithinFence]);

  return (
    <div className="w-full h-56 rounded-2xl overflow-hidden border border-[#D7BBA8] relative bg-[#E8D4C3]/30 shadow-inner">
      <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-2 left-2 z-[400] bg-[#FFF9F4]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#D7BBA8] shadow-sm pointer-events-auto flex items-center gap-1">
        <span className="text-[9px] font-black uppercase text-[#843747]">📍 Constitución 944, Río Cuarto</span>
      </div>
      <a
        href="https://www.google.com/maps/search/?api=1&query=-33.1245,-64.3490"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-[400] bg-[#843747] text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-[#71303D] transition-all shadow-sm pointer-events-auto flex items-center gap-1"
      >
        🗺️ Google Maps
      </a>
    </div>
  );
};
