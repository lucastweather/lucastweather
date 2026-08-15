import { useCallback, useEffect, useState } from "react";
import { Brain, RotateCcw } from "lucide-react";
import WeatherIcon from "@/components/WeatherIcon";
import { weatherLabel } from "@/lib/weather";

const CODES = [0, 1, 2, 3, 45, 51, 61, 63, 65, 71, 73, 80, 82, 95, 96];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound() {
  const answer = CODES[Math.floor(Math.random() * CODES.length)];
  const labels = new Set<string>([weatherLabel(answer)]);
  for (const c of shuffle(CODES)) {
    if (labels.size >= 4) break;
    labels.add(weatherLabel(c));
  }
  return { answer, options: shuffle([...labels]) };
}

export default function CloudDecoder() {
  const [round, setRound] = useState(() => buildRound());
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);

  const next = useCallback(() => {
    setRound(buildRound());
    setPicked(null);
  }, []);

  useEffect(() => {
    setRound(buildRound());
  }, []);

  const correct = weatherLabel(round.answer);

  function choose(label: string) {
    if (picked) return;
    setPicked(label);
    setAsked((a) => a + 1);
    if (label === correct) setScore((s) => s + 1);
  }

  return (
    <div className="panel p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Sky Decoder</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {score}/{asked} correct
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Name the condition behind the icon. Same iconography Lucast uses across the forecast.
      </p>

      <div className="flex items-center justify-center py-6">
        <WeatherIcon code={round.answer} className="size-20" />
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {round.options.map((label) => {
          const state =
            picked === null
              ? "idle"
              : label === correct
                ? "right"
                : label === picked
                  ? "wrong"
                  : "idle";
          return (
            <button
              key={label}
              onClick={() => choose(label)}
              disabled={picked !== null}
              className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-all disabled:cursor-default ${
                state === "right"
                  ? "border-success/60 bg-success/10 text-success"
                  : state === "wrong"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border/70 hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={next}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-border/70 hover:bg-accent/60 transition-colors"
        >
          <RotateCcw className="size-4" /> Next icon
        </button>
      </div>
    </div>
  );
}
