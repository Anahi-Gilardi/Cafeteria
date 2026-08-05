import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, RefreshCw } from "lucide-react";

interface LeafletMapWidgetProps {
  currentLat?: number | null;
  currentLng?: number | null;
  accuracy?: number | null;
  lastClockType?: "INGRESO" | "EGRESO" | null;
  lastClockTimestamp?: string | null;
  lastClockAddress?: string | null;
  lastClockCalle?: string | null;
  lastClockNumero?: string | null;
  storeLat?: number;
  storeLng?: number;
  storeRadiusMeters?: number;
  storeName?: string;
  storeAddress?: string;
}

const STORE_LAT_DEFAULT = -33.1245;
const STORE_LNG_DEFAULT = -64.3490;
const STORE_RADIUS_DEFAULT = 100;

export default function LeafletMapWidget({
  currentLat,
  currentLng,
  accuracy,
  lastClockType,
  lastClockTimestamp,
  lastClockAddress,
  lastClockCalle,
  lastClockNumero,
  storeLat = STORE_LAT_DEFAULT,
  storeLng = STORE_LNG_DEFAULT,
  storeRadiusMeters = STORE_RADIUS_DEFAULT,
  storeName = "CASTAÑO — Resto Bar Café",
  storeAddress = "Constitución 944, Río Cuarto, Córdoba"
}: LeafletMapWidgetProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [activeTileLayerIndex, setActiveTileLayerIndex] = useState<number>(0);

  const tileProviders = [
    {
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    {
      name: "CartoDB Voyager",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    },
    {
      name: "Esri World Street Map",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri"
    }
  ];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialLat = currentLat || storeLat;
    const initialLng = currentLng || storeLng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
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
      .bindPopup(`<b>${storeName}</b><br/>${storeAddress}`);

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
  }, []);

  // Update user location marker & popup on coordinates/clocking change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (currentLat && currentLng) {
      const isEgreso = lastClockType === "EGRESO";
      const markerColor = isEgreso ? "#843747" : "#2E6F40";
      const markerSymbol = isEgreso ? "🔴" : "🟢";
      const labelType = isEgreso ? "🔴 EGRESO REGISTRADO" : "🟢 INGRESO REGISTRADO";

      const userIcon = L.divIcon({
        className: "custom-user-clock-pin",
        html: `<div style="background-color: ${markerColor}; color: white; border: 2px solid white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">${markerSymbol}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const displayAddress = (lastClockCalle && lastClockNumero)
        ? `${lastClockCalle} ${lastClockNumero}`
        : (lastClockAddress || storeAddress);

      const popupHTML = `
        <div style="font-family: sans-serif; text-align: center; padding: 6px; min-width: 180px;">
          <strong style="color: ${markerColor}; font-size: 13px; display: block; margin-bottom: 3px;">
            ${labelType}
          </strong>
          <span style="font-size: 11px; font-weight: bold; color: #4A151D; display: block;">
            ⏱️ ${lastClockTimestamp || new Date().toLocaleString("es-AR")}
          </span>
          <span style="font-size: 11px; color: #2D0E13; font-weight: 600; display: block; margin-top: 3px;">
            📍 ${displayAddress}
          </span>
        </div>
      `;

      const marker = L.marker([currentLat, currentLng], { icon: userIcon })
        .addTo(map)
        .bindPopup(popupHTML);

      userMarkerRef.current = marker;

      // Center map & open popup automatically
      map.setView([currentLat, currentLng], 17);
      marker.openPopup();
    }
  }, [currentLat, currentLng, accuracy, lastClockType, lastClockTimestamp, lastClockAddress, lastClockCalle, lastClockNumero, storeLat, storeLng]);

  const handleSwitchTileProvider = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const nextIndex = (activeTileLayerIndex + 1) % tileProviders.length;
    setActiveTileLayerIndex(nextIndex);

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
      <div className="absolute top-2 left-2 z-[400] bg-[#FAF2E6]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#CFB5A0] text-[10px] font-bold text-[#2D0E13] flex items-center gap-1.5 shadow-xs">
        <MapPin className="h-3.5 w-3.5 text-[#5C1D27]" />
        <span>GPS Radar Salón: <strong>Río Cuarto ({storeRadiusMeters}m)</strong></span>
      </div>

      {/* Switch Map Layer Button */}
      <button
        type="button"
        onClick={handleSwitchTileProvider}
        title="Cambiar capa de mapa (OpenStreetMap / CartoDB / Esri)"
        className="absolute top-2 right-2 z-[400] bg-[#FAF2E6]/95 hover:bg-white backdrop-blur-md p-1.5 rounded-xl border border-[#CFB5A0] text-[10px] font-bold text-[#5C1D27] flex items-center gap-1 shadow-xs cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{tileProviders[activeTileLayerIndex].name}</span>
      </button>

      {/* Map Element Container */}
      <div ref={mapContainerRef} className="h-[250px] w-full z-[1]" />
    </div>
  );
}
