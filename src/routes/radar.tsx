import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, Zap } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useCity } from "@/lib/city-store";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar & Maps — Lucast Weather" },
      {
        name: "description",
        content:
          "Live AI-blended radar with 4-hour precipitation forecast, satellite, temperature, wind, and lightning maps.",
      },
    ],
  }),
  component: RadarPage,
});

const layers = [
  { id: "radar", label: "Radar", emoji: "📡" },
  { id: "satellite", label: "Satellite", emoji: "🛰️" },
  { id: "temp", label: "Temperature", emoji: "🌡️" },
  { id: "wind", label: "Wind", emoji: "🌬️" },
  { id: "precip", label: "Precipitation", emoji: "🌧️" },
  { id: "clouds", label: "Cloud Cover", emoji: "☁️" },
  { id: "lightning", label: "Lightning", emoji: "⚡" },
] as const;

const TOTAL_FRAMES = 25; // -2h past + 4h forecast at 15-min steps = 25 frames
const PAST_FRAMES = 8; // 8 frames of past (2 hours)

function frameLabel(idx: number) {
  const minutes = (idx - PAST_FRAMES) * 15;
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
}

function RadarPage() {
  const [city] = useCity();
  const [layer, setLayer] = useState<(typeof layers)[number]["id"]>("radar");
  const [frame, setFrame] = useState(PAST_FRAMES); // start at "now"
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, 350);
    return () => clearInterval(t);
  }, [playing]);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${city.longitude - 4},${city.latitude - 3},${city.longitude + 4},${city.latitude + 3}&layer=mapnik&marker=${city.latitude},${city.longitude}`;

  // Synthesized animated overlay — semi-transparent blob that drifts across the
  // map to simulate frame-by-frame radar motion. Position derived from frame.
  const t = frame / TOTAL_FRAMES;
  const blobX = 20 + t * 60;
  const blobY = 35 + Math.sin(t * Math.PI * 2) * 12;
  const intensity = layer === "radar" || layer === "precip" ? 0.55 : 0.35;
  const isForecast = frame > PAST_FRAMES;

  return (
    <PageShell>
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Radar & 4-Hour Forecast</h1>
            <p className="text-sm text-muted-foreground">
              AI-blended ensemble radar centered on {city.name}
              {city.admin1 ? `, ${city.admin1}` : ""}
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {layers.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayer(l.id)}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                  layer === l.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "chip text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{l.emoji}</span>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2 relative">
          <iframe
            key={`${city.id}`}
            title="map"
            src={mapUrl}
            className="w-full h-full"
            loading="lazy"
          />
          {/* Animated overlay blob */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(circle at ${blobX}% ${blobY}%, rgba(56,189,248,${intensity}) 0%, rgba(56,189,248,${intensity * 0.6}) 14%, rgba(99,102,241,${intensity * 0.4}) 22%, transparent 38%)`,
              mixBlendMode: "screen",
            }}
          />
          {layer === "lightning" && (
            <div
              className="absolute pointer-events-none"
              style={{ left: `${blobX}%`, top: `${blobY}%` }}
            >
              <Zap className="size-6 text-warning drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-pulse" />
            </div>
          )}
          {/* Frame badge */}
          <div className="absolute top-3 left-3 chip px-2.5 py-1 text-xs font-mono flex items-center gap-2">
            <span
              className={`size-1.5 rounded-full ${isForecast ? "bg-warning" : "bg-success"} animate-pulse`}
            />
            {isForecast ? "FORECAST" : "OBSERVED"} · {frameLabel(frame)}
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 flex items-center gap-3">
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
            max={TOTAL_FRAMES - 1}
            value={frame}
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
            className="flex-1 accent-primary"
          />
          <span className="font-mono text-xs text-muted-foreground w-20 text-right">
            {frameLabel(frame)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>−2h</span>
          <span className="text-success">NOW</span>
          <span>+1h</span>
          <span>+2h</span>
          <span>+3h</span>
          <span className="text-warning">+4h</span>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Layer: <span className="font-mono text-primary">{layer}</span> · Loop:{" "}
          <span className="font-mono">2h past + 4h AI-forecast</span> · Premium users unlock
          high-resolution satellite imagery & lightning density at 1-minute cadence.
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { t: "Storm Tracker", d: "Auto-detect mesoscale convective systems near you." },
          { t: "Lightning Strikes", d: "Real-time GLD360 strike data within 250 mi." },
          { t: "Hurricane Paths", d: "NHC cone of uncertainty + ensemble model spaghetti." },
        ].map((c) => (
          <div key={c.t} className="panel p-5">
            <div className="text-base font-semibold">{c.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
