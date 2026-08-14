import { useEffect, useState } from "react";
import { Wind as WindIcon, Flower2, Trees, Sprout } from "lucide-react";
import { fetchAirQuality, aqiCategory, type AirQuality } from "@/lib/airquality";

export default function AirQualityPanel({ lat, lon }: { lat: number; lon: number }) {
  const [aq, setAq] = useState<AirQuality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAq(null);
    fetchAirQuality(lat, lon).then((r) => {
      if (!cancelled) {
        setAq(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const cat = aqiCategory(aq?.usAqi ?? null);
  const aqiPct = Math.min(100, ((aq?.usAqi ?? 0) / 300) * 100);

  return (
    <section className="panel p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="icon-tile">
          <WindIcon className="size-4" />
        </span>
        Air Quality & Pollen
        <span className="chip px-2 py-0.5 text-[10px] text-primary border-primary/40">
          US AQI · CAMS blend

        </span>
      </h2>

      {loading && <div className="text-sm text-muted-foreground">Loading air quality…</div>}

      {!loading && aq && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* AQI dial */}
          <div className="chip p-5 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
              US AQI
            </div>
            <div
              className="text-5xl font-semibold tabular-nums"
              style={{ color: cat.color }}
            >
              {aq.usAqi ?? "—"}
            </div>
            <div className="mt-1 text-sm font-medium" style={{ color: cat.color }}>
              {cat.label}
            </div>
            <div className="w-full h-2 rounded-full mt-3 overflow-hidden bg-surface-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${aqiPct}%`, background: cat.color }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-3 leading-snug">{cat.advice}</div>
          </div>

          {/* Pollutants */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Pollutant label="PM2.5" value={aq.pm25} unit="µg/m³" />
            <Pollutant label="PM10" value={aq.pm10} unit="µg/m³" />
            <Pollutant label="Ozone" value={aq.ozone} unit="µg/m³" />
            <Pollutant label="NO₂" value={aq.no2} unit="µg/m³" />
            <Pollutant label="SO₂" value={aq.so2} unit="µg/m³" />
            <Pollutant label="CO" value={aq.co} unit="µg/m³" />
          </div>

          {/* Pollen */}
          {(aq.grassPollen != null || aq.treePollen != null || aq.weedPollen != null) && (
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <PollenChip
                icon={<Sprout className="size-4" />}
                label="Grass"
                value={aq.grassPollen}
              />
              <PollenChip icon={<Trees className="size-4" />} label="Tree" value={aq.treePollen} />
              <PollenChip
                icon={<Flower2 className="size-4" />}
                label="Weed"
                value={aq.weedPollen}
              />
            </div>
          )}
        </div>
      )}

      {!loading && !aq && (
        <div className="text-sm text-muted-foreground">Air quality data unavailable here.</div>
      )}
    </section>
  );
}

function Pollutant({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="chip px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">
        {value != null ? value.toFixed(1) : "—"}
        <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
}

function PollenChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  const level =
    value == null
      ? { txt: "—", color: "var(--muted-foreground)" }
      : value < 5
        ? { txt: "Low", color: "var(--success)" }
        : value < 25
          ? { txt: "Moderate", color: "var(--warning)" }
          : { txt: "High", color: "var(--danger)" };
  return (
    <div className="chip px-3 py-2.5 flex items-center gap-3">
      <span style={{ color: level.color }}>{icon}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          {label} pollen
        </div>
        <div className="text-sm font-semibold" style={{ color: level.color }}>
          {level.txt}
          {value != null && (
            <span className="ml-2 text-xs text-muted-foreground tabular-nums">
              {value.toFixed(1)} gr/m³
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
