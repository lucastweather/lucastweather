import { useEffect, useRef, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { Wind, ExternalLink, AlertTriangle } from "lucide-react";
import {
  BASIN_LABEL,
  fetchActiveStorms,
  outlookExternalUrl,
  outlookImageUrl,
  stormBasin,
  type Basin,
  type NHCStorm,
  type OutlookRange,
} from "@/lib/nhc";

const fetchHurricaneData = createServerFn({ method: "GET" }).handler(
  async (): Promise<NHCStorm[]> => fetchActiveStorms(),
);

/**
 * National Hurricane Center tropical weather outlook + active storm tracker.
 * All HTTP + URL building lives in `@/lib/nhc`; this component is purely
 * presentational. Basin / outlook-range toggles are local state so swapping
 * them never reloads the active-storms list.
 */
export default function HurricaneTracker() {
  const [storms, setStorms] = useState<NHCStorm[]>([]);
  const [basin, setBasin] = useState<Basin>("atlantic");
  const [outlookRange, setOutlookRange] = useState<OutlookRange>("7d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [imgBust, setImgBust] = useState(() => Math.floor(Date.now() / 600_000));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchHurricaneData()
      .then((data) => {
        if (!cancelled) setStorms(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const t = setInterval(() => setImgBust(Math.floor(Date.now() / 600_000)), 600_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const basinStorms = storms.filter((s) => stormBasin(s.id) === basin);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wind className="size-5 text-primary" /> Hurricane Tracker
          <span className="chip px-2 py-0.5 text-[10px] text-success border-success/30">
            NHC Live
          </span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="chip p-0.5 flex" role="tablist" aria-label="Basin">
            {(Object.keys(BASIN_LABEL) as Basin[]).map((b) => (
              <button
                key={b}
                onClick={() => setBasin(b)}
                aria-pressed={basin === b}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  basin === b ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {BASIN_LABEL[b]}
              </button>
            ))}
          </div>
          <div className="chip p-0.5 flex" role="tablist" aria-label="Outlook range">
            {(["2d", "7d"] as OutlookRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setOutlookRange(r)}
                aria-pressed={outlookRange === r}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  outlookRange === r ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "2d" ? "2-Day" : "7-Day"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <OutlookFigure basin={basin} range={outlookRange} cacheBust={imgBust} />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Active Storms{" "}
            <span className="text-xs font-mono text-muted-foreground">
              ({basinStorms.length})
            </span>
          </h3>
          {loading && (
            <div className="text-xs text-muted-foreground">Loading active storms…</div>
          )}
          {err && (
            <div className="chip px-3 py-2 text-xs text-danger border-danger/30 flex items-center gap-2">
              <AlertTriangle className="size-3.5" /> {err}
            </div>
          )}
          {!loading && !err && basinStorms.length === 0 && (
            <div className="chip px-3 py-3 text-xs text-muted-foreground">
              No active tropical cyclones in the {BASIN_LABEL[basin]} basin. Check the
              outlook for areas of disturbed weather being monitored for development.
            </div>
          )}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {basinStorms.map((s) => (
              <StormCard key={s.id} storm={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Preloads the new outlook image off-screen and only swaps the visible <img>
 * once it's ready, so toggling basin/range doesn't flash a blank panel.
 */
function OutlookFigure({
  basin,
  range,
  cacheBust,
}: {
  basin: Basin;
  range: OutlookRange;
  cacheBust: number;
}) {
  const targetUrl = outlookImageUrl(basin, range, cacheBust);
  const [src, setSrc] = useState(targetUrl);
  const lastRequested = useRef(targetUrl);

  useEffect(() => {
    if (targetUrl === lastRequested.current && targetUrl === src) return;
    lastRequested.current = targetUrl;
    const img = new Image();
    img.onload = () => {
      if (lastRequested.current === targetUrl) setSrc(targetUrl);
    };
    img.src = targetUrl;
  }, [targetUrl, src]);

  return (
    <figure className="rounded-xl overflow-hidden border border-border bg-white relative">
      <img
        src={src}
        alt={`${BASIN_LABEL[basin]} ${range === "7d" ? "7-day" : "2-day"} tropical weather outlook`}
        className="w-full h-auto block transition-opacity duration-200"
        loading="lazy"
      />
      <a
        href={outlookExternalUrl(basin, range)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 chip px-2 py-1 text-[10px] font-mono bg-background/80 hover:bg-background flex items-center gap-1"
      >
        NHC <ExternalLink className="size-3" />
      </a>
      <figcaption className="px-3 py-2 text-[11px] font-mono text-muted-foreground bg-surface-2 border-t border-border">
        {BASIN_LABEL[basin]} · {range === "7d" ? "7-Day" : "2-Day"} Tropical Weather
        Outlook · NOAA / National Hurricane Center
      </figcaption>
    </figure>
  );
}

function StormCard({ storm }: { storm: NHCStorm }) {
  const wind = Number(storm.intensity);
  const cat = saffirSimpson(wind);
  const accent =
    cat.tier >= 3
      ? "border-danger/50 text-danger"
      : cat.tier >= 1
        ? "border-warning/50 text-warning"
        : "border-info/40 text-info";
  const coneUrl = storm.forecastConeGraphic?.url ?? null;

  return (
    <details className="chip group" open>
      <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center gap-3">
        <span
          className={`font-mono text-xs font-semibold rounded-md px-2 py-0.5 border ${accent}`}
        >
          {cat.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {storm.classification} {storm.name}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground truncate">
            {wind ? `${wind} mph` : "—"} · {storm.pressure ? `${storm.pressure} mb` : "—"} ·{" "}
            {storm.latitude} {storm.longitude}
          </div>
        </div>
      </summary>
      <div className="border-t border-border px-3 py-2.5 space-y-2">
        <div className="text-[11px] font-mono text-muted-foreground">
          Moving {bearingLabel(storm.movementDir)} at {storm.movementSpeed} mph · Updated{" "}
          {new Date(storm.lastUpdate).toLocaleString()}
        </div>
        {coneUrl && (
          <a
            href={coneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border border-border bg-white hover:opacity-95"
          >
            <img
              src={coneUrl}
              alt={`${storm.name} forecast cone`}
              className="w-full h-auto block"
              loading="lazy"
            />
          </a>
        )}
        <div className="flex flex-wrap gap-2">
          {storm.publicAdvisory?.url && (
            <a
              href={storm.publicAdvisory.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip px-2 py-1 text-[11px] hover:bg-accent/30 flex items-center gap-1"
            >
              Advisory #{storm.publicAdvisory.advNum} <ExternalLink className="size-3" />
            </a>
          )}
          {storm.trackAndWatchesWarnings?.url && (
            <a
              href={storm.trackAndWatchesWarnings.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip px-2 py-1 text-[11px] hover:bg-accent/30 flex items-center gap-1"
            >
              Watches & Warnings <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </details>
  );
}

function saffirSimpson(wind: number): { label: string; tier: number } {
  if (!wind || Number.isNaN(wind)) return { label: "TD", tier: 0 };
  if (wind < 39) return { label: "TD", tier: 0 };
  if (wind < 74) return { label: "TS", tier: 0 };
  if (wind < 96) return { label: "Cat 1", tier: 1 };
  if (wind < 111) return { label: "Cat 2", tier: 2 };
  if (wind < 130) return { label: "Cat 3", tier: 3 };
  if (wind < 157) return { label: "Cat 4", tier: 4 };
  return { label: "Cat 5", tier: 5 };
}

function bearingLabel(deg: number): string {
  if (!deg && deg !== 0) return "—";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round((deg % 360) / 22.5) % 16];
}
