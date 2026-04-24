import { Camera, MapPin, ExternalLink, Map as MapIcon, Grid3x3, Star, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CameraLightbox from "@/components/CameraLightbox";
import { useFavorites } from "@/lib/favorites-store";
import { useSubscription } from "@/lib/auth-store";

type CamSource =
  | { kind: "iframe"; url: string }
  | { kind: "image"; url: string };

type Cam = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  source: CamSource;
};

const CAMERAS: Cam[] = [
  {
    id: "yosemite-valley",
    name: "Yosemite Valley",
    region: "Yosemite NP, CA",
    lat: 37.7486,
    lon: -119.5886,
    source: { kind: "image", url: "https://www.nps.gov/featurecontent/ard/webcams/images/yoselarge.jpg" },
  },
  {
    id: "happy-isles-bridge",
    name: "Happy Isles Bridge",
    region: "Yosemite NP, CA",
    lat: 37.7325,
    lon: -119.5586,
    source: { kind: "image", url: "https://usgs-nims-images.s3.amazonaws.com/overlay/CA_Merced_River_at_Happy_Isles_Bridge_Yosemite/CA_Merced_River_at_Happy_Isles_Bridge_Yosemite_newest.jpg" },
  },
  {
    id: "badger-pass",
    name: "Badger Pass",
    region: "Yosemite NP, CA",
    lat: 37.6626,
    lon: -119.6637,
    source: { kind: "image", url: "https://pixelcaster.com/aramark/yosemite-ski.jpg" },
  },
  {
    id: "yellowstone-east-entrance",
    name: "East Entrance",
    region: "Yellowstone NP, WY",
    lat: 44.5606,
    lon: -110.3982,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/east_in.jpg" },
  },
  {
    id: "yellowstone-east-exit",
    name: "East Exit",
    region: "Yellowstone NP, WY",
    lat: 44.5641,
    lon: -110.4002,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/east_out.jpg" },
  },
  {
    id: "mammoth-arch",
    name: "Mammoth Arch",
    region: "Yellowstone NP, WY",
    lat: 44.9769,
    lon: -110.7013,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/mammoth_arch.jpg" },
  },
  {
    id: "mammoth-electric-peak",
    name: "Electric Peak",
    region: "Yellowstone NP, WY",
    lat: 44.9769,
    lon: -110.7013,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/mammoth_electric.jpg" },
  },
  {
    id: "mammoth-parade",
    name: "Mammoth Parade",
    region: "Yellowstone NP, WY",
    lat: 44.9769,
    lon: -110.7013,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/mammoth_parade.jpg" },
  },
  {
    id: "mount-washburn-ne",
    name: "Mount Washburn NE",
    region: "Yellowstone NP, WY",
    lat: 44.7979,
    lon: -110.4348,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/washburn_ne.jpg" },
  },
  {
    id: "mount-washburn-sw",
    name: "Mount Washburn SW",
    region: "Yellowstone NP, WY",
    lat: 44.7979,
    lon: -110.4348,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/washburn_sw.jpg" },
  },
  {
    id: "yellowstone-west-gate",
    name: "West Gate",
    region: "Yellowstone NP, MT",
    lat: 44.6564,
    lon: -111.0963,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/west_gate.jpg" },
  },
  {
    id: "yellowstone-west-entrance",
    name: "West Entrance",
    region: "Yellowstone NP, MT",
    lat: 44.6544,
    lon: -111.0915,
    source: { kind: "image", url: "https://www.nps.gov/webcams-yell/west_into.jpg" },
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

function externalUrl(c: Cam) {
  return c.source.url;
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

  const favCamObjects = useMemo(() => {
    return favCams
      .map((f) => CAMERAS.find((c) => c.id === f.ref_id))
      .filter((c): c is Cam => !!c);
  }, [favCams]);

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
      ) : view === "theater" ? (
        <TheaterView
          cams={displayCams.map((n) => n.cam)}
          activeCamId={(theaterCam ?? displayCams[0]?.cam)?.id}
          onSelectThumb={(c) => setTheaterCam(c)}
          onExpand={(c) => setActiveCam(c)}
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
                    <RefreshingImage
                      url={cam.source.url}
                      alt={cam.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
        Reliable public park camera feeds with fullscreen viewing and live weather overlay.
        {!subscribed && " Upgrade to Premium to favorite cameras."}
      </p>

      {activeCam && (
        <CameraLightbox cam={activeCam} onClose={() => setActiveCam(null)} />
      )}
    </section>
  );
}

function TheaterView({
  cams,
  activeCamId,
  onSelectThumb,
  onExpand,
}: {
  cams: Cam[];
  activeCamId: string | undefined;
  onSelectThumb: (c: Cam) => void;
  onExpand: (c: Cam) => void;
}) {
  const featured = cams.find((c) => c.id === activeCamId) ?? cams[0];
  if (!featured) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No cameras available.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black relative group">
        <RefreshingImage url={featured.source.url} alt={featured.name} />
        <div className="absolute top-3 left-3 chip px-2 py-1 text-xs font-mono flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger animate-pulse" /> LIVE
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => onExpand(featured)}
            className="chip px-2 py-1 text-xs hover:bg-accent flex items-center gap-1"
          >
            <Maximize2 className="size-3" /> Fullscreen
          </button>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-1.5">
            <div className="text-white text-sm font-medium">{featured.name}</div>
            <div className="text-white/70 text-[11px] font-mono">{featured.region}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {cams.slice(0, 12).map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectThumb(c)}
            className={`aspect-video rounded-lg overflow-hidden border-2 relative group ${
              c.id === featured.id
                ? "border-primary"
                : "border-border hover:border-primary/50"
            }`}
            title={c.name}
          >
            <RefreshingImage url={c.source.url} alt={c.name} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
              <div className="text-white text-[10px] font-medium truncate">{c.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Loads an image once, then quietly swaps to a fresh cache-busted URL only on a
 * timer (default every 2 min). Crucially, the displayed `<img>` `src` is held
 * in state and does NOT change when the parent re-renders, so the camera grid
 * no longer flickers when sibling components update (e.g. radar nowcast,
 * earthquake polling). The new image is preloaded off-screen and only
 * promoted once it's fully loaded — eliminating the flash to blank.
 */
function RefreshingImage({
  url,
  alt,
  className = "w-full h-full object-cover",
  intervalMs = 120_000,
}: {
  url: string;
  alt: string;
  className?: string;
  intervalMs?: number;
}) {
  const initialBust = useRef(Math.floor(Date.now() / intervalMs)).current;
  const [src, setSrc] = useState(`${url}?t=${initialBust}`);

  useEffect(() => {
    setSrc(`${url}?t=${Math.floor(Date.now() / intervalMs)}`);
  }, [url, intervalMs]);

  useEffect(() => {
    const t = setInterval(() => {
      const nextSrc = `${url}?t=${Math.floor(Date.now() / intervalMs)}`;
      if (nextSrc === src) return;
      // Preload to avoid flashing a blank frame during fetch.
      const img = new Image();
      img.onload = () => setSrc(nextSrc);
      img.src = nextSrc;
    }, intervalMs);
    return () => clearInterval(t);
  }, [url, intervalMs, src]);

  return <img src={src} alt={alt} className={className} loading="lazy" />;
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
  }, [cams, centerLat, centerLon, onSelect]);

  return (
    <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
      <div ref={mapEl} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded z-[400]">
        Click a pin to view that camera
      </div>
    </div>
  );
}
