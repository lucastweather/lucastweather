import { useCallback, useEffect, useState } from "react";
import { Flame, RotateCcw, Trophy } from "lucide-react";
import { fetchWeather } from "@/lib/weather";

type City = { name: string; country: string; lat: number; lon: number };

const CITIES: City[] = [
  { name: "New York", country: "US", lat: 40.7128, lon: -74.006 },
  { name: "Los Angeles", country: "US", lat: 34.0522, lon: -118.2437 },
  { name: "Chicago", country: "US", lat: 41.8781, lon: -87.6298 },
  { name: "Miami", country: "US", lat: 25.7617, lon: -80.1918 },
  { name: "Denver", country: "US", lat: 39.7392, lon: -104.9903 },
  { name: "Seattle", country: "US", lat: 47.6062, lon: -122.3321 },
  { name: "Phoenix", country: "US", lat: 33.4484, lon: -112.074 },
  { name: "London", country: "UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris", country: "FR", lat: 48.8566, lon: 2.3522 },
  { name: "Reykjavík", country: "IS", lat: 64.1466, lon: -21.9426 },
  { name: "Cairo", country: "EG", lat: 30.0444, lon: 31.2357 },
  { name: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", country: "AU", lat: -33.8688, lon: 151.2093 },
  { name: "Nairobi", country: "KE", lat: -1.2921, lon: 36.8219 },
  { name: "Moscow", country: "RU", lat: 55.7558, lon: 37.6173 },
  { name: "Singapore", country: "SG", lat: 1.3521, lon: 103.8198 },
  { name: "Buenos Aires", country: "AR", lat: -34.6037, lon: -58.3816 },
  { name: "Anchorage", country: "US", lat: 61.2181, lon: -149.9003 },
];

function pickPair(): [City, City] {
  const a = Math.floor(Math.random() * CITIES.length);
  let b = Math.floor(Math.random() * CITIES.length);
  while (b === a) b = Math.floor(Math.random() * CITIES.length);
  return [CITIES[a], CITIES[b]];
}

const cToF = (c: number) => Math.round((c * 9) / 5 + 32);

export default function TempDuel() {
  const [pair, setPair] = useState<[City, City] | null>(null);
  const [temps, setTemps] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const nextRound = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    setTemps(null);
    const p = pickPair();
    setPair(p);
    try {
      const [a, b] = await Promise.all([
        fetchWeather(p[0].lat, p[0].lon, 1),
        fetchWeather(p[1].lat, p[1].lon, 1),
      ]);
      setTemps([a.current.temperature, b.current.temperature]);
    } catch {
      setTemps(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void nextRound();
  }, [nextRound]);

  function choose(i: 0 | 1) {
    if (picked !== null || !temps) return;
    setPicked(i);
    const correct = temps[i] >= temps[i === 0 ? 1 : 0];
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const n = s + 1;
        setBest((b) => Math.max(b, n));
        return n;
      });
    } else {
      setStreak(0);
    }
  }

  const correctIdx = temps ? (temps[0] >= temps[1] ? 0 : 1) : null;

  return (
    <div className="panel p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-orange-400" />
          <h2 className="text-lg font-semibold">Temp Duel</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Score {score}</span>
          <span className="flex items-center gap-1">
            <Trophy className="size-3.5 text-warning" /> Best streak {best}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Which city is warmer <span className="text-foreground">right now</span>? Live temperatures
        from the Lucast ensemble.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {pair?.map((c, i) => {
          const revealed = picked !== null && temps;
          const isCorrect = revealed && correctIdx === i;
          return (
            <button
              key={`${c.name}-${i}`}
              onClick={() => choose(i as 0 | 1)}
              disabled={loading || picked !== null}
              className={`rounded-2xl border p-4 text-left transition-all disabled:cursor-default ${
                revealed
                  ? isCorrect
                    ? "border-success/60 bg-success/10"
                    : "border-destructive/50 bg-destructive/10"
                  : "border-border/70 hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <div className="text-base font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.country}</div>
              <div className="mt-3 text-2xl font-light tabular-nums">
                {revealed && temps ? `${cToF(temps[i])}°F` : loading ? "…" : "?"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          {picked !== null &&
            (correctIdx === picked ? (
              <span className="text-success">Correct! Streak {streak}</span>
            ) : (
              <span className="text-destructive">Nope — streak reset.</span>
            ))}
        </div>
        <button
          onClick={() => void nextRound()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-border/70 hover:bg-accent/60 transition-colors"
        >
          <RotateCcw className="size-4" /> {picked === null ? "Skip" : "Next round"}
        </button>
      </div>
    </div>
  );
}
