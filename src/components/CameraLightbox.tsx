import { useEffect, useState } from "react";
import { X, MapPin, Wind, Droplets, Thermometer, ExternalLink, Star } from "lucide-react";
import {
  fetchWeather,
  weatherIcon,
  weatherLabel,
  type CurrentWeather,
} from "@/lib/weather";
import { useSubscription } from "@/lib/auth-store";
import { useFavorites } from "@/lib/favorites-store";

export type LightboxCam = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  source:
    | { kind: "youtube"; id: string }
    | { kind: "iframe"; url: string }
    | { kind: "image"; url: string };
};

function srcUrl(c: LightboxCam) {
  if (c.source.kind === "youtube") {
    return `https://www.youtube.com/embed/${c.source.id}?autoplay=1&mute=1&controls=1&modestbranding=1&playsinline=1&rel=0`;
  }
  return c.source.url;
}

function externalUrl(c: LightboxCam) {
  if (c.source.kind === "youtube") return `https://www.youtube.com/watch?v=${c.source.id}`;
  return (c.source as any).url;
}

/**
 * Fullscreen camera viewer with live weather conditions overlaid on the
 * stream. Pulls the on-the-ground weather for the camera's coordinates so the
 * overlay is always relevant to what you're seeing in the feed.
 */
export default function CameraLightbox({
  cam,
  onClose,
}: {
  cam: LightboxCam;
  onClose: () => void;
}) {
  const [wx, setWx] = useState<CurrentWeather | null>(null);
  const { subscribed } = useSubscription();
  const { isFavoriteCamera, addCamera, remove } = useFavorites();
  const isFav = isFavoriteCamera(cam.id);

  useEffect(() => {
    let cancelled = false;
    fetchWeather(cam.lat, cam.lon)
      .then((d) => !cancelled && setWx(d.current))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cam.lat, cam.lon]);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function toggleFavorite() {
    if (!subscribed) return;
    if (isFav) {
      await remove("camera", cam.id);
    } else {
      await addCamera({ id: cam.id, name: cam.name, region: cam.region });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Stream */}
        {cam.source.kind === "image" ? (
          <RefreshingImage url={cam.source.url} alt={cam.name} />
        ) : (
          <iframe
            src={srcUrl(cam)}
            title={cam.name}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-start justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <div className="text-white text-lg font-semibold drop-shadow">{cam.name}</div>
            <div className="text-white/80 text-xs font-mono flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" /> {cam.region} ·{" "}
              {cam.lat.toFixed(3)}°, {cam.lon.toFixed(3)}°
            </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={toggleFavorite}
              disabled={!subscribed}
              className={`size-10 rounded-full flex items-center justify-center backdrop-blur transition-colors ${
                isFav
                  ? "bg-warning/90 text-warning-foreground hover:bg-warning"
                  : subscribed
                    ? "bg-black/50 text-white hover:bg-black/70"
                    : "bg-black/30 text-white/40 cursor-not-allowed"
              }`}
              title={
                subscribed
                  ? isFav
                    ? "Remove from favorites"
                    : "Add to favorites"
                  : "Premium only"
              }
              aria-label="Favorite"
            >
              <Star className={`size-5 ${isFav ? "fill-current" : ""}`} />
            </button>
            <a
              href={externalUrl(cam)}
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur flex items-center justify-center"
              title="Open source"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              onClick={onClose}
              className="size-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur flex items-center justify-center"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Weather overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/85 via-black/55 to-transparent pointer-events-none">
          {wx ? (
            <div className="flex items-end justify-between flex-wrap gap-4 text-white">
              <div className="flex items-center gap-4">
                <div className="text-5xl sm:text-6xl drop-shadow-lg">
                  {weatherIcon(wx.weatherCode, wx.isDay, wx.cloudCover)}
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-semibold leading-none drop-shadow">
                    {Math.round(wx.temperature)}°F
                  </div>
                  <div className="text-xs sm:text-sm text-white/85 mt-1 drop-shadow">
                    {weatherLabel(wx.weatherCode, wx.cloudCover)} · Feels like{" "}
                    {Math.round(wx.apparent)}°
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
                <Pill icon={<Wind className="size-3.5" />} label="Wind">
                  {Math.round(wx.windSpeed)} mph
                </Pill>
                <Pill icon={<Droplets className="size-3.5" />} label="Humidity">
                  {wx.humidity}%
                </Pill>
                <Pill icon={<Thermometer className="size-3.5" />} label="Dew">
                  {Math.round(wx.dewPoint)}°
                </Pill>
              </div>
            </div>
          ) : (
            <div className="text-white/70 text-xs font-mono">Loading conditions…</div>
          )}
          <div className="mt-3 text-[10px] text-white/50 font-mono">
            Press ESC or click outside to close
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-black/40 backdrop-blur rounded-lg px-2.5 py-1.5 border border-white/10">
      <div className="text-white/60 flex items-center gap-1 text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-white font-mono text-sm mt-0.5">{children}</div>
    </div>
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
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=80";
      }}
    />
  );
}
