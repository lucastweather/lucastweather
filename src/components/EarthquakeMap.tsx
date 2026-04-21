import { useEffect, useRef } from "react";
import type { Earthquake } from "@/lib/weather";

type Props = {
  quakes: Earthquake[];
  centerLat: number;
  centerLon: number;
};

/**
 * Interactive world map of recent earthquakes (USGS feed). Each epicenter is
 * a circle whose radius scales with magnitude and color shifts from info →
 * warning → danger. Clicking a quake opens its USGS detail page.
 */
export default function EarthquakeMap({ quakes, centerLat, centerLon }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const L = await import("leaflet");
      if (cancelled || !mapEl.current) return;
      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
        worldCopyJump: true,
      }).setView([centerLat, centerLon], 2);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 12 },
      ).addTo(map);
      mapRef.current = map;
      renderQuakes(L, map);
    }
    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers when quakes change
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    renderQuakes(L, mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quakes]);

  function renderQuakes(L: any, map: any) {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    const group = L.layerGroup();
    quakes.forEach((q) => {
      const [lon, lat] = q.coords;
      const color =
        q.mag >= 5
          ? "#ef4444"
          : q.mag >= 4
            ? "#f59e0b"
            : q.mag >= 3
              ? "#facc15"
              : "#38bdf8";
      const radius = Math.max(3, Math.min(22, q.mag * 3));
      const marker = L.circleMarker([lat, lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.55,
        weight: 1.5,
      });
      marker.bindTooltip(
        `<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.4">
          <strong>M ${q.mag.toFixed(1)}</strong> · ${escapeHtml(q.place)}<br/>
          ${new Date(q.time).toLocaleString()}
        </div>`,
        { direction: "top", opacity: 0.95 },
      );
      marker.on("click", () => {
        window.open(q.url, "_blank", "noopener");
      });
      group.addLayer(marker);
    });
    group.addTo(map);
    layerRef.current = group;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
      <div ref={mapEl} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
        © CARTO · OSM · USGS
      </div>
      <div className="absolute top-2 left-2 chip px-2 py-1 text-[10px] font-mono z-[400] flex gap-2 items-center">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-info" /> &lt;3
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-yellow-400" /> 3-4
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-warning" /> 4-5
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-danger" /> 5+
        </span>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
