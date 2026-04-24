import { useEffect, useState } from "react";
import { Wind, ExternalLink, AlertTriangle } from "lucide-react";

/**
 * National Hurricane Center tropical weather outlook + active storm tracker.
 *
 * Data sources (all public NOAA/NHC endpoints):
 *  - https://www.nhc.noaa.gov/CurrentStorms.json — JSON list of active storms
 *  - https://www.nhc.noaa.gov/xgtwo/two_atl_2d0.png — Atlantic 2-day outlook
 *  - https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png — Atlantic 7-day outlook
 *  - https://www.nhc.noaa.gov/xgtwo/two_pac_2d0.png — Eastern Pacific 2-day
 *  - https://www.nhc.noaa.gov/xgtwo/two_pac_7d0.png — Eastern Pacific 7-day
 *
 * Forecast cone images for active storms are referenced by NHC ID
 * (e.g. AL052024) at https://www.nhc.noaa.gov/storm_graphics/{basin}/{id}_5day_cone_with_line_and_wind.png
 */

type NHCStorm = {
  id: string;
  binNumber: string;
  name: string;
  classification: string;
  intensity: string;
  pressure: string;
  latitude: string;
  longitude: string;
  latitudeNumeric: number;
  longitudeNumeric: number;
  movementDir: number;
  movementSpeed: number;
  lastUpdate: string;
  publicAdvisory?: { advNum: string; issuance: string; url: string };
  forecastTrack?: { kmzFile?: string; zipFile?: string };
  forecastConeGraphic?: { url: string };
  trackAndWatchesWarnings?: { url: string };
};

type Basin = "atlantic" | "eastpacific" | "centralpacific";

const BASIN_LABEL: Record<Basin, string> = {
  atlantic: "Atlantic",
  eastpacific: "E. Pacific",
  centralpacific: "C. Pacific",
};

const OUTLOOK_PATH: Record<Basin, string> = {
  atlantic: "atl",
  eastpacific: "pac",
  centralpacific: "cpac",
};

export default function HurricaneTracker() {
  const [storms, setStorms] = useState<NHCStorm[]>([]);
  const [basin, setBasin] = useState<Basin>("atlantic");
  const [outlookRange, setOutlookRange] = useState<"2d" | "7d">("7d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [imgBust, setImgBust] = useState(() => Math.floor(Date.now() / 600_000));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch("https://www.nhc.noaa.gov/CurrentStorms.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("NHC unavailable"))))
      .then((d) => {
        if (cancelled) return;
        const list: NHCStorm[] = Array.isArray(d?.activeStorms)
          ? d.activeStorms.map((s: any) => ({
              id: s.id,
              binNumber: s.binNumber,
              name: s.name,
              classification: s.classification,
              intensity: s.intensity,
              pressure: s.pressure,
              latitude: s.latitude,
              longitude: s.longitude,
              latitudeNumeric: Number(s.latitudeNumeric ?? 0),
              longitudeNumeric: Number(s.longitudeNumeric ?? 0),
              movementDir: Number(s.movementDir ?? 0),
              movementSpeed: Number(s.movementSpeed ?? 0),
              lastUpdate: s.lastUpdate,
              publicAdvisory: s.publicAdvisory,
              forecastTrack: s.forecastTrack,
              forecastConeGraphic: s.forecastConeGraphic,
              trackAndWatchesWarnings: s.trackAndWatchesWarnings,
            }))
          : [];
        setStorms(list);
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));

    // Outlook images update every ~30 minutes; bust cache every 10 min.
    const t = setInterval(() => setImgBust(Math.floor(Date.now() / 600_000)), 600_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const basinStorms = storms.filter((s) => stormBasin(s.id) === basin);
  const outlookUrl = `https://www.nhc.noaa.gov/xgtwo/two_${OUTLOOK_PATH[basin]}_${outlookRange}0.png?t=${imgBust}`;
  const outlookExternal = `https://www.nhc.noaa.gov/gtwo.php?basin=${basin}&fdays=${outlookRange === "7d" ? 7 : 2}`;

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
          <div className="chip p-0.5 flex">
            {(Object.keys(BASIN_LABEL) as Basin[]).map((b) => (
              <button
                key={b}
                onClick={() => setBasin(b)}
                className={`px-2.5 py-1 rounded text-xs ${
                  basin === b ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                {BASIN_LABEL[b]}
              </button>
            ))}
          </div>
          <div className="chip p-0.5 flex">
            <button
              onClick={() => setOutlookRange("2d")}
              className={`px-2.5 py-1 rounded text-xs ${
                outlookRange === "2d" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              2-Day
            </button>
            <button
              onClick={() => setOutlookRange("7d")}
              className={`px-2.5 py-1 rounded text-xs ${
                outlookRange === "7d" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              7-Day
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <figure className="rounded-xl overflow-hidden border border-border bg-white relative">
          <img
            src={outlookUrl}
            alt={`${BASIN_LABEL[basin]} ${outlookRange === "7d" ? "7-day" : "2-day"} tropical weather outlook`}
            className="w-full h-auto block"
            loading="lazy"
          />
          <a
            href={outlookExternal}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 chip px-2 py-1 text-[10px] font-mono bg-background/80 hover:bg-background flex items-center gap-1"
          >
            NHC <ExternalLink className="size-3" />
          </a>
          <figcaption className="px-3 py-2 text-[11px] font-mono text-muted-foreground bg-surface-2 border-t border-border">
            {BASIN_LABEL[basin]} · {outlookRange === "7d" ? "7-Day" : "2-Day"} Tropical Weather Outlook
            · NOAA / National Hurricane Center
          </figcaption>
        </figure>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Active Storms <span className="text-xs font-mono text-muted-foreground">({basinStorms.length})</span>
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
              No active tropical cyclones in the {BASIN_LABEL[basin]} basin. Check the outlook
              for areas of disturbed weather being monitored for development.
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

function StormCard({ storm }: { storm: NHCStorm }) {
  const wind = Number(storm.intensity);
  const cat = saffirSimpson(wind);
  const accent =
    cat.tier >= 3
      ? "border-danger/50 text-danger"
      : cat.tier >= 1
        ? "border-warning/50 text-warning"
        : "border-info/40 text-info";
  const coneUrl = storm.forecastConeGraphic?.url
    ? storm.forecastConeGraphic.url
    : null;

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

function stormBasin(id: string): Basin {
  if (id.startsWith("AL")) return "atlantic";
  if (id.startsWith("EP")) return "eastpacific";
  if (id.startsWith("CP")) return "centralpacific";
  return "atlantic";
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
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}
