import { useEffect, useState } from "react";
import { Target, RotateCcw } from "lucide-react";
import { useCity } from "@/lib/city-store";
import { fetchWeather, type DailyForecast } from "@/lib/weather";

const cToF = (c: number) => Math.round((c * 9) / 5 + 32);

export default function ForecastChallenge() {
  const [city] = useCity();
  const [day, setDay] = useState<DailyForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<{ diff: number; points: number } | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResult(null);
    setGuess("");
    fetchWeather(city.latitude, city.longitude, 3, city.timezone)
      .then((w) => {
        if (!cancelled) setDay(w.daily[1] ?? w.daily[0] ?? null);
      })
      .catch(() => !cancelled && setDay(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city.latitude, city.longitude, city.timezone]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!day || result) return;
    const g = Number(guess);
    if (!Number.isFinite(g)) return;
    const actual = cToF(day.tMax);
    const diff = Math.abs(actual - g);
    const points = Math.max(0, 100 - diff * 10);
    setResult({ diff, points });
    setTotal((t) => t + points);
  }

  const actualF = day ? cToF(day.tMax) : null;

  return (
    <div className="panel p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-sky-400" />
          <h2 className="text-lg font-semibold">Forecast Challenge</h2>
        </div>
        <div className="text-xs text-muted-foreground">Total {total} pts</div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Predict tomorrow&apos;s high in{" "}
        <span className="text-foreground font-medium">{city.name}</span>, then see how close you got
        to the Lucast ensemble forecast.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading forecast…</div>
      ) : !day ? (
        <div className="text-sm text-muted-foreground">Forecast unavailable right now.</div>
      ) : (
        <>
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={!!result}
              placeholder="°F"
              className="w-32 rounded-xl bg-background/60 border border-border/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={!!result || guess === ""}
              className="px-3 py-2 rounded-xl text-sm bg-primary/15 border border-primary/40 text-primary disabled:opacity-40 transition-colors"
            >
              Lock it in
            </button>
          </form>

          {result && (
            <div className="mt-4 rounded-2xl border border-border/70 p-4">
              <div className="text-sm text-muted-foreground">Forecast high</div>
              <div className="text-3xl font-light tabular-nums">{actualF}°F</div>
              <div className="mt-2 text-sm">
                You were off by{" "}
                <span className="text-foreground font-medium">{result.diff}°</span> —{" "}
                <span className={result.points > 60 ? "text-success" : "text-warning"}>
                  {result.points} pts
                </span>
                {result.diff === 0 && " · perfect call!"}
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setResult(null);
                  setGuess("");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-border/70 hover:bg-accent/60 transition-colors"
              >
                <RotateCcw className="size-4" /> Try another guess
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
