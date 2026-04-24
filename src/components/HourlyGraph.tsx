import { useState } from "react";
import WeatherIcon from "@/components/WeatherIcon";
import type { HourlyPoint } from "@/lib/weather";
import { parseLocalDateTime } from "@/lib/date";

/**
 * Microsoft-Weather-style temperature curve + animated rainfall bars for a
 * single calendar day. Hover reveals the per-hour conditions using the same
 * visual classification (weatherCode + cloudCover) as the chips above.
 */
export default function HourlyGraph({ hours }: { hours: HourlyPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 100;
  const H = 100;
  if (hours.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-xs text-muted-foreground">
        Hourly detail unavailable for this day.
      </div>
    );
  }
  const stepX = W / (hours.length - 1);
  const temps = hours.map((h) => h.temp);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const tRange = Math.max(1, tMax - tMin);
  const tempY = (t: number) => 10 + (1 - (t - tMin) / tRange) * 55;
  const tempPath = hours
    .map((h, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${tempY(h.temp)}`)
    .join(" ");
  const areaPath = `${tempPath} L ${(hours.length - 1) * stepX} 70 L 0 70 Z`;
  const maxPrecip = Math.max(0.02, ...hours.map((h) => h.precip));
  const hover = hoverIdx !== null ? hours[hoverIdx] : null;
  const hoverParts = hover ? parseLocalDateTime(hover.time) : null;
  const hoverHr = hoverParts?.hour ?? 0;
  const hoverLabel = hoverParts
    ? `${hoverHr === 0 ? 12 : hoverHr > 12 ? hoverHr - 12 : hoverHr}${hoverHr < 12 ? " AM" : " PM"}`
    : "";

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" /> Temperature (°F)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Rainfall
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`-2 0 ${W + 4} ${H}`}
          className="w-full h-48"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * W;
            const idx = Math.round(x / stepX);
            setHoverIdx(Math.max(0, Math.min(hours.length - 1, idx)));
          }}
        >
          <defs>
            <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 75)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="oklch(0.78 0.18 75)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rainFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.7 0.18 240)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="oklch(0.7 0.18 240)" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#tempFill)" />
          <path
            d={tempPath}
            fill="none"
            stroke="oklch(0.78 0.18 75)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hours.map((h, i) => {
            const showRain = h.precipProb > 40;
            if (!showRain) return null;
            const ratio = h.precip / maxPrecip;
            const barH = h.precip > 0 ? Math.max(3, ratio * 22) : (h.precipProb / 100) * 6;
            const barW = stepX * 0.55;
            const x = i * stepX - barW / 2;
            const y = 95 - barH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill="url(#rainFill)"
                rx="0.5"
                style={{
                  transformOrigin: `${i * stepX}px 95px`,
                  animation: `rainGrow 600ms ease-out ${i * 30}ms both`,
                }}
              />
            );
          })}

          {hoverIdx !== null && (
            <line
              x1={hoverIdx * stepX}
              x2={hoverIdx * stepX}
              y1="5"
              y2="95"
              stroke="oklch(0.7 0.02 250)"
              strokeWidth="0.5"
              strokeDasharray="1,1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {hours.map((h, i) => (
            <circle
              key={i}
              cx={i * stepX}
              cy={tempY(h.temp)}
              r={hoverIdx === i ? 1.6 : 0.9}
              fill="oklch(0.78 0.18 75)"
            />
          ))}
        </svg>

        <style>{`
          @keyframes rainGrow {
            from { transform: scaleY(0); opacity: 0; }
            to { transform: scaleY(1); opacity: 1; }
          }
        `}</style>

        {hover && hoverIdx !== null && (
          <div
            className="pointer-events-none absolute top-0 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-xs whitespace-nowrap z-10"
            style={{
              left: `${(hoverIdx / Math.max(1, hours.length - 1)) * 100}%`,
              transform: `translate(-50%, 0)`,
            }}
          >
            <div className="font-semibold flex items-center gap-1.5">
              <WeatherIcon
                code={hover.weatherCode}
                isDay={hover.isDay}
                cloudCover={hover.cloudCover}
                className="size-4"
              />
              {hoverLabel}
            </div>
            <div className="font-mono text-warning">{Math.round(hover.temp)}°F</div>
            {hover.precipProb > 40 && (
              <div className="font-mono text-info">
                💧 {hover.precipProb}% · {hover.precip.toFixed(2)}"
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
        {hours
          .filter((_, i) => i % 4 === 0 || i === hours.length - 1)
          .map((h, i) => {
            const { hour: hr } = parseLocalDateTime(h.time);
            return (
              <span key={i}>
                {hr === 0 ? "12a" : hr > 12 ? `${hr - 12}p` : hr === 12 ? "12p" : `${hr}a`}
              </span>
            );
          })}
      </div>
    </div>
  );
}
