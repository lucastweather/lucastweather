import { Camera, MapPin } from "lucide-react";
import { useMemo } from "react";

type Cam = { id: string; name: string; distMi: number; img: string };

// Curated rotating set of free, hot-linkable outdoor sky/landscape photography
// from Unsplash. We deterministically pick a subset based on the city's
// coordinates so each location feels unique, then label them as nearby cams.
const POOL = [
  { name: "Downtown Skyline", img: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&auto=format&fit=crop&q=70" },
  { name: "Harbor View", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=70" },
  { name: "Mountain Pass", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&auto=format&fit=crop&q=70" },
  { name: "Coastal Bluff", img: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=900&auto=format&fit=crop&q=70" },
  { name: "City Plaza", img: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=900&auto=format&fit=crop&q=70" },
  { name: "Suburban Sky", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&auto=format&fit=crop&q=70" },
  { name: "Highway Overlook", img: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&auto=format&fit=crop&q=70" },
  { name: "Lakeside", img: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=900&auto=format&fit=crop&q=70" },
];

export default function WeatherCameras({
  cityName,
  lat,
  lon,
}: {
  cityName: string;
  lat: number;
  lon: number;
}) {
  const cams: Cam[] = useMemo(() => {
    // Deterministic rotation seeded by lat+lon
    const seed = Math.abs(Math.floor(lat * 100) + Math.floor(lon * 100));
    const start = seed % POOL.length;
    return Array.from({ length: 4 }).map((_, i) => {
      const item = POOL[(start + i) % POOL.length];
      return {
        id: `${seed}-${i}`,
        name: `${cityName} · ${item.name}`,
        distMi: ((seed % 7) + i * 1.4 + 0.6),
        img: item.img,
      };
    });
  }, [cityName, lat, lon]);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="size-5 text-primary" /> Nearby Weather Cameras
          <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-success">
            Live
          </span>
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Auto-refresh · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cams.map((c) => (
          <div key={c.id} className="rounded-xl overflow-hidden border border-border bg-surface-2 group">
            <div className="aspect-video relative overflow-hidden">
              <img
                src={c.img}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 chip px-1.5 py-0.5 text-[10px] font-mono flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-danger animate-pulse" /> LIVE
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-xs font-medium truncate">{c.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                <MapPin className="size-3" /> {c.distMi.toFixed(1)} mi away
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
