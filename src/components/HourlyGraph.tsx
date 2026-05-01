import { useState } from "react";
import WeatherIcon from "@/components/WeatherIcon";
import type { HourlyPoint } from "@/lib/weather";
import { parseLocalDateTime } from "@/lib/date";

const GRAPH_MODES = [
  { key: "temp", label: "Temp", unit: "°F", color: "var(--warning)", value: (h: HourlyPoint) => h.temp, format: (v: number) => `${Math.round(v)}°F` },
  { key: "feels", label: "Feels", unit: "°F", color: "var(--danger)", value: (h: HourlyPoint) => h.apparent, format: (v: number) => `${Math.round(v)}°F` },
  { key: "rain", label: "Rain", unit: "in", color: "var(--primary)", value: (h: HourlyPoint) => h.precip, format: (v: number) => `${v.toFixed(2)}\"` },
  { key: "wind", label: "Wind", unit: "mph", color: "var(--success)", value: (h: HourlyPoint) => h.windSpeed, format: (v: number) => `${Math.round(v)} mph` },
  { key: "gusts", label: "Gusts", unit: "mph", color: "var(--info)", value: (h: HourlyPoint) => h.windGust ?? h.windSpeed, format: (v: number) => `${Math.round(v)} mph` },
  { key: "humidity", label: "Humidity", unit: "%", color: "var(--primary)", value: (h: HourlyPoint) => h.humidity, format: (v: number) => `${Math.round(v)}%` },
  { key: "dew", label: "Dew Pt", unit: "°F", color: "var(--success)", value: (h: HourlyPoint) => h.dewPoint, format: (v: number) => `${Math.round(v)}°F` },
  { key: "pressure", label: "Pressure", unit: "in", color: "var(--muted-foreground)", value: (h: HourlyPoint) => h.pressure, format: (v: number) => `${v.toFixed(2)} in` },
  { key: "uv", label: "UV", unit: "", color: "var(--warning)", value: (h: HourlyPoint) => h.uvIndex, format: (v: number) => `${Math.round(v)}` },
  { key: "clouds", label: "Clouds", unit: "%", color: "var(--foreground)", value: (h: HourlyPoint) => h.cloudCover, format: (v: number) => `${Math.round(v)}%` },
] as const;

type GraphMode = (typeof GRAPH_MODES)[number]["key"];

/**
 * Multi-mode hourly detail graph. Hover reveals the selected value plus the
 * matching weather, rainfall, wind, and gusts for that hour.
 */
export default function HourlyGraph({ hours }: { hours: HourlyPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<GraphMode>("temp");
  const W = 100;
  const H = 100;
  if (hours.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-xs text-muted-foreground">
        Hourly detail unavailable for this day.
      </div>
    );
  }

  const active = GRAPH_MODES.find((m) => m.key === mode) ?? GRAPH_MODES[0];
  const stepX = W / (hours.length - 1);
  const values = hours.map(active.value);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const pad = Math.max(1, (vMax - vMin) * 0.12);
  const min = mode === "rain" || mode === "uv" ? 0 : vMin - pad;
  const max = Math.max(min + 1, vMax + pad);
  const y = (v: number) => 10 + (1 - (v - min) / (max - min)) * 60;
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${y(v)}`)
    .join(" ");
  const areaPath = `${path} L ${(hours.length - 1) * stepX} 75 L 0 75 Z`;
  const maxPrecip = Math.max(0.02, ...hours.map((h) => h.precip));
  const hover = hoverIdx !== null ? hours[hoverIdx] : null;
  const hoverValue = hoverIdx !== null ? values[hoverIdx] : null;
  const hoverParts = hover ? parseLocalDateTime(hover.time) : null;
  const hoverHr = hoverParts?.hour ?? 0;
  const hoverLabel = hoverParts
    ? `${hoverHr === 0 ? 12 : hoverHr > 12 ? hoverHr - 12 : hoverHr}${hoverHr < 12 ? " AM" : " PM"}`
    : "";

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: active.color }} />
          {active.label}{active.unit ? ` (${active.unit})` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Rainfall bars
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GRAPH_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`chip px-2.5 py-1 text-[10px] font-mono transition-colors ${
              mode === m.key ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {m.label}
          </button>
        ))}
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
            <linearGradient id={`modeFill-${mode}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={active.color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rainFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {[20, 40, 60, 80].map((line) => (
            <line
              key={line}
              x1="0"
              x2={W}
              y1={line}
              y2={line}
              stroke="var(--border)"
              strokeWidth="0.35"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={areaPath} fill={`url(#modeFill-${mode})`} />
          <path
            d={path}
            fill="none"
            stroke={active.color}
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hours.map((h, i) => {
            const showRain = h.precipProb > 40 || h.precip > 0;
            if (!showRain) return null;
            const ratio = h.precip / maxPrecip;
            const barH = h.precip > 0 ? Math.max(3, ratio * 22) : (h.precipProb / 100) * 6;
            const barW = stepX * 0.55;
            const x = i * stepX - barW / 2;
            const barY = 95 - barH;
            return (
              <rect
                key={i}
                x={x}
                y={barY}
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
              stroke="var(--muted-foreground)"
              strokeWidth="0.5"
              strokeDasharray="1,1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {values.map((v, i) => (
            <circle
              key={i}
              cx={i * stepX}
              cy={y(v)}
              r={hoverIdx === i ? 1.7 : 0.9}
              fill={active.color}
            />
          ))}
        </svg>

        <style>{`
          @keyframes rainGrow {
            from { transform: scaleY(0); opacity: 0; }
            to { transform: scaleY(1); opacity: 1; }
          }
        `}</style>

        {hover && hoverIdx !== null && hoverValue !== null && (
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
            <div className="font-mono" style={{ color: active.color }}>
              {active.label}: {active.format(hoverValue)}
            </div>
            <div className="font-mono text-muted-foreground">
              Wind {Math.round(hover.windSpeed)} · Gust {Math.round(hover.windGust ?? hover.windSpeed)} mph
            </div>
            {(hover.precipProb > 20 || hover.precip > 0) && (
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
