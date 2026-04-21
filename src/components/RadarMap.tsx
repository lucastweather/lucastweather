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
};

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

/**
 * Real animated radar tile layer using RainViewer's free, no-auth API. Tiles
 * are composited over an OpenStreetMap base via Leaflet. Past frames cover
 * roughly 2 hours; nowcast frames cover up to 30 minutes ahead (gated for
 * premium so free tier shows past + present only).
 */
export default function RadarMap({ lat, lon, showForecast = false }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any>>({});
  const [frames, setFrames] = useState<Frame[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [host, setHost] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  // Init Leaflet (CDN) + map
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Inject Leaflet CSS
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
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 12 },
      ).addTo(map);
      // City marker
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#38bdf8",
        fillColor: "#38bdf8",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);
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
    // re-init when location changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  // Fetch radar frame index
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
        setIdx(Math.max(0, past.length - 1)); // start at "now"
      })
      .catch(() => {
        setFrames([]);
      });
  }, [showForecast]);

  // Animate
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 600);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  // Add/swap radar tile layers (preload all, swap opacity)
  useEffect(() => {
    if (!ready || !mapRef.current || frames.length === 0 || !host) return;
    const L = (window as any).L;
    if (!L) return;
    const map = mapRef.current;

    // Lazily create layers
    frames.forEach((f) => {
      if (!layersRef.current[f.path]) {
        const url = `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const layer = L.tileLayer(url, { opacity: 0, zIndex: 10, tileSize: 256 });
        layer.addTo(map);
        layersRef.current[f.path] = layer;
      }
    });
    // Set opacity: only current frame visible
    Object.entries(layersRef.current).forEach(([key, layer]: [string, any]) => {
      const isCurrent = frames[idx]?.path === key;
      layer.setOpacity(isCurrent ? 0.75 : 0);
    });
  }, [idx, frames, host, ready]);

  const current = frames[idx];
  const isForecast = current ? idx >= pastCount : false;
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
          {isForecast ? "NOWCAST" : "OBSERVED"} · {label}
        </div>
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
          © OpenStreetMap · RainViewer
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
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
          className="flex-1 accent-primary"
          disabled={frames.length === 0}
        />
        <span className="font-mono text-xs text-muted-foreground w-16 text-right">
          {frames.length === 0 ? "loading…" : `${idx + 1}/${frames.length}`}
        </span>
      </div>
    </div>
  );
}
