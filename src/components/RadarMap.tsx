import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type Frame = { time: number; path: string };
type ApiResp = {
  version: string;
  generated: number;
  host: string;
  radar: { past: Frame[]; nowcast: Frame[] };
  satellite: { infrared: Frame[] };
};

export type RadarLayer = "radar" | "satellite" | "precip" | "clouds" | "temp" | "wind" | "lightning";

type Props = {
  lat: number;
  lon: number;
  /** When false, hide the nowcast (forecast) frames — gates premium feature */
  showForecast?: boolean;
  /** Active overlay layer. Defaults to "radar". */
  layer?: RadarLayer;
  /** Notify parent of computed nowcast precipitation (0..1 intensity). */
  onNowcast?: (intensity: number, hasRain: boolean) => void;
  /** Notify parent of satellite-derived cloud cover (0..100 percent). */
  onSatelliteClouds?: (cloudCoverPct: number) => void;
};

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";
const STATIC_FRAME: Frame = { time: 0, path: "static-live-layer" };
const STATIC_FRAMES: Frame[] = [STATIC_FRAME];
const NOAA_WMS: Partial<Record<RadarLayer, { url: string; layers: string; opacity: number; attribution: string }>> = {
  satellite: {
    url: "https://nowcoast.noaa.gov/geoserver/observations/satellite/wms",
    layers: "global_visible_imagery_mosaic",
    opacity: 0.78,
    attribution: "NOAA nowCOAST satellite",
  },
  clouds: {
    url: "https://nowcoast.noaa.gov/geoserver/observations/satellite/wms",
    layers: "global_longwave_imagery_mosaic",
    opacity: 0.72,
    attribution: "NOAA nowCOAST satellite",
  },
  precip: {
    url: "https://mapservices.weather.noaa.gov/raster/services/obs/mrms_qpe/ImageServer/WMSServer",
    layers: "mrms_qpe:rft_1hr",
    opacity: 0.72,
    attribution: "NOAA MRMS precipitation",
  },
  temp: {
    url: "https://nowcoast.noaa.gov/geoserver/ows",
    layers: "ndfd_temperature:air_temperature",
    opacity: 0.66,
    attribution: "NOAA/NWS temperature",
  },
  wind: {
    url: "https://nowcoast.noaa.gov/geoserver/ows",
    layers: "ndfd_wind:wind_speed",
    opacity: 0.68,
    attribution: "NOAA/NWS wind",
  },
  lightning: {
    url: "https://nowcoast.noaa.gov/geoserver/ows",
    layers: "lightning_detection:ldn_lightning_strike_density",
    opacity: 0.82,
    attribution: "NOAA lightning density",
  },
};

/**
 * Build a RainViewer tile URL. RainViewer exposes a tile path plus four URL
 * params:
 *   /{path}/{size}/{z}/{x}/{y}/{color}/{options}.png
 *
 * - color: 0 (B&W), 2 (rainbow universal blue), 3 (cool blues),
 *   4 (Universal Blue dark), 7 (Rainbow Selex IS), etc.
 * - options is "smooth_snow" → "1_1" (smoothed, snow as separate color),
 *   "1_0" (smoothed only), "0_1" (snow only), "0_0" (raw).
 *
 * For satellite (infrared), color schemes 0 (B&W IR), 1, 2 are typical.
 */
function tileUrl(host: string, path: string, layer: RadarLayer): string {
  switch (layer) {
    case "precip":
      // Heavier precipitation color scheme
      return `${host}${path}/256/{z}/{x}/{y}/4/1_1.png`;
    case "radar":
    case "temp":
    case "wind":
    case "lightning":
    default:
      return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
  }
}

function createOverlayLayer(L: any, host: string, frame: Frame, layer: RadarLayer) {
  const wms = NOAA_WMS[layer];
  if (wms) {
    return L.tileLayer.wms(wms.url, {
      layers: wms.layers,
      format: "image/png",
      transparent: true,
      opacity: 0,
      zIndex: 10,
      version: "1.1.1",
      attribution: wms.attribution,
    });
  }

  return L.tileLayer(tileUrl(host, frame.path, layer), { opacity: 0, zIndex: 10, tileSize: 256 });
}

/**
 * Real animated radar/satellite tile layer using RainViewer's free, no-auth
 * API. Tiles are composited over an OpenStreetMap base via Leaflet. Past
 * frames cover ~2 hours; nowcast frames cover up to 30 minutes ahead.
 *
 * In addition to driving the visual, we sample tiles at the user's location:
 *  - radar/precip → MinuteCast precipitation sync (`onNowcast`)
 *  - satellite IR → live cloud-cover percentage for current weather (`onSatelliteClouds`)
 */
export default function RadarMap({
  lat,
  lon,
  showForecast = false,
  layer = "radar",
  onNowcast,
  onSatelliteClouds,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any>>({});
  const [radarFrames, setRadarFrames] = useState<Frame[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [host, setHost] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1200); // ms per frame; user-adjustable
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

  const useSatellite = layer === "satellite" || layer === "clouds";
  const useStaticNoaaLayer = Boolean(NOAA_WMS[layer]);
  const frames = useStaticNoaaLayer ? STATIC_FRAMES : radarFrames;

  // Init Leaflet (CDN) + map
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
      leafletRef.current = L;
      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([lat, lon], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
      }).addTo(map);
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#38bdf8",
        fillColor: "#38bdf8",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);
      map.on("mousemove", (e: any) => {
        setHover({ lat: e.latlng.lat, lon: e.latlng.lng });
      });
      map.on("mouseout", () => setHover(null));
      mapRef.current = map;
      setReady(true);
    }
    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = {};
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  // Fetch radar + satellite frame index. Probe both rain (radar nowcast) and
  // clouds (satellite IR) at the user's location every refresh.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(RAINVIEWER_API)
        .then((r) => r.json() as Promise<ApiResp>)
        .then(async (d) => {
          if (cancelled) return;
          const past = d.radar.past ?? [];
          const nowcast = d.radar.nowcast ?? [];
          const all = showForecast ? [...past, ...nowcast] : past;
          setHost(d.host);
          setRadarFrames(all);
          setPastCount(past.length);

          // Current-condition sync must use the latest observed radar frames,
          // not a future nowcast frame. We require the two most recent
          // observed frames to agree before declaring rain overhead, so a
          // single noisy tile can't lock the app into "raining" forever.
          const recent = past.slice(-2);
          if (recent.length === 0) recent.push(nowcast[0]!);
          if (onNowcast) {
            try {
              const alphas = await Promise.all(
                recent
                  .filter(Boolean)
                  .map((f) => probeTile(d.host, f.path, lat, lon, "radar")),
              );
              if (cancelled) return;
              const latest = alphas[alphas.length - 1] ?? 0;
              const wetFrames = alphas.filter((a) => a >= 0.06).length;
              const hasRain = latest >= 0.06 && wetFrames === alphas.length;
              onNowcast(hasRain ? latest : 0, hasRain);
            } catch {
              if (!cancelled) onNowcast(0, false);
            }
          }

          const sat = d.satellite.infrared ?? [];
          if (sat.length > 0 && onSatelliteClouds) {
            probeTile(d.host, sat[sat.length - 1].path, lat, lon, "satellite")
              .then((alpha) => {
                if (!cancelled) onSatelliteClouds(Math.round(alpha * 100));
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          if (cancelled) return;
          setRadarFrames([]);
          onNowcast?.(0, false);
        });
    };
    load();
    // Re-probe every 5 minutes so a past rain reading never stays stuck.
    const id = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [showForecast, lat, lon, onNowcast, onSatelliteClouds]);


  // Reset frame index when frame source swaps.
  useEffect(() => {
    setIdx(Math.max(0, frames.length - 1));
  }, [layer, frames.length]);

  // Animate.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, speed);
    return () => clearInterval(t);
  }, [playing, frames.length, speed]);

  // Wipe all tile layers when the active overlay (or frame source) changes,
  // so the next effect rebuilds them with the correct colour scheme + path.
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    Object.values(layersRef.current).forEach((lyr: any) => {
      try {
        map.removeLayer(lyr);
      } catch {
        /* ignore */
      }
    });
    layersRef.current = {};
  }, [layer, useSatellite]);

  // Add/swap tile layers for the current frame index.
  useEffect(() => {
    if (!ready || !mapRef.current || frames.length === 0 || (!host && !useStaticNoaaLayer)) return;
    const L = leafletRef.current;
    if (!L) return;
    const map = mapRef.current;

    frames.forEach((f) => {
      const key = `${layer}::${f.path}`;
      if (!layersRef.current[key]) {
        const lyr = createOverlayLayer(L, host, f, layer);
        lyr.addTo(map);
        layersRef.current[key] = lyr;
      }
    });
    Object.entries(layersRef.current).forEach(([key, lyr]: [string, any]) => {
      const isCurrent = key === `${layer}::${frames[idx]?.path}`;
      const opacity = NOAA_WMS[layer]?.opacity ?? 0.75;
      lyr.setOpacity(isCurrent ? opacity : 0);
    });
  }, [idx, frames, host, ready, layer, useStaticNoaaLayer]);

  const current = frames[idx];
  const isForecast = !useSatellite && current ? idx >= pastCount : false;
  const minutesOffset = current && !useStaticNoaaLayer
    ? Math.round((current.time * 1000 - Date.now()) / 60000)
    : 0;
  const label = useStaticNoaaLayer
    ? "Live"
    : current
    ? new Date(current.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const layerLabel: Record<RadarLayer, string> = {
    radar: "RADAR",
    satellite: "SATELLITE IR",
    clouds: "CLOUD COVER (IR)",
    precip: "PRECIPITATION",
    temp: "TEMPERATURE",
    wind: "WIND SPEED",
    lightning: "LIGHTNING",
  };
  const attribution = NOAA_WMS[layer]?.attribution ?? "RainViewer";

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
        <div ref={mapEl} className="w-full h-full" />
        <div className="absolute top-3 left-3 chip px-2.5 py-1 text-xs font-mono flex items-center gap-2 z-[400]">
          <span
            className={`size-1.5 rounded-full ${isForecast ? "bg-warning" : "bg-success"} animate-pulse`}
          />
          {isForecast ? "FORECAST" : layerLabel[layer]} · {label}
          {minutesOffset !== 0 && (
            <span className="text-muted-foreground">
              ({minutesOffset > 0 ? "+" : ""}
              {minutesOffset}m)
            </span>
          )}
        </div>
        {hover && (
          <div className="absolute top-3 right-3 chip px-2.5 py-1.5 text-[10px] font-mono z-[400] flex flex-col gap-0.5 bg-background/85 backdrop-blur-sm border border-border/60 min-w-[140px]">
            <span className="text-foreground font-semibold uppercase tracking-wide">
              {layerLabel[layer]}
            </span>
            <span className="text-muted-foreground">
              {hover.lat.toFixed(3)}°, {hover.lon.toFixed(3)}°
            </span>
            <span className="text-primary">
              {hoverDescriptor(layer)}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
          © OpenStreetMap · {attribution}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="chip px-2.5 py-2 hover:bg-accent"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
          className="flex-1 min-w-[120px] accent-primary"
          disabled={frames.length === 0}
        />
        <span className="font-mono text-xs text-muted-foreground w-16 text-right">
          {frames.length === 0 ? "loading…" : `${idx + 1}/${frames.length}`}
        </span>
        <div className="chip p-0.5 flex text-[10px] font-mono">
          {[
            { label: "0.5×", v: 2400 },
            { label: "1×", v: 1200 },
            { label: "2×", v: 600 },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setSpeed(s.v)}
              className={`px-1.5 py-1 rounded ${
                speed === s.v ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>
          {useStaticNoaaLayer ? `← ${layerLabel[layer].toLowerCase()}` : "← 2 hr observed"}
        </span>
        <span className="text-warning">now</span>
        <span>
          {useStaticNoaaLayer ? "live NOAA layer" : "+30 min forecast →"}
        </span>
      </div>
    </div>
  );
}

function hoverDescriptor(layer: RadarLayer): string {
  switch (layer) {
    case "radar":
      return "Reflectivity (dBZ)";
    case "precip":
      return "1-hr accumulation";
    case "satellite":
      return "Visible imagery";
    case "clouds":
      return "Cloud-top temp (IR)";
    case "temp":
      return "Surface air temp";
    case "wind":
      return "Wind speed (mph)";
    case "lightning":
      return "Strike density";
    default:
      return "";
  }
}

/**
 * Sample a single RainViewer tile at the user's lat/lon to detect coverage.
 * Returns alpha 0..1. Used for both rain (radar) and clouds (satellite IR).
 * Best-effort — falls back to 0 on CORS issues.
 */
async function probeTile(
  host: string,
  path: string,
  lat: number,
  lon: number,
  kind: "radar" | "satellite",
): Promise<number> {
  const z = 6;
  const n = 2 ** z;
  const xF = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yF =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.floor(xF);
  const tileY = Math.floor(yF);
  // Exact pixel of the user's location inside this 256px tile. Sampling a
  // fixed spot (previously 120,120) read precipitation hundreds of km away,
  // which made the app claim rain when the radar was clear overhead.
  const px = Math.min(255, Math.max(0, Math.floor((xF - tileX) * 256)));
  const py = Math.min(255, Math.max(0, Math.floor((yF - tileY) * 256)));
  const box = kind === "satellite" ? 12 : 6;
  const sx = Math.min(256 - box, Math.max(0, px - Math.floor(box / 2)));
  const sy = Math.min(256 - box, Math.max(0, py - Math.floor(box / 2)));
  const color = kind === "satellite" ? 0 : 2;
  const opts = kind === "satellite" ? "0_0" : "1_1";
  const url = `${host}${path}/256/${z}/${tileX}/${tileY}/${color}/${opts}.png`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(0);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(sx, sy, box, box).data;
        let score = 0;
        let samples = 0;
        for (let i = 0; i < data.length; i += 4) {
          samples++;
          if (kind === "satellite") {
            // For IR satellite (B&W), brighter pixel = more cloud
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
            score += lum / 255;
          } else if (data[i + 3] > 60) {
            score += 1;
          }
        }
        resolve(Math.min(1, score / Math.max(1, samples)));
      } catch {
        resolve(0);
      }

    };
    img.onerror = () => resolve(0);
    img.src = url;
  });
}
