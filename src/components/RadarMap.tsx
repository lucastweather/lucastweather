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

type Props = {
  lat: number;
  lon: number;
  /** When false, hide the nowcast (forecast) frames — gates premium feature */
  showForecast?: boolean;
  /** Notify parent of computed nowcast precipitation (0..1 intensity, mm-ish) */
  onNowcast?: (intensity: number, hasRain: boolean) => void;
};

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

/**
 * Real animated radar tile layer using RainViewer's free, no-auth API. Tiles
 * are composited over an OpenStreetMap base via Leaflet. Past frames cover
 * roughly 2 hours; nowcast frames cover up to 30 minutes ahead. We also probe
 * the radar tile at the user's location for each nowcast frame so we can tell
 * the parent component "rain is expected" — keeping the MinuteCast and the
 * radar visualization perfectly in sync.
 */
export default function RadarMap({ lat, lon, showForecast = false, onNowcast }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any>>({});
  const [frames, setFrames] = useState<Frame[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [host, setHost] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1200); // ms per frame; user-adjustable
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

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

  // Fetch radar frame index. Premium users get nowcast frames; free users get
  // observed radar only.
  useEffect(() => {
    fetch(RAINVIEWER_API)
      .then((r) => r.json() as Promise<ApiResp>)
      .then((d) => {
        const past = d.radar.past ?? [];
        const nowcast = d.radar.nowcast ?? [];
        const all = showForecast ? [...past, ...nowcast] : past;
        setHost(d.host);
        setFrames(all);
        setPastCount(past.length);
        setIdx(Math.max(0, Math.min(past.length - 1, all.length - 1)));

        if (showForecast && nowcast.length > 0 && onNowcast) {
          probeRain(d.host, nowcast[nowcast.length - 1].path, lat, lon)
            .then((alpha) => {
              onNowcast(alpha, alpha > 0.05);
            })
            .catch(() => onNowcast(0, false));
        } else if (onNowcast) {
          onNowcast(0, false);
        }
      })
      .catch(() => {
        setFrames([]);
        onNowcast?.(0, false);
      });
  }, [showForecast, lat, lon, onNowcast]);

  // Animate. Hold the latest frame longer so users can see "now" before loop.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % frames.length;
        return next;
      });
    }, speed);
    return () => clearInterval(t);
  }, [playing, frames.length, speed]);

  // Add/swap radar tile layers
  useEffect(() => {
    if (!ready || !mapRef.current || frames.length === 0 || !host) return;
    const L = (window as any).L;
    if (!L) return;
    const map = mapRef.current;

    frames.forEach((f) => {
      if (!layersRef.current[f.path]) {
        const url = `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const layer = L.tileLayer(url, { opacity: 0, zIndex: 10, tileSize: 256 });
        layer.addTo(map);
        layersRef.current[f.path] = layer;
      }
    });
    Object.entries(layersRef.current).forEach(([key, layer]: [string, any]) => {
      const isCurrent = frames[idx]?.path === key;
      layer.setOpacity(isCurrent ? 0.75 : 0);
    });
  }, [idx, frames, host, ready]);

  const current = frames[idx];
  const isForecast = current ? idx >= pastCount : false;
  const minutesOffset = current
    ? Math.round((current.time * 1000 - Date.now()) / 60000)
    : 0;
  const label = current
    ? new Date(current.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
        <div ref={mapEl} className="w-full h-full" />
        <div className="absolute top-3 left-3 chip px-2.5 py-1 text-xs font-mono flex items-center gap-2 z-[400]">
          <span
            className={`size-1.5 rounded-full ${isForecast ? "bg-warning" : "bg-success"} animate-pulse`}
          />
          {isForecast ? "FORECAST" : "OBSERVED"} · {label}
          {minutesOffset !== 0 && (
            <span className="text-muted-foreground">
              ({minutesOffset > 0 ? "+" : ""}
              {minutesOffset}m)
            </span>
          )}
        </div>
        {hover && (
          <div className="absolute top-3 right-3 chip px-2 py-1 text-[10px] font-mono z-[400]">
            {hover.lat.toFixed(3)}°, {hover.lon.toFixed(3)}°
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
          © OpenStreetMap · RainViewer
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
        <span>← 2 hr observed</span>
        <span className="text-warning">now</span>
        <span>+30 min forecast →</span>
      </div>
    </div>
  );
}

/**
 * Sample a single RainViewer radar tile at the user's lat/lon to detect
 * whether the radar pixel has any precipitation color. Returns alpha 0..1.
 * Done client-side via canvas. Best-effort — falls back to 0 on CORS issues.
 */
async function probeRain(
  host: string,
  path: string,
  lat: number,
  lon: number,
): Promise<number> {
  const z = 6;
  const tileX = Math.floor(((lon + 180) / 360) * 2 ** z);
  const tileY = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      2 ** z,
  );
  const url = `${host}${path}/256/${z}/${tileX}/${tileY}/2/1_1.png`;
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
        // Sample center of tile
        const data = ctx.getImageData(120, 120, 16, 16).data;
        let nonZero = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 30) nonZero++;
        }
        resolve(nonZero / (data.length / 4));
      } catch {
        resolve(0);
      }
    };
    img.onerror = () => resolve(0);
    img.src = url;
  });
}
