import { Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { moonInfo } from "@/lib/moon";

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLength(sunrise?: string, sunset?: string) {
  if (!sunrise || !sunset) return "—";
  const ms = new Date(sunset).getTime() - new Date(sunrise).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function dayProgress(sunrise?: string, sunset?: string) {
  if (!sunrise || !sunset) return 0;
  const now = Date.now();
  const a = new Date(sunrise).getTime();
  const b = new Date(sunset).getTime();
  if (now <= a) return 0;
  if (now >= b) return 1;
  return (now - a) / (b - a);
}

export default function SunMoonPanel({
  sunrise,
  sunset,
}: {
  sunrise?: string;
  sunset?: string;
}) {
  const moon = moonInfo();
  const progress = dayProgress(sunrise, sunset);
  const isDay = progress > 0 && progress < 1;

  return (
    <section className="panel p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="icon-tile">
          <Sun className="size-4" />
        </span>
        Sun & Moon
      </h2>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Sun arc */}
        <div className="md:col-span-2 chip p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Sunrise className="size-3.5 text-warning" />
              {fmtTime(sunrise)}
            </span>
            <span>Day length · {dayLength(sunrise, sunset)}</span>
            <span className="flex items-center gap-1.5">
              <Sunset className="size-3.5 text-warning" />
              {fmtTime(sunset)}
            </span>
          </div>
          <div className="relative mt-4 h-24">
            <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                <linearGradient id="sun-arc" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 75)" />
                  <stop offset="50%" stopColor="oklch(0.85 0.18 90)" />
                  <stop offset="100%" stopColor="oklch(0.6 0.22 285)" />
                </linearGradient>
              </defs>
              <path
                d="M 10 90 Q 100 -20 190 90"
                fill="none"
                stroke="url(#sun-arc)"
                strokeWidth="2"
                strokeDasharray="3 4"
                opacity="0.6"
              />
              {(() => {
                // Position the sun along the arc
                const t = Math.min(1, Math.max(0, progress));
                const x = 10 + 180 * t;
                const y = 90 - 110 * (1 - Math.pow(2 * t - 1, 2));
                return (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill={isDay ? "oklch(0.85 0.18 85)" : "var(--muted)"}
                      opacity="0.25"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill={isDay ? "oklch(0.85 0.18 85)" : "var(--muted-foreground)"}
                    />
                  </>
                );
              })()}
              <line x1="10" y1="90" x2="190" y2="90" stroke="var(--border)" strokeWidth="1" />
            </svg>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-1">
            {isDay
              ? `${Math.round(progress * 100)}% through the day`
              : progress >= 1
                ? "After sunset"
                : "Before sunrise"}
          </div>
        </div>

        {/* Moon */}
        <div className="chip p-5 flex flex-col items-center justify-center text-center">
          <Moon className="size-4 text-muted-foreground absolute opacity-0" />
          <div className="text-5xl leading-none">{moon.emoji}</div>
          <div className="text-sm font-semibold mt-2">{moon.name}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            {Math.round(moon.illumination * 100)}% illuminated
          </div>
          <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/40 to-primary"
              style={{ width: `${moon.illumination * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
