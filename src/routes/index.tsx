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
import { parseCalendarDate, localDateKey } from "@/lib/date";
import { useSubscription } from "@/lib/auth-store";
import {
  fetchWeather,
  fetchEarthquakes,
  weatherLabel,
  forecastNarrative,
  isRainWeatherCode,
  syncCurrentWeather,
  type CurrentWeather,
  type DailyForecast,
  type HourlyPoint,
  type MinutelyPoint,
  type Earthquake,
} from "@/lib/weather";
import RadarMap from "@/components/RadarMap";
import EarthquakeMap from "@/components/EarthquakeMap";
import HourlyForecast from "@/components/HourlyForecast";
import HourlyGraph from "@/components/HourlyGraph";
import HurricaneTracker from "@/components/HurricaneTracker";
import WeatherNews from "@/components/WeatherNews";


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
    utcOffsetSeconds: number;
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
  // Satellite-derived cloud cover (0-100). When available, overrides the
  // model cloudCover for current-conditions iconography so the icon matches
  // what's actually overhead right now.
  const [satClouds, setSatClouds] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchWeather(city.latitude, city.longitude, subscribed ? 16 : 7)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city.id, city.latitude, city.longitude, subscribed]);

  useEffect(() => {
    fetchEarthquakes().then(setQuakes);
  }, []);

  const filteredQuakes = quakes.filter((q) => q.mag >= magFilter).slice(0, 10);
  const currentWeather = data
    ? syncCurrentWeather(data.current, radarRain, satClouds)
    : null;

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
                code={currentWeather!.weatherCode}
                isDay={currentWeather!.isDay}
                cloudCover={currentWeather!.cloudCover}
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
                ? `Feels like ${Math.round(currentWeather!.apparent)}°F · ${weatherLabel(
                    currentWeather!.weatherCode,
                    currentWeather!.cloudCover,
                    currentWeather!.isDay,
                  )}${radarRain.hasRain ? " · Radar-synced" : satClouds !== null ? " · Sat-synced" : ""}`
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
      <HourlyForecast
        hourly={data?.hourly ?? []}
        loading={!data}
        utcOffsetSeconds={data?.utcOffsetSeconds ?? 0}
          current={currentWeather ?? undefined}
      />

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
            <ForecastRow key={d.date} day={d} index={i} hourly={data?.hourly ?? []} />
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
          onSatelliteClouds={(pct) => setSatClouds(pct)}
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
            const next = syncedMinutely(data.minutely, radarRain, currentWeather ?? undefined);
            if (next.length === 0)
              return "Minute-by-minute data unavailable for this region.";
            const total = next.reduce((s, m) => s + m.precip, 0);
            if (total < 0.001 && !radarRain.hasRain && !isRainWeatherCode(currentWeather?.weatherCode ?? -1))
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
        <MinuteCastChart minutely={syncedMinutely(data?.minutely ?? [], radarRain, currentWeather ?? undefined)} />
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

      {/* National Hurricane Center tropical outlook + active storms */}
      <HurricaneTracker />

      {/* Weather news headlines from NOAA + NWS */}
      <WeatherNews />

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

function getDailyVisualSummary(day: DailyForecast, hourly: HourlyPoint[]) {
  const sameDay = hourly.filter((hour) => localDateKey(hour.time) === day.date);
  const daytime = sameDay.filter((hour) => hour.isDay);
  const sample = daytime.length > 0 ? daytime : sameDay;
  const daytimeRainHours = daytime.filter(
    (hour) => isRainWeatherCode(hour.weatherCode) || (hour.precipProb ?? 0) > 40 || (hour.precip ?? 0) > 0,
  );
  const dayHasRain = daytimeRainHours.length > 0;
  if (sample.length === 0) {
    const fallbackCloud = day.weatherCode === 1 ? 30 : day.weatherCode === 2 ? 70 : 100;
    return {
      code: day.weatherCode,
      cloudCover: fallbackCloud,
      label: weatherLabel(day.weatherCode, fallbackCloud, true),
      dayHasRain: isRainWeatherCode(day.weatherCode) || (day.precipProb ?? 0) > 40 || day.precipSum > 0,
    };
  }

  const avgCloud = Math.round(
    sample.reduce((sum, hour) => sum + (hour.cloudCover ?? 0), 0) / sample.length,
  );
  const thunderHours = sample.filter((hour) => [95, 96, 99].includes(hour.weatherCode));
  const snowHours = sample.filter((hour) => [71, 73, 75, 77, 85, 86].includes(hour.weatherCode));
  const rainHours = sample.filter((hour) => isRainWeatherCode(hour.weatherCode));

  if (thunderHours.length >= Math.ceil(sample.length * 0.35)) {
    return { code: 95, cloudCover: 100, label: weatherLabel(95, 100, true), dayHasRain: true };
  }

  if (snowHours.length >= Math.ceil(sample.length * 0.35)) {
    return { code: 73, cloudCover: 100, label: weatherLabel(73, 100, true), dayHasRain };
  }

  if (dayHasRain || rainHours.length >= Math.ceil(sample.length * 0.45)) {
    const heavyRain = daytimeRainHours.some((hour) => [65, 67, 82, 95, 96, 99].includes(hour.weatherCode));
    const code = heavyRain ? 65 : 63;
    return { code, cloudCover: 100, label: weatherLabel(code, 100, true), dayHasRain: true };
  }

  const sunnyHours = sample.filter(
    (hour) =>
      hour.weatherCode === 0 ||
      hour.weatherCode === 1 ||
      (hour.weatherCode === 2 && hour.cloudCover <= 40),
  ).length;
  const mostlySunnyHours = sample.filter(
    (hour) =>
      hour.weatherCode === 1 ||
      (hour.weatherCode === 2 && hour.cloudCover > 40 && hour.cloudCover <= 60),
  ).length;
  const partlyHours = sample.filter(
    (hour) => hour.weatherCode === 2 && hour.cloudCover > 40 && hour.cloudCover <= 70,
  ).length;
  const cloudyHours = sample.filter(
    (hour) => hour.weatherCode === 3 || (hour.weatherCode === 2 && hour.cloudCover > 70),
  ).length;

  const sunnyShare = sunnyHours / sample.length;
  const mostlySunnyShare = mostlySunnyHours / sample.length;
  const partlyShare = partlyHours / sample.length;
  const cloudyShare = cloudyHours / sample.length;

  if (sunnyShare >= 0.55 && avgCloud <= 35) {
    return { code: 0, cloudCover: Math.min(avgCloud, 20), label: weatherLabel(0, avgCloud, true), dayHasRain };
  }

  if (sunnyShare >= 0.5 || (sunnyShare + mostlySunnyShare >= 0.65 && avgCloud <= 50)) {
    return { code: 1, cloudCover: Math.min(Math.max(avgCloud, 25), 45), label: weatherLabel(1, avgCloud, true), dayHasRain };
  }

  if (partlyShare >= 0.35 || (sunnyShare + partlyShare >= 0.5 && avgCloud <= 65)) {
    return { code: 2, cloudCover: 50, label: weatherLabel(2, 50, true), dayHasRain };
  }

  if (cloudyShare >= 0.35 || avgCloud > 65) {
    return { code: 2, cloudCover: 80, label: weatherLabel(2, 80, true), dayHasRain };
  }

  const fallbackCloud = avgCloud > 65 ? 80 : avgCloud > 40 ? 50 : 30;
  const fallbackCode = avgCloud <= 25 ? 0 : avgCloud <= 45 ? 1 : 2;
  return {
    code: fallbackCode,
    cloudCover: fallbackCloud,
    label: weatherLabel(fallbackCode, fallbackCloud, true),
    dayHasRain,
  };
}

function ForecastRow({
  day,
  index,
  hourly,
}: {
  day: DailyForecast;
  index: number;
  hourly: HourlyPoint[];
}) {
  const [open, setOpen] = useState(false);
  const date = parseCalendarDate(day.date);
  const visual = getDailyVisualSummary(day, hourly);
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
          <WeatherIcon
            code={visual.code}
            isDay
            cloudCover={visual.cloudCover}
            className="size-7"
          />
        </span>
        <span>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground font-mono">{md}</div>
        </span>
        <span className="hidden sm:block text-sm text-muted-foreground">
          {visual.label}
        </span>
        <span className="text-xs text-info flex items-center gap-2 min-w-[64px] justify-end">
          {(day.precipProb ?? 0) > 40 || visual.dayHasRain ? (
            <>
              {day.precipSum > 0 && (
                <span className="font-mono">💧 {day.precipSum.toFixed(2)}"</span>
              )}
              <span className="font-mono">{(day.precipProb ?? 0) > 40 ? `${day.precipProb}%` : "Rain"}</span>
            </>
          ) : (
            <span className="font-mono text-muted-foreground/40">—</span>
          )}
        </span>
        <span className="font-mono text-sm flex items-center gap-2">
          <span className="font-semibold">{Math.round(day.tMax)}°</span>
          <span className="text-muted-foreground">{Math.round(day.tMin)}°</span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-12 pb-4 text-xs text-muted-foreground space-y-3">
          <p className="text-foreground/80 text-sm">
            {forecastNarrative(day, { code: visual.code, cloudCover: visual.cloudCover })}
          </p>
          <p>
            High {Math.round(day.tMax)}°F · Low {Math.round(day.tMin)}°F · Precip{" "}
            {day.precipSum.toFixed(2)}" · Chance {day.precipProb ?? 0}%
          </p>
          <HourlyGraph hours={hourly.filter((h) => localDateKey(h.time) === day.date)} />
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
  current?: CurrentWeather,
): MinutelyPoint[] {
  const currentHasRain = current ? isRainWeatherCode(current.weatherCode) : false;
  if ((!radar.hasRain && !currentHasRain) || base.length === 0) return base;
  const modelTotal = base.reduce((s, m) => s + m.precip, 0);
  if (modelTotal > 0.01) return base;
  const baseline = Math.max(0.005, Math.min(0.05, (radar.intensity || 0.15) * 0.04));
  return base.map((m, i) => ({
    ...m,
    precip: Math.max(m.precip, baseline * (1 - Math.min(1, i / 60) * 0.5)),
    precipProb: Math.max(m.precipProb, 70),
  }));
}
