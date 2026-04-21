import { Camera, MapPin, ExternalLink, Map as MapIcon, Grid3x3, Star, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CameraLightbox from "@/components/CameraLightbox";
import { useFavorites } from "@/lib/favorites-store";
import { useSubscription } from "@/lib/auth-store";

type CamSource =
  | { kind: "youtube"; id: string }
  | { kind: "iframe"; url: string }
  | { kind: "image"; url: string }; // refresh-style still image cam

type Cam = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  source: CamSource;
};

// Curated, verified public live feeds. Mix of YouTube live (EarthCam,
// SkylineWebcams, NPS partners), USGS volcano cams, NPS Yosemite refresh
// cams, and Ambient Weather network stills.
const CAMERAS: Cam[] = [
  // ---------- Yosemite & California parks ----------
  {
    id: "yosemite-half-dome",
    name: "Half Dome (NPS)",
    region: "Yosemite NP, CA",
    lat: 37.7459,
    lon: -119.5332,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/halfdome.jpg" },
  },
  {
    id: "yosemite-falls",
    name: "Yosemite Falls (NPS)",
    region: "Yosemite NP, CA",
    lat: 37.756,
    lon: -119.5963,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/yosefalls.jpg" },
  },
  {
    id: "yosemite-elcap",
    name: "El Capitan (NPS)",
    region: "Yosemite NP, CA",
    lat: 37.734,
    lon: -119.6377,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/elcap.jpg" },
  },
  {
    id: "yosemite-turtleback",
    name: "Turtleback Dome",
    region: "Yosemite NP, CA",
    lat: 37.715,
    lon: -119.7,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/turtle.jpg" },
  },
  // ---------- Bay Area ----------
  {
    id: "sf-golden-gate",
    name: "Golden Gate Bridge",
    region: "San Francisco, CA",
    lat: 37.8199,
    lon: -122.4783,
    source: { kind: "youtube", id: "kKpmwTsrSwk" },
  },
  {
    id: "monterey-bay-aquarium-otters",
    name: "Sea Otters Live",
    region: "Monterey, CA",
    lat: 36.6181,
    lon: -121.9019,
    source: { kind: "youtube", id: "iYz4-yU9_o4" },
  },
  // ---------- Hawaii volcanoes (USGS) ----------
  {
    id: "kilauea-summit",
    name: "Kīlauea Summit (USGS)",
    region: "Hawaiʻi Volcanoes NP",
    lat: 19.4119,
    lon: -155.2839,
    source: {
      kind: "image",
      url: "https://volcanoes.usgs.gov/vsc/captures/kilauea/KWcam/KWcam.jpg",
    },
  },
  // ---------- Other US ----------
  {
    id: "nyc-times-square",
    name: "Times Square",
    region: "New York, NY",
    lat: 40.758,
    lon: -73.9855,
    source: { kind: "youtube", id: "rnXIjl_Rzy4" },
  },
  {
    id: "venice-beach",
    name: "Venice Beach Boardwalk",
    region: "Los Angeles, CA",
    lat: 33.985,
    lon: -118.4695,
    source: { kind: "youtube", id: "QFyVJsXrh3w" },
  },
  {
    id: "vegas-strip",
    name: "Las Vegas Strip",
    region: "Las Vegas, NV",
    lat: 36.1147,
    lon: -115.1728,
    source: { kind: "youtube", id: "F-Bxd5LNruE" },
  },
  {
    id: "miami-beach",
    name: "Miami South Beach",
    region: "Miami, FL",
    lat: 25.7825,
    lon: -80.134,
    source: { kind: "youtube", id: "wAxXAOuwBPk" },
  },
  {
    id: "key-west-southernmost",
    name: "Key West Southernmost Point",
    region: "Key West, FL",
    lat: 24.5465,
    lon: -81.7977,
    source: { kind: "youtube", id: "uTkuZK-_uxo" },
  },
  {
    id: "chicago-skyline",
    name: "Chicago Skyline",
    region: "Chicago, IL",
    lat: 41.8781,
    lon: -87.6298,
    source: { kind: "youtube", id: "Q0xmzCHBmIY" },
  },
  {
    id: "yellowstone-old-faithful",
    name: "Old Faithful Geyser (NPS)",
    region: "Yellowstone, WY",
    lat: 44.4605,
    lon: -110.8281,
    source: { kind: "youtube", id: "Lvw5LEZRvF0" },
  },
  {
    id: "katmai-bears",
    name: "Katmai Brown Bears (NPS)",
    region: "Katmai, AK",
    lat: 58.5458,
    lon: -155.7762,
    source: { kind: "youtube", id: "Y3ELJoE7crQ" },
  },
  {
    id: "niagara-falls",
    name: "Niagara Falls",
    region: "Niagara Falls, NY",
    lat: 43.0962,
    lon: -79.0377,
    source: { kind: "youtube", id: "1BxRsEMRiQg" },
  },
  {
    id: "maui-kaanapali",
    name: "Kaanapali Beach",
    region: "Maui, HI",
    lat: 20.9217,
    lon: -156.6947,
    source: { kind: "youtube", id: "PT2_F-1esPk" },
  },
  // ---------- Europe ----------
  {
    id: "london-tower-bridge",
    name: "Tower Bridge London",
    region: "London, UK",
    lat: 51.5055,
    lon: -0.0754,
    source: { kind: "youtube", id: "fis5Yk20j6w" },
  },
  {
    id: "paris-eiffel",
    name: "Eiffel Tower View",
    region: "Paris, FR",
    lat: 48.8584,
    lon: 2.2945,
    source: { kind: "youtube", id: "iWzQ7CAcHAk" },
  },
  {
    id: "rome-trevi",
    name: "Trevi Fountain",
    region: "Rome, IT",
    lat: 41.9009,
    lon: 12.4833,
    source: { kind: "youtube", id: "Yp7BO_yA4DA" },
  },
  {
    id: "venice-rialto",
    name: "Rialto Bridge Venice",
    region: "Venice, IT",
    lat: 45.438,
    lon: 12.3358,
    source: { kind: "youtube", id: "Ogc2nNcimTQ" },
  },
  {
    id: "amsterdam-canals",
    name: "Amsterdam Canals",
    region: "Amsterdam, NL",
    lat: 52.3676,
    lon: 4.9041,
    source: { kind: "youtube", id: "ailqf9KAEJ8" },
  },
  {
    id: "iceland-reykjavik",
    name: "Reykjavik Harbor",
    region: "Reykjavik, IS",
    lat: 64.1466,
    lon: -21.9426,
    source: { kind: "youtube", id: "5ovcQS6QHtE" },
  },
  // ---------- Asia / Oceania ----------
  {
    id: "tokyo-shinjuku",
    name: "Shinjuku Kabukicho",
    region: "Tokyo, JP",
    lat: 35.6938,
    lon: 139.7036,
    source: { kind: "youtube", id: "DjdUEyjx8GM" },
  },
  {
    id: "hong-kong-harbor",
    name: "Victoria Harbor",
    region: "Hong Kong",
    lat: 22.2855,
    lon: 114.1577,
    source: { kind: "youtube", id: "ULSZ-i_Ksn8" },
  },
  {
    id: "sydney-harbor",
    name: "Sydney Harbor",
    region: "Sydney, AU",
    lat: -33.8568,
    lon: 151.2153,
    source: { kind: "youtube", id: "_9pavMzUY-c" },
  },
  // ---------- LatAm ----------
  {
    id: "rio-copacabana",
    name: "Copacabana Beach",
    region: "Rio de Janeiro, BR",
    lat: -22.9711,
    lon: -43.1822,
    source: { kind: "youtube", id: "lc1Q7XX7qkg" },
  },
];

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function srcUrl(c: Cam) {
  if (c.source.kind === "youtube") {
    return `https://www.youtube.com/embed/${c.source.id}?autoplay=1&mute=1&controls=1&modestbranding=1&playsinline=1&rel=0`;
  }
  return c.source.url;
}

function externalUrl(c: Cam) {
  if (c.source.kind === "youtube") return `https://www.youtube.com/watch?v=${c.source.id}`;
  return (c.source as any).url;
}

function thumbUrl(c: Cam) {
  if (c.source.kind === "youtube") {
    return `https://i.ytimg.com/vi/${c.source.id}/hqdefault.jpg`;
  }
  // Image cams: use the live still as the thumbnail too (with cache-bust).
  return `${c.source.url}?t=${Math.floor(Date.now() / 60000)}`;
}

export default function WeatherCameras({
  cityName,
  lat,
  lon,
}: {
  cityName: string;
  lat: number;
  lon: number;
}) {
  const nearest = useMemo(() => {
    const ranked = CAMERAS.map((c) => ({
      cam: c,
      dist: haversineMi(lat, lon, c.lat, c.lon),
    })).sort((a, b) => a.dist - b.dist);
    return ranked.slice(0, 8);
  }, [lat, lon]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "map">("grid");

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="size-5 text-primary" /> Live Weather Cameras
          <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-success">
            Live
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            Nearest to {cityName}
          </span>
          <div className="chip p-0.5 flex">
            <button
              onClick={() => setView("grid")}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                view === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              <Grid3x3 className="size-3" /> Grid
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                view === "map" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              <MapIcon className="size-3" /> Map
            </button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <CameraMap
          cams={nearest.map((n) => n.cam)}
          centerLat={lat}
          centerLon={lon}
          onSelect={(id) => {
            setActiveId(id);
            setView("grid");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nearest.map(({ cam, dist }) => {
            const isActive = activeId === cam.id;
            return (
              <div
                key={cam.id}
                className="rounded-xl overflow-hidden border border-border bg-surface-2 group"
              >
                <div className="aspect-video relative overflow-hidden bg-black">
                  {isActive && cam.source.kind === "youtube" ? (
                    <iframe
                      src={srcUrl(cam)}
                      title={cam.name}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : cam.source.kind === "image" ? (
                    <RefreshingImage url={cam.source.url} alt={cam.name} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveId(cam.id)}
                      className="w-full h-full relative"
                      aria-label={`Play ${cam.name} live stream`}
                    >
                      <img
                        src={thumbUrl(cam)}
                        alt={cam.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=60";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="size-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur">
                          <span className="ml-0.5 border-y-[8px] border-y-transparent border-l-[12px] border-l-primary-foreground" />
                        </div>
                      </div>
                    </button>
                  )}
                  <div className="absolute top-2 left-2 chip px-1.5 py-0.5 text-[10px] font-mono flex items-center gap-1 z-10">
                    <span className="size-1.5 rounded-full bg-danger animate-pulse" /> LIVE
                  </div>
                </div>
                <div className="p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{cam.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" /> {cam.region} · {dist.toFixed(0)} mi
                    </div>
                  </div>
                  <a
                    href={externalUrl(cam)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3 font-mono">
        Streams sourced from public YouTube live broadcasts (EarthCam, SkylineWebcams),
        NPS Yosemite & Yellowstone refresh cams, and USGS volcano cams.
      </p>
    </section>
  );
}

function RefreshingImage({ url, alt }: { url: string; alt: string }) {
  const [bust, setBust] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const t = setInterval(() => setBust(Math.floor(Date.now() / 60000)), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <img
      src={`${url}?t=${bust}`}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=60";
      }}
    />
  );
}

function CameraMap({
  cams,
  centerLat,
  centerLon,
  onSelect,
}: {
  cams: Cam[];
  centerLat: number;
  centerLon: number;
  onSelect: (id: string) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

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
      }).setView([centerLat, centerLon], 4);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 12,
      }).addTo(map);
      cams.forEach((cam) => {
        const marker = L.marker([cam.lat, cam.lon]);
        marker.bindTooltip(
          `<div style="font-family:ui-monospace,monospace;font-size:11px"><strong>${cam.name}</strong><br/>${cam.region}<br/><em>Click to view</em></div>`,
          { direction: "top" },
        );
        marker.on("click", () => onSelect(cam.id));
        marker.addTo(map);
      });
      mapRef.current = map;
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
  }, [cams.map((c) => c.id).join(",")]);

  return (
    <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
      <div ref={mapEl} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
        Click a pin to view that camera
      </div>
    </div>
  );
}
