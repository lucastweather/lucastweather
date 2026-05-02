import { Clock } from "lucide-react";
import WeatherIcon from "@/components/WeatherIcon";
import { weatherLabel, type CurrentWeather, type HourlyPoint } from "@/lib/weather";
import { parseLocalDateTime, cityNow } from "@/lib/date";

export default function HourlyForecast({
  hourly,
  loading,
  utcOffsetSeconds = 0,
  current,
}: {
  hourly: HourlyPoint[];
  loading: boolean;
  utcOffsetSeconds?: number;
  current?: CurrentWeather;
}) {
  const now = cityNow(utcOffsetSeconds).getTime();
  const upcoming = hourly
    .filter((h) => parseLocalDateTime(h.time).date.getTime() >= now - 30 * 60_000)
    .slice(0, 24);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="icon-tile">
            <Clock className="size-4" />
          </span>
          Hourly Forecast
          <span className="chip px-2 py-0.5 text-[10px] text-success border-success/40">
            Free · Next 24h
          </span>
        </h2>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-2 min-w-max pb-2">
          {upcoming.map((h, i) => {
            const visual =
              i === 0 && current
                ? {
                    weatherCode: current.weatherCode,
                    cloudCover: current.cloudCover,
                    isDay: current.isDay,
                  }
                : h;
            const { hour: hr } = parseLocalDateTime(h.time);
            const label =
              i === 0 ? "Now" : `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}${hr < 12 ? "a" : "p"}`;
            const showPrecip = h.precipProb > 40;
            const gust = Math.round(h.windGust ?? h.windSpeed);
            const isNow = i === 0;
            return (
              <div
                key={h.time}
                className={`chip chip-hover flex flex-col items-center gap-1 px-3 py-3 min-w-[68px] cursor-default ${
                  isNow ? "border-primary/50 bg-primary/10" : ""
                }`}
                title={`${weatherLabel(visual.weatherCode, visual.cloudCover, visual.isDay)} · ${Math.round(h.temp)}°F${showPrecip ? ` · ${h.precipProb}% precip` : ""} · ${Math.round(h.windSpeed)} mph wind · ${gust} mph gusts`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider ${
                    isNow ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
                <WeatherIcon
                  code={visual.weatherCode}
                  isDay={visual.isDay}
                  cloudCover={visual.cloudCover}
                  className="size-7"
                />
                <div className="text-sm font-semibold">{Math.round(h.temp)}°</div>
                <div className="text-[10px] font-mono text-info min-h-[14px]">
                  {showPrecip ? `${h.precipProb}%` : ""}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/80">G {gust}</div>
              </div>
            );
          })}
          {loading && <div className="text-sm text-muted-foreground py-4">Loading hourly…</div>}
        </div>
      </div>
    </section>
  );
}
