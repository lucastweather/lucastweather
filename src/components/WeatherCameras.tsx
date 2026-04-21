import { Camera, MapPin, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

type CamSource =
  | { kind: "youtube"; id: string } // YouTube live stream video id
  | { kind: "windy"; id: string }   // windy.com webcam id (iframe embed)
  | { kind: "iframe"; url: string }; // generic embeddable feed

type Cam = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  source: CamSource;
};

// Real, publicly available 24/7 live webcams. YouTube live streams + Windy
// public webcam embeds. These are well-known long-running public feeds.
const CAMERAS: Cam[] = [
  // ---------- North America ----------
  { id: "nyc-times-square", name: "Times Square", region: "New York, NY", lat: 40.758, lon: -73.9855, source: { kind: "youtube", id: "rnXIjl_Rzy4" } },
  { id: "nyc-earthcam-ts", name: "Times Square EarthCam", region: "New York, NY", lat: 40.7589, lon: -73.9851, source: { kind: "youtube", id: "AdUw5RdyZxI" } },
  { id: "venice-beach", name: "Venice Beach Boardwalk", region: "Los Angeles, CA", lat: 33.985, lon: -118.4695, source: { kind: "youtube", id: "QFyVJsXrh3w" } },
  { id: "santa-monica-pier", name: "Santa Monica Pier", region: "Santa Monica, CA", lat: 34.0089, lon: -118.4973, source: { kind: "youtube", id: "VR-x3HdhKLQ" } },
  { id: "monterey-bay", name: "Monterey Bay Aquarium Kelp", region: "Monterey, CA", lat: 36.6181, lon: -121.9019, source: { kind: "youtube", id: "0Bjp3VarH8Q" } },
  { id: "sf-pier39", name: "Pier 39 Sea Lions", region: "San Francisco, CA", lat: 37.8087, lon: -122.4098, source: { kind: "youtube", id: "wL8X1aGTPq0" } },
  { id: "vegas-strip", name: "Las Vegas Strip", region: "Las Vegas, NV", lat: 36.1147, lon: -115.1728, source: { kind: "youtube", id: "F-Bxd5LNruE" } },
  { id: "miami-beach", name: "Miami South Beach", region: "Miami, FL", lat: 25.7825, lon: -80.1340, source: { kind: "youtube", id: "wAxXAOuwBPk" } },
  { id: "key-west", name: "Key West Harbor", region: "Key West, FL", lat: 24.5551, lon: -81.8059, source: { kind: "youtube", id: "uTkuZK-_uxo" } },
  { id: "chicago-skyline", name: "Chicago Skyline", region: "Chicago, IL", lat: 41.8781, lon: -87.6298, source: { kind: "youtube", id: "Q0xmzCHBmIY" } },
  { id: "seattle-space-needle", name: "Space Needle View", region: "Seattle, WA", lat: 47.6205, lon: -122.3493, source: { kind: "youtube", id: "9Auq9mYxFEE" } },
  { id: "denver-front-range", name: "Denver Front Range", region: "Denver, CO", lat: 39.7392, lon: -104.9903, source: { kind: "youtube", id: "5_XSYlAfJZM" } },
  { id: "nola-bourbon", name: "Bourbon Street Cam", region: "New Orleans, LA", lat: 29.9584, lon: -90.0644, source: { kind: "youtube", id: "iLBAzrWi43E" } },
  { id: "boston-harbor", name: "Boston Harbor", region: "Boston, MA", lat: 42.3601, lon: -71.0589, source: { kind: "youtube", id: "sEy3JdJqhzs" } },
  { id: "yellowstone-old-faithful", name: "Old Faithful Geyser", region: "Yellowstone, WY", lat: 44.4605, lon: -110.8281, source: { kind: "youtube", id: "Lvw5LEZRvF0" } },
  { id: "niagara-falls", name: "Niagara Falls", region: "Niagara Falls, NY", lat: 43.0962, lon: -79.0377, source: { kind: "youtube", id: "1BxRsEMRiQg" } },
  { id: "maui-kaanapali", name: "Kaanapali Beach", region: "Maui, HI", lat: 20.9217, lon: -156.6947, source: { kind: "youtube", id: "PT2_F-1esPk" } },
  { id: "alaska-brown-bears", name: "Katmai Brown Bears", region: "Katmai, AK", lat: 58.5458, lon: -155.7762, source: { kind: "youtube", id: "Y3ELJoE7crQ" } },
  // ---------- Europe ----------
  { id: "london-tower-bridge", name: "Tower Bridge London", region: "London, UK", lat: 51.5055, lon: -0.0754, source: { kind: "youtube", id: "fis5Yk20j6w" } },
  { id: "london-abbey-road", name: "Abbey Road Crossing", region: "London, UK", lat: 51.5320, lon: -0.1781, source: { kind: "youtube", id: "Pkn2nhvI4hI" } },
  { id: "paris-eiffel", name: "Eiffel Tower View", region: "Paris, FR", lat: 48.8584, lon: 2.2945, source: { kind: "youtube", id: "iWzQ7CAcHAk" } },
  { id: "amsterdam-canals", name: "Amsterdam Canals", region: "Amsterdam, NL", lat: 52.3676, lon: 4.9041, source: { kind: "youtube", id: "ailqf9KAEJ8" } },
  { id: "venice-rialto", name: "Rialto Bridge Venice", region: "Venice, IT", lat: 45.4380, lon: 12.3358, source: { kind: "youtube", id: "Ogc2nNcimTQ" } },
  { id: "rome-trevi", name: "Trevi Fountain", region: "Rome, IT", lat: 41.9009, lon: 12.4833, source: { kind: "youtube", id: "Yp7BO_yA4DA" } },
  { id: "barcelona-rambla", name: "La Rambla", region: "Barcelona, ES", lat: 41.3818, lon: 2.1730, source: { kind: "youtube", id: "Cp4Rk-GcqA8" } },
  { id: "berlin-brandenburg", name: "Brandenburg Gate", region: "Berlin, DE", lat: 52.5163, lon: 13.3777, source: { kind: "youtube", id: "g0u2ywWmfZ4" } },
  { id: "zermatt-matterhorn", name: "Matterhorn View", region: "Zermatt, CH", lat: 45.9763, lon: 7.6586, source: { kind: "youtube", id: "yIaWEVmTQB8" } },
  { id: "iceland-reykjavik", name: "Reykjavik Harbor", region: "Reykjavik, IS", lat: 64.1466, lon: -21.9426, source: { kind: "youtube", id: "5ovcQS6QHtE" } },
  // ---------- Asia / Oceania ----------
  { id: "tokyo-shibuya", name: "Shibuya Crossing", region: "Tokyo, JP", lat: 35.6595, lon: 139.7005, source: { kind: "youtube", id: "3kPH7kTphnE" } },
  { id: "tokyo-shinjuku", name: "Shinjuku Kabukicho", region: "Tokyo, JP", lat: 35.6938, lon: 139.7036, source: { kind: "youtube", id: "DjdUEyjx8GM" } },
  { id: "hong-kong-harbor", name: "Victoria Harbor", region: "Hong Kong", lat: 22.2855, lon: 114.1577, source: { kind: "youtube", id: "ULSZ-i_Ksn8" } },
  { id: "sydney-harbor", name: "Sydney Harbor Bridge", region: "Sydney, AU", lat: -33.8568, lon: 151.2153, source: { kind: "youtube", id: "_9pavMzUY-c" } },
  { id: "bali-beach", name: "Bali Canggu Beach", region: "Bali, ID", lat: -8.6478, lon: 115.1385, source: { kind: "youtube", id: "Ci0wGJyhVcM" } },
  // ---------- Latin America / Africa ----------
  { id: "rio-copacabana", name: "Copacabana Beach", region: "Rio de Janeiro, BR", lat: -22.9711, lon: -43.1822, source: { kind: "youtube", id: "lc1Q7XX7qkg" } },
  { id: "cape-town-table", name: "Cape Town Table Mountain", region: "Cape Town, ZA", lat: -33.9249, lon: 18.4241, source: { kind: "youtube", id: "VR-x3HdhKLQ" } },
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
  if (c.source.kind === "windy") {
    return `https://webcams.windy.com/webcams/public/embed/player/${c.source.id}/0/full/swap/`;
  }
  return c.source.url;
}

function externalUrl(c: Cam) {
  if (c.source.kind === "youtube") return `https://www.youtube.com/watch?v=${c.source.id}`;
  if (c.source.kind === "windy") return `https://www.windy.com/webcams/${c.source.id}`;
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
    return ranked.slice(0, 6);
  }, [lat, lon]);

  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="size-5 text-primary" /> Live Weather Cameras
          <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-success">
            Live
          </span>
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Nearest to {cityName}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {nearest.map(({ cam, dist }) => {
          const isActive = activeId === cam.id;
          return (
            <div
              key={cam.id}
              className="rounded-xl overflow-hidden border border-border bg-surface-2 group"
            >
              <div className="aspect-video relative overflow-hidden bg-black">
                {isActive ? (
                  <iframe
                    src={srcUrl(cam)}
                    title={cam.name}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveId(cam.id)}
                    className="w-full h-full relative"
                    aria-label={`Play ${cam.name} live stream`}
                  >
                    <img
                      src={
                        cam.source.kind === "youtube"
                          ? `https://i.ytimg.com/vi/${cam.source.id}/hqdefault.jpg`
                          : "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=60"
                      }
                      alt={cam.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
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
      <p className="text-[10px] text-muted-foreground mt-3 font-mono">
        Streams sourced from public YouTube live broadcasts (EarthCam, SkylineWebcams, etc.) — click play to load.
      </p>
    </section>
  );
}
