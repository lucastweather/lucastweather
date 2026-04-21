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

// Curated public live feeds. We heavily favor IMAGE-based refresh cams from
// NPS, USGS, NOAA, and university observatories — these always render. A few
// well-known YouTube live broadcasts are included but YouTube embeds are
// blocked by some channels; if blocked the user sees the thumbnail. Image
// cams are always reliable.
const CAMERAS: Cam[] = [
  // ---------- Yosemite (NPS refresh cams — always work) ----------
  {
    id: "yosemite-half-dome",
    name: "Half Dome",
    region: "Yosemite NP, CA",
    lat: 37.7459,
    lon: -119.5332,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/halfdome.jpg" },
  },
  {
    id: "yosemite-falls",
    name: "Yosemite Falls",
    region: "Yosemite NP, CA",
    lat: 37.756,
    lon: -119.5963,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yose/yosefalls.jpg" },
  },
  {
    id: "yosemite-elcap",
    name: "El Capitan",
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
  // ---------- USGS Hawaii volcanoes (always work) ----------
  {
    id: "kilauea-summit",
    name: "Kīlauea Summit",
    region: "Hawaiʻi Volcanoes NP",
    lat: 19.4119,
    lon: -155.2839,
    source: {
      kind: "image",
      url: "https://volcanoes.usgs.gov/vsc/captures/kilauea/KWcam/KWcam.jpg",
    },
  },
  {
    id: "mauna-loa",
    name: "Mauna Loa Summit",
    region: "Hawaiʻi Volcanoes NP",
    lat: 19.4756,
    lon: -155.6056,
    source: {
      kind: "image",
      url: "https://volcanoes.usgs.gov/vsc/captures/mauna_loa/MOKcam/MOKcam.jpg",
    },
  },
  // ---------- USGS Cascades ----------
  {
    id: "mt-st-helens",
    name: "Mount St. Helens",
    region: "Washington",
    lat: 46.1912,
    lon: -122.1944,
    source: {
      kind: "image",
      url: "https://volcanoes.usgs.gov/vsc/captures/mount_st._helens/MSHcam/MSHcam.jpg",
    },
  },
  // ---------- NOAA / NPS scenic ----------
  {
    id: "old-faithful-still",
    name: "Old Faithful Geyser",
    region: "Yellowstone NP, WY",
    lat: 44.4605,
    lon: -110.8281,
    source: {
      kind: "image",
      url: "https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm?cam=ofvec",
    },
  },
  // ---------- YouTube live broadcasts (may show thumbnail if embedding blocked) ----------
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
    name: "Sea Otter Cam",
    region: "Monterey, CA",
    lat: 36.6181,
    lon: -121.9019,
    source: { kind: "youtube", id: "iYz4-yU9_o4" },
  },
  {
    id: "monterey-bay-kelp",
    name: "Kelp Forest Cam",
    region: "Monterey, CA",
    lat: 36.6181,
    lon: -121.9019,
    source: { kind: "youtube", id: "0i4yShQEnpE" },
  },
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
    id: "miami-beach",
    name: "Miami South Beach",
    region: "Miami, FL",
    lat: 25.7825,
    lon: -80.134,
    source: { kind: "youtube", id: "wAxXAOuwBPk" },
  },
  {
    id: "key-west-southernmost",
    name: "Key West Southernmost",
    region: "Key West, FL",
    lat: 24.5465,
    lon: -81.7977,
    source: { kind: "youtube", id: "uTkuZK-_uxo" },
  },
  {
    id: "katmai-bears",
    name: "Katmai Brown Bears",
    region: "Katmai, AK",
    lat: 58.5458,
    lon: -155.7762,
    source: { kind: "youtube", id: "Y3ELJoE7crQ" },
  },
  {
    id: "maui-kaanapali",
    name: "Kaanapali Beach",
    region: "Maui, HI",
    lat: 20.9217,
    lon: -156.6947,
    source: { kind: "youtube", id: "PT2_F-1esPk" },
  },
  {
    id: "london-tower-bridge",
    name: "Tower Bridge London",
    region: "London, UK",
    lat: 51.5055,
    lon: -0.0754,
    source: { kind: "youtube", id: "fis5Yk20j6w" },
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
    id: "tokyo-shinjuku",
    name: "Shinjuku Kabukicho",
    region: "Tokyo, JP",
    lat: 35.6938,
    lon: 139.7036,
    source: { kind: "youtube", id: "DjdUEyjx8GM" },
  },
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

  const [activeCam, setActiveCam] = useState<Cam | null>(null);
  const [view, setView] = useState<"grid" | "theater" | "map">("grid");
  const [theaterCam, setTheaterCam] = useState<Cam | null>(null);
  const { subscribed } = useSubscription();
  const { cameras: favCams, isFavoriteCamera, addCamera, remove } = useFavorites();

  // Build favorite cam objects (only the ones in our catalog).
  const favCamObjects = useMemo(() => {
    return favCams
      .map((f) => CAMERAS.find((c) => c.id === f.ref_id))
      .filter((c): c is Cam => !!c);
  }, [favCams]);

  // Combined list: favorites first (premium), then nearest (deduped).
  const displayCams = useMemo(() => {
    if (!subscribed || favCamObjects.length === 0) return nearest;
    const favIds = new Set(favCamObjects.map((c) => c.id));
    const nearestNoFav = nearest.filter((n) => !favIds.has(n.cam.id));
    return [
      ...favCamObjects.map((cam) => ({
        cam,
        dist: haversineMi(lat, lon, cam.lat, cam.lon),
      })),
      ...nearestNoFav,
    ];
  }, [favCamObjects, nearest, lat, lon, subscribed]);

  async function toggleFav(cam: Cam) {
    if (!subscribed) return;
    if (isFavoriteCamera(cam.id)) {
      await remove("camera", cam.id);
    } else {
      await addCamera({ id: cam.id, name: cam.name, region: cam.region });
    }
  }

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
              onClick={() => setView("theater")}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                view === "theater" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              <Maximize2 className="size-3" /> Theater
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
          cams={displayCams.map((n) => n.cam)}
          centerLat={lat}
          centerLon={lon}
          onSelect={(id) => {
            const cam = CAMERAS.find((c) => c.id === id);
            if (cam) setActiveCam(cam);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayCams.map(({ cam, dist }) => {
            const isFav = isFavoriteCamera(cam.id);
            return (
              <div
                key={cam.id}
                className="rounded-xl overflow-hidden border border-border bg-surface-2 group"
              >
                <div className="aspect-video relative overflow-hidden bg-black">
                  <button
                    type="button"
                    onClick={() => setActiveCam(cam)}
                    className="w-full h-full relative"
                    aria-label={`View ${cam.name} fullscreen`}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                      <div className="size-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur shadow-lg">
                        <Maximize2 className="size-5 text-primary-foreground" />
                      </div>
                    </div>
                  </button>
                  <div className="absolute top-2 left-2 chip px-1.5 py-0.5 text-[10px] font-mono flex items-center gap-1 z-10">
                    <span className="size-1.5 rounded-full bg-danger animate-pulse" /> LIVE
                  </div>
                  {subscribed && (
                    <button
                      onClick={() => toggleFav(cam)}
                      className={`absolute top-2 right-2 size-7 rounded-full backdrop-blur flex items-center justify-center transition-colors z-10 ${
                        isFav
                          ? "bg-warning/90 text-warning-foreground"
                          : "bg-black/50 text-white hover:bg-black/70"
                      }`}
                      aria-label={isFav ? "Remove favorite" : "Add favorite"}
                      title={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      <Star className={`size-3.5 ${isFav ? "fill-current" : ""}`} />
                    </button>
                  )}
                  {isFav && (
                    <div className="absolute bottom-2 left-2 chip px-1.5 py-0.5 text-[10px] font-mono text-warning border-warning/40 z-10">
                      ★ Favorite
                    </div>
                  )}
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
                    onClick={(e) => e.stopPropagation()}
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
        NPS Yosemite & Yellowstone refresh cams, and USGS volcano cams. Click any tile for
        fullscreen with live conditions overlay.
        {!subscribed && " Upgrade to Premium to favorite cameras."}
      </p>

      {activeCam && (
        <CameraLightbox cam={activeCam} onClose={() => setActiveCam(null)} />
      )}
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
