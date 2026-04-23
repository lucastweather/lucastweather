import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wind,
  Droplets,
  Gauge,
  Compass,
  Thermometer,
  Sun,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Lock, Crown } from "lucide-react";
import PageShell from "@/components/PageShell";
import AdSlot from "@/components/AdSlot";
import WeatherCameras from "@/components/WeatherCameras";
import DailyRecommendations from "@/components/DailyRecommendations";
import FavoriteCities from "@/components/FavoriteCities";
import WeatherIcon from "@/components/WeatherIcon";
import { useCity } from "@/lib/city-store";
import { useSubscription } from "@/lib/auth-store";
import {
  fetchWeather,
  fetchEarthquakes,
  weatherIcon,
  weatherLabel,
  forecastNarrative,
  type CurrentWeather,
  type DailyForecast,
  type HourlyPoint,
  type MinutelyPoint,
  type Earthquake,
} from "@/lib/weather";
import RadarMap from "@/components/RadarMap";
import EarthquakeMap from "@/components/EarthquakeMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lucast Weather — AI Hyperlocal Forecasts, Radar & Alerts" },
      {
        name: "description",
        content:
          "AI-powered hyper-accurate weather, free hourly forecast, MinuteCast, live radar with 4-hour outlook, nearby weather cameras, and earthquake tracker.",
      },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const [city] = useCity();
  const { subscribed } = useSubscription();
  const [data, setData] = useState<{
    current: CurrentWeather;
    daily: DailyForecast[];
    hourly: HourlyPoint[];
    minutely: MinutelyPoint[];
  } | null>(null);
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [magFilter, setMagFilter] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Radar-driven nowcast intensity (0..1) — used to sync MinuteCast so it
  // never claims "no rain" when the radar is showing precipitation overhead.
  const [radarRain, setRadarRain] = useState<{ intensity: number; hasRain: boolean }>({
    intensity: 0,
    hasRain: false,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchWeather(city.latitude, city.longitude)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city.id, city.latitude, city.longitude]);

  useEffect(() => {
    fetchEarthquakes().then(setQuakes);
  }, []);

  const filteredQuakes = quakes.filter((q) => q.mag >= magFilter).slice(0, 10);

  return (
    <PageShell>
      {err && (
        <div className="panel p-4 flex items-center gap-3 text-danger">
          <AlertCircle className="size-5" />
          {err}
        </div>
      )}

      {/* Current conditions */}
      <section className="panel p-6 lg:p-8">
        <div className="font-mono text-xs text-muted-foreground tracking-wider flex items-center gap-2">
          <span>
            {city.name}
            {city.admin1 ? `, ${city.admin1}` : ""} · {city.country}
          </span>
          <span className="chip px-1.5 py-0.5 text-[10px] text-primary border-primary/30 flex items-center gap-1">
            <Sparkles className="size-3" /> AI Ensemble
          </span>
        </div>
        <div className="mt-3 flex items-center gap-6 flex-wrap">
          <div className="leading-none">
            {data ? (
              <WeatherIcon
                code={data.current.weatherCode}
                isDay={data.current.isDay}
                cloudCover={data.current.cloudCover}
                className="size-20"
              />
            ) : (
              <WeatherIcon code={2} className="size-20" />
            )}
          </div>
          <div>
            <div className="text-6xl font-semibold tracking-tight">
              {data ? Math.round(data.current.temperature) : "—"}°F
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {data
                  ? `Feels like ${Math.round(data.current.apparent)}°F · ${weatherLabel(
                    data.current.weatherCode,
                    data.current.cloudCover,
                    data.current.isDay,
                  )}`
                : loading
                  ? "Loading…"
                  : ""}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric icon={<Wind className="size-4" />} label="Wind" value={data ? `${Math.round(data.current.windSpeed)} mph` : "—"} />
          <Metric icon={<Droplets className="size-4" />} label="Humidity" value={data ? `${data.current.humidity}%` : "—"} />
          <Metric icon={<Gauge className="size-4" />} label="Pressure" value={data ? `${data.current.pressure.toFixed(2)} in` : "—"} />
          <Metric icon={<Compass className="size-4" />} label="Wind Dir" value={data ? `${data.current.windDirection}°` : "—"} />
          <Metric icon={<Thermometer className="size-4" />} label="Dew Point" value={data ? `${Math.round(data.current.dewPoint)}°F` : "—"} />
          <Metric icon={<Sun className="size-4" />} label="UV Index" value={data ? `${data.current.uvIndex}` : "—"} />
        </div>
      </section>

      {/* Favorite Cities (premium) */}
      <FavoriteCities />

      {/* Daily activity recommendations */}
      {data && (
        <DailyRecommendations
          current={data.current}
          today={data.daily[0]}
          cityName={city.name}
        />
      )}

      {/* Sponsored ad — hidden for premium subscribers */}
      {!subscribed && <AdSlot />}

      {/* Nearby weather cameras */}
      <WeatherCameras cityName={city.name} lat={city.latitude} lon={city.longitude} />

      {/* Hourly forecast — FREE */}
      <section className="panel p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="size-5 text-primary" /> Hourly Forecast
            <span className="chip px-2 py-0.5 text-[10px] text-success border-success/30">
              Free · Next 24h
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex gap-2 min-w-max pb-2">
            {(data?.hourly ?? []).slice(0, 24).map((h, i) => {
              const d = new Date(h.time);
              const hr = d.getHours();
              const label =
                i === 0
                  ? "Now"
                  : `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}${hr < 12 ? "a" : "p"}`;
              return (
                <div
                  key={h.time}
                  className="chip flex flex-col items-center gap-1 px-3 py-3 min-w-[64px]"
                  title={`${weatherLabel(h.weatherCode, h.cloudCover, h.isDay)} · ${Math.round(h.temp)}°F · ${h.precipProb}% precip · ${Math.round(h.windSpeed)} mph wind`}
                >
                  <div className="text-[11px] font-mono text-muted-foreground">{label}</div>
                  <WeatherIcon
                    code={h.weatherCode}
                    isDay={h.isDay}
                    cloudCover={h.cloudCover}
                    className="size-7"
                  />
                  <div className="text-sm font-semibold">{Math.round(h.temp)}°</div>
                  <div className="text-[10px] font-mono text-info">{h.precipProb}%</div>
                </div>
              );
            })}
            {!data && (
              <div className="text-sm text-muted-foreground py-4">Loading hourly…</div>
            )}
          </div>
        </div>
      </section>

      {/* 7-day forecast (free) + 16-day teaser (premium) */}
      <section className="panel p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">
            {subscribed ? "16-Day Forecast" : "7-Day Forecast"}
            {subscribed && (
              <span className="ml-2 chip px-2 py-0.5 text-[10px] text-warning border-warning/30">
                <Crown className="size-3 inline -mt-0.5 mr-1" />
                Premium
              </span>
            )}
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {(data?.daily ?? []).slice(0, subscribed ? 16 : 7).map((d, i) => (
            <ForecastRow key={d.date} day={d} index={i} />
          ))}
          {!data && <li className="text-sm text-muted-foreground py-2">Loading forecast…</li>}
        </ul>
        {!subscribed && (data?.daily?.length ?? 0) >= 7 && (
          <Link
            to="/premium"
            search={{ status: undefined }}
            className="mt-4 panel p-4 flex items-center justify-between gap-3 border-warning/30 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="size-5 text-warning" />
              <div className="text-sm">
                <div className="font-semibold">9 more days available with Premium</div>
                <div className="text-muted-foreground text-xs">
                  Unlock the full 16-day extended forecast for $3/month.
                </div>
              </div>
            </div>
            <span className="chip px-3 py-1.5 text-xs text-warning border-warning/40">
              Upgrade →
            </span>
          </Link>
        )}
      </section>

      {/* Live radar (synced with MinuteCast below) */}
      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>📡</span> Live Radar
          <span className="chip px-2 py-0.5 text-[10px] text-primary border-primary/30">
            Past 2h + 30-min outlook
          </span>
        </h2>
        <RadarMap
          key={`home-${city.id}`}
          lat={city.latitude}
          lon={city.longitude}
          showForecast={true}
          onNowcast={(intensity, hasRain) => setRadarRain({ intensity, hasRain })}
        />
      </section>

      {/* MinuteCast — minute by minute, synchronized with radar nowcast */}
      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <span>🌧️</span> MinuteCast
          <span className="chip px-2 py-0.5 text-[10px] text-primary border-primary/30">
            Minute-by-minute · 60 min
          </span>
          {radarRain.hasRain && (
            <span className="chip px-2 py-0.5 text-[10px] text-warning border-warning/40">
              Radar-synced
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {(() => {
            if (!data) return "Loading minute-by-minute precipitation…";
            const next = syncedMinutely(data.minutely, radarRain);
            if (next.length === 0)
              return "Minute-by-minute data unavailable for this region.";
            const total = next.reduce((s, m) => s + m.precip, 0);
            if (total < 0.001 && !radarRain.hasRain)
              return "No precipitation expected in the next 60 minutes.";
            if (radarRain.hasRain && total < 0.001) {
              return "Radar shows precipitation overhead — light, brief sprinkles likely.";
            }
            const startIdx = next.findIndex((m) => m.precip > 0.001);
            const endIdx =
              next.length - 1 - [...next].reverse().findIndex((m) => m.precip > 0.001);
            return `Precipitation from minute ${startIdx} to ${endIdx} · ${total.toFixed(2)}" total`;
          })()}
        </p>
        <MinuteCastChart minutely={syncedMinutely(data?.minutely ?? [], radarRain)} />
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary/30" />
            Trace
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary/60" />
            Light
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary" />
            Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-warning" />
            Heavy
          </span>
        </div>
      </section>

      {/* Earthquake tracker */}
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🌍</span> Earthquake Tracker
            <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-success">
              USGS Live
            </span>
          </h2>
          <div className="flex gap-1">
            {[6, 5, 4, 3, 0].map((m) => (
              <button
                key={m}
                onClick={() => setMagFilter(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono ${
                  magFilter === m
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "chip text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === 0 ? "M<3" : `M${m}+`}
              </button>
            ))}
          </div>
        </div>
        <EarthquakeMap
          quakes={quakes.filter((q) => q.mag >= magFilter)}
          centerLat={city.latitude}
          centerLon={city.longitude}
        />
        <ul className="space-y-2 mt-4">
          {filteredQuakes.map((q) => (
            <li key={q.id} className="flex items-center gap-3 chip px-3 py-2">
              <span
                className={`font-mono text-sm font-semibold w-12 text-center rounded-md px-1 py-0.5 ${
                  q.mag >= 5
                    ? "bg-danger/20 text-danger"
                    : q.mag >= 4
                      ? "bg-warning/20 text-warning"
                      : "bg-info/20 text-info"
                }`}
              >
                {q.mag.toFixed(1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{q.place}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(q.time).toLocaleString()}
                </div>
              </div>
              <a
                href={q.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Details
              </a>
            </li>
          ))}
          {filteredQuakes.length === 0 && (
            <li className="text-sm text-muted-foreground">No quakes match this filter.</li>
          )}
        </ul>
      </section>
    </PageShell>
  );
}

function MinuteCastChart({ minutely }: { minutely: MinutelyPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const bars = minutely.length > 0 ? minutely : Array.from({ length: 60 }).map((_, i) => ({
    time: new Date(Date.now() + i * 60_000).toISOString(),
    precip: 0,
    precipProb: 0,
  }));
  const max = Math.max(0.02, ...bars.map((b) => b.precip));
  const hover = hoverIdx !== null ? bars[hoverIdx] : null;
  const intensity = (precip: number) =>
    precip > 0.05
      ? "Heavy"
      : precip > 0.02
        ? "Moderate"
        : precip > 0.005
          ? "Light"
          : precip > 0
            ? "Trace"
            : "None";

  return (
    <>
      <div
        className="relative flex items-end gap-[2px] h-24 bg-surface-2/40 rounded-lg px-2 py-2 border border-border"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {bars.map((m, i) => {
          const ratio = m.precip / max;
          const heightPct = m.precip > 0 ? Math.max(8, ratio * 100) : 4;
          const color =
            m.precip > 0.05
              ? "bg-warning"
              : m.precip > 0.02
                ? "bg-primary"
                : m.precip > 0.005
                  ? "bg-primary/60"
                  : m.precipProb > 30
                    ? "bg-primary/20"
                    : "bg-muted-foreground/15";
          const isHovered = hoverIdx === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onFocus={() => setHoverIdx(i)}
              tabIndex={-1}
              className={`flex-1 rounded-sm ${color} transition-all cursor-pointer ${
                isHovered ? "ring-2 ring-primary/80 ring-offset-1 ring-offset-surface-2" : ""
              }`}
              style={{ height: `${heightPct}%` }}
              aria-label={`Minute +${i}: ${m.precip.toFixed(3)} inch, ${Math.round(m.precipProb)}% chance`}
            />
          );
        })}
        {hover && hoverIdx !== null && (
          <div
            className="pointer-events-none absolute -top-2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-popover border border-border shadow-lg text-xs font-mono whitespace-nowrap z-10"
            style={{
              left: `calc(${(hoverIdx / Math.max(1, bars.length - 1)) * 100}% )`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-semibold text-foreground">
              {hoverIdx === 0 ? "Now" : `+${hoverIdx} min`}
            </div>
            <div className="text-muted-foreground">
              {hover.precip.toFixed(3)}" · {Math.round(hover.precipProb)}% · {intensity(hover.precip)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
        {[0, 10, 20, 30, 40, 50, 60].map((m) => (
          <span key={m}>{m === 0 ? "Now" : `+${m}m`}</span>
        ))}
      </div>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="chip px-3 py-3 flex flex-col items-center text-center">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="font-mono text-sm mt-1">{value}</div>
    </div>
  );
}

function ForecastRow({ day, index }: { day: DailyForecast; index: number }) {
  const [open, setOpen] = useState(false);
  const date = new Date(day.date);
  const label =
    index === 0
      ? "Today"
      : index === 1
        ? "Tomorrow"
        : date.toLocaleDateString(undefined, { weekday: "short" });
  const md = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 py-3 text-left hover:bg-accent/30 rounded-lg px-2"
      >
        <span className="w-8 flex items-center justify-center">
          <WeatherIcon code={day.weatherCode} isDay className="size-7" />
        </span>
        <span>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground font-mono">{md}</div>
        </span>
        <span className="hidden sm:block text-sm text-muted-foreground">
          {weatherLabel(day.weatherCode)}
        </span>
        <span className="text-xs text-info flex items-center gap-2">
          {day.precipSum > 0 && <span className="font-mono">💧 {day.precipSum.toFixed(2)}"</span>}
          <span className="font-mono">{day.precipProb ?? 0}%</span>
        </span>
        <span className="font-mono text-sm flex items-center gap-2">
          <span className="font-semibold">{Math.round(day.tMax)}°</span>
          <span className="text-muted-foreground">{Math.round(day.tMin)}°</span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="px-12 pb-3 text-xs text-muted-foreground space-y-1">
          <p className="text-foreground/80">{forecastNarrative(day)}</p>
          <p>
            High {Math.round(day.tMax)}°F · Low {Math.round(day.tMin)}°F · Precip{" "}
            {day.precipSum.toFixed(2)}" · Chance {day.precipProb ?? 0}%
          </p>
        </div>
      )}
    </li>
  );
}

/**
 * Returns the minutely series, but if the radar shows precipitation overhead
 * and the model says zero, lift the series to a light baseline so the chart
 * never under-reports rain that's actually falling. We never go the other way:
 * if the model predicts rain, we trust it.
 */
function syncedMinutely(
  base: MinutelyPoint[],
  radar: { intensity: number; hasRain: boolean },
): MinutelyPoint[] {
  if (!radar.hasRain || base.length === 0) return base;
  const modelTotal = base.reduce((s, m) => s + m.precip, 0);
  if (modelTotal > 0.01) return base;
  const baseline = Math.max(0.005, Math.min(0.05, radar.intensity * 0.04));
  return base.map((m, i) => ({
    ...m,
    precip: Math.max(m.precip, baseline * (1 - Math.min(1, i / 60) * 0.5)),
    precipProb: Math.max(m.precipProb, 70),
  }));
}
