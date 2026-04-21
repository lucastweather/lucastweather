import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wind, Droplets, Gauge, Compass, Thermometer, Sun, ChevronDown, AlertCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useCity } from "@/lib/city-store";
import {
  fetchWeather,
  fetchEarthquakes,
  weatherIcon,
  weatherLabel,
  type CurrentWeather,
  type DailyForecast,
  type MinutelyPoint,
  type Earthquake,
} from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lucast Weather — Hyperlocal Forecasts, Radar & Alerts" },
      {
        name: "description",
        content:
          "Real-time weather, 7-day forecast, MinuteCast precipitation, and live earthquake tracker for any city worldwide.",
      },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const [city] = useCity();
  const [data, setData] = useState<{
    current: CurrentWeather;
    daily: DailyForecast[];
    minutely: MinutelyPoint[];
  } | null>(null);
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [magFilter, setMagFilter] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
        <div className="font-mono text-xs text-muted-foreground tracking-wider">
          {city.name}
          {city.admin1 ? `, ${city.admin1}` : ""} · {city.country}
        </div>
        <div className="mt-3 flex items-center gap-6 flex-wrap">
          <div className="text-7xl leading-none">
            {data ? weatherIcon(data.current.weatherCode, data.current.isDay) : "⛅"}
          </div>
          <div>
            <div className="text-6xl font-semibold tracking-tight">
              {data ? Math.round(data.current.temperature) : "—"}°F
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {data
                ? `Feels like ${Math.round(data.current.apparent)}°F · ${weatherLabel(
                    data.current.weatherCode,
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
          <Metric icon={<Gauge className="size-4" />} label="Pressure" value={data ? `${data.current.pressure.toFixed(1)} in` : "—"} />
          <Metric icon={<Compass className="size-4" />} label="Wind Dir" value={data ? `${data.current.windDirection}°` : "—"} />
          <Metric icon={<Thermometer className="size-4" />} label="Dew Point" value={data ? `${Math.round(data.current.dewPoint)}°F` : "—"} />
          <Metric icon={<Sun className="size-4" />} label="UV Index" value={data ? `${data.current.uvIndex}` : "—"} />
        </div>
      </section>

      {/* 7-day forecast */}
      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">7-Day Forecast</h2>
        <ul className="divide-y divide-border">
          {(data?.daily ?? []).map((d, i) => (
            <ForecastRow key={d.date} day={d} index={i} />
          ))}
          {!data && <li className="text-sm text-muted-foreground py-2">Loading forecast…</li>}
        </ul>
      </section>

      {/* MinuteCast */}
      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <span>🌧️</span> MinuteCast
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {data && data.minutely.every((m) => m.precip === 0)
            ? "No precipitation expected in the next 2 hours"
            : "Precipitation expected"}
        </p>
        <div className="flex items-end gap-1 h-20">
          {(data?.minutely ?? []).map((m, i) => {
            const h = Math.min(100, m.precip * 200);
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/40"
                style={{ height: `${Math.max(4, h)}%` }}
                title={`${m.precip.toFixed(2)}"`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
          {[0, 15, 30, 45, 60, 75, 90, 105].map((m) => (
            <span key={m}>{m}m</span>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary/40" />Light</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary/70" />Moderate</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary" />Heavy</span>
        </div>
      </section>

      {/* Earthquake tracker */}
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🌍</span> Earthquake Tracker
            <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-success">USGS Live</span>
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
        <ul className="space-y-2">
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
        <span className="text-2xl w-8 text-center">{weatherIcon(day.weatherCode, true)}</span>
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
        <div className="px-12 pb-3 text-xs text-muted-foreground">
          High {Math.round(day.tMax)}°F · Low {Math.round(day.tMin)}°F · Precip{" "}
          {day.precipSum.toFixed(2)}" · Chance {day.precipProb ?? 0}%
        </div>
      )}
    </li>
  );
}
