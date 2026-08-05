<<<<<<< HEAD
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
=======
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, RefreshCw } from "lucide-react";

interface LeafletMapWidgetProps {
  currentLat?: number | null;
  currentLng?: number | null;
  accuracy?: number | null;
  storeLat?: number;
  storeLng?: number;
  storeRadiusMeters?: number;
  storeName?: string;
  storeAddress?: string;
}

const STORE_LAT_DEFAULT = -33.1245;
const STORE_LNG_DEFAULT = -64.3490;
const STORE_RADIUS_DEFAULT = 100; // 100 meters radius

export default function LeafletMapWidget({
  currentLat,
  currentLng,
  accuracy,
  storeLat = STORE_LAT_DEFAULT,
  storeLng = STORE_LNG_DEFAULT,
  storeRadiusMeters = STORE_RADIUS_DEFAULT,
  storeName = "CASTAÑO — Resto Bar Café",
  storeAddress = "Constitución 944, Río Cuarto, Córdoba"
}: LeafletMapWidgetProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeTileLayerIndex, setActiveTileLayerIndex] = useState<number>(0);

  const tileProviders = [
    {
      name: "CartoDB Voyager",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    },
    {
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    {
      name: "Esri World Street Map",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri"
    }
  ];
>>>>>>> 6f957d3 (feat: modulo completo de Control de Asistencia GPS Leaflet con tolerancia de escritorio, re-intento resiliente Supabase y enlaces a Google Maps)

  useEffect(() => {
    if (!mapContainerRef.current) return;

<<<<<<< HEAD
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
=======
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [storeLat, storeLng],
        zoom: 17,
        zoomControl: true
      });

      const provider = tileProviders[activeTileLayerIndex] || tileProviders[0];
      L.tileLayer(provider.url, {
        maxZoom: 19,
        attribution: provider.attribution
      }).addTo(map);

      // Store Marker
      const storeIcon = L.divIcon({
        className: "custom-store-pin",
        html: `<div style="background-color: #5C1D27; color: white; border: 2px solid #FAF2E6; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">🏛️</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<b>${storeName}</b><br/>${storeAddress}`)
        .openPopup();

      // Store Radius Circle (100m)
      L.circle([storeLat, storeLng], {
        radius: storeRadiusMeters,
        color: "#5C1D27",
        fillColor: "#5C1D27",
        fillOpacity: 0.15,
        weight: 2
      }).addTo(map);

      mapInstanceRef.current = map;

      // Multiple invalidateSize timers for robust tile rendering
      const t1 = setTimeout(() => map.invalidateSize(), 50);
      const t2 = setTimeout(() => map.invalidateSize(), 200);
      const t3 = setTimeout(() => map.invalidateSize(), 500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, []);

  // Update user location marker on coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLat && currentLng) {
      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: `<div style="background-color: #4F735A; color: white; border: 2px solid white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">👤</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([currentLat, currentLng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Ubicación del Colaborador</b><br/>Precisión: ${accuracy ? Math.round(accuracy) + 'm' : 'OK'}`);

      // Fit bounds to show both store and user
      const bounds = L.latLngBounds([
        [storeLat, storeLng],
        [currentLat, currentLng]
      ]);
      map.fitBounds(bounds.pad(0.3));
    }
  }, [currentLat, currentLng, accuracy, storeLat, storeLng]);

  const handleSwitchTileProvider = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const nextIndex = (activeTileLayerIndex + 1) % tileProviders.length;
    setActiveTileLayerIndex(nextIndex);

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const nextProvider = tileProviders[nextIndex];
    L.tileLayer(nextProvider.url, {
      maxZoom: 19,
      attribution: nextProvider.attribution
    }).addTo(map);

    map.invalidateSize();
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#CFB5A0] shadow-sm bg-[#EBDAC5]">
      {/* Map Header Overlay */}
      <div className="absolute top-2 left-2 z-[400] bg-[#FAF2E6]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#CFB5A0] text-[10px] font-bold text-[#2D0E13] flex items-center gap-1.5 shadow-xs">
        <MapPin className="h-3.5 w-3.5 text-[#5C1D27]" />
        <span>GPS Radar Salón: <strong>Río Cuarto ({storeRadiusMeters}m)</strong></span>
      </div>

      {/* Switch Map Layer Button */}
      <button
        type="button"
        onClick={handleSwitchTileProvider}
        title="Cambiar capa de mapa (OpenStreetMap / CartoDB / Esri)"
        className="absolute top-2 right-2 z-[400] bg-[#FAF2E6]/90 hover:bg-white backdrop-blur-md p-1.5 rounded-xl border border-[#CFB5A0] text-[10px] font-bold text-[#5C1D27] flex items-center gap-1 shadow-xs cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{tileProviders[activeTileLayerIndex].name}</span>
      </button>

      {/* Map Element Container */}
      <div ref={mapContainerRef} className="h-[250px] w-full z-[1]" />
    </div>
  );
}
>>>>>>> 6f957d3 (feat: modulo completo de Control de Asistencia GPS Leaflet con tolerancia de escritorio, re-intento resiliente Supabase y enlaces a Google Maps)
