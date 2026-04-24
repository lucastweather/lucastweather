import { Clock } from "lucide-react";
import WeatherIcon from "@/components/WeatherIcon";
import { weatherLabel, type HourlyPoint } from "@/lib/weather";
import { parseLocalDateTime, cityNow } from "@/lib/date";

export default function HourlyForecast({
  hourly,
  loading,
  utcOffsetSeconds = 0,
}: {
  hourly: HourlyPoint[];
  loading: boolean;
  utcOffsetSeconds?: number;
}) {
  const now = cityNow(utcOffsetSeconds).getTime();
  const upcoming = hourly
    .filter((h) => parseLocalDateTime(h.time).date.getTime() >= now - 30 * 60_000)
    .slice(0, 24);

  return (
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
          {upcoming.map((h, i) => {
            const { hour: hr } = parseLocalDateTime(h.time);
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
          {loading && (
            <div className="text-sm text-muted-foreground py-4">Loading hourly…</div>
          )}
        </div>
      </div>
    </section>
  );
}
