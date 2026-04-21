import { Sparkles, Sun, Umbrella, Wind, Snowflake, Trees, Coffee, Bike, Tent, Camera, Waves, BookOpen } from "lucide-react";
import type { CurrentWeather, DailyForecast } from "@/lib/weather";

type Recommendation = {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: "good" | "warn" | "neutral";
};

/**
 * Generate context-aware daily activity recommendations from the current
 * weather + today's forecast. Pure heuristics, no API call. Returns 4-6
 * suggestions ranked by relevance.
 */
function recommend(current: CurrentWeather, today: DailyForecast | undefined): Recommendation[] {
  const out: Recommendation[] = [];
  const t = current.temperature;
  const wind = current.windSpeed;
  const precip = today?.precipProb ?? 0;
  const code = current.weatherCode;
  const isRain = code >= 51 && code <= 67;
  const isSnow = code >= 71 && code <= 77;
  const isStorm = code >= 95;
  const isClear = code <= 1;
  const sunny = isClear && current.isDay;

  if (isStorm) {
    out.push({
      icon: <BookOpen className="size-4" />,
      title: "Stay in & cozy up",
      detail: "Thunderstorms in the area — perfect day for a book or movie marathon.",
      tone: "warn",
    });
    out.push({
      icon: <Coffee className="size-4" />,
      title: "Coffee shop visit",
      detail: "Drive carefully and post up at a local café until it passes.",
      tone: "neutral",
    });
  } else if (isSnow) {
    out.push({
      icon: <Snowflake className="size-4" />,
      title: "Snow day fun",
      detail: "Build a snowman, go sledding, or hit nearby slopes.",
      tone: "good",
    });
    out.push({
      icon: <Coffee className="size-4" />,
      title: "Hot cocoa weather",
      detail: "Warm drinks, fireplace, and a window seat.",
      tone: "neutral",
    });
  } else if (isRain || precip > 60) {
    out.push({
      icon: <Umbrella className="size-4" />,
      title: "Pack an umbrella",
      detail: `${precip}% chance of precipitation — keep rain gear handy.`,
      tone: "warn",
    });
    out.push({
      icon: <BookOpen className="size-4" />,
      title: "Indoor day ideas",
      detail: "Museum, bookstore, or catch up on errands.",
      tone: "neutral",
    });
  } else if (sunny && t >= 70 && t <= 90 && wind < 15) {
    out.push({
      icon: <Sun className="size-4" />,
      title: "Picnic perfect",
      detail: `${Math.round(t)}°F & sunny — pack a lunch and head to the park.`,
      tone: "good",
    });
    out.push({
      icon: <Bike className="size-4" />,
      title: "Bike or hike",
      detail: "Ideal conditions for getting outside and moving.",
      tone: "good",
    });
    out.push({
      icon: <Camera className="size-4" />,
      title: "Golden hour shots",
      detail: "Clear skies = great light for photography around sunset.",
      tone: "good",
    });
  } else if (t > 90) {
    out.push({
      icon: <Waves className="size-4" />,
      title: "Cool off at the water",
      detail: `Hot at ${Math.round(t)}°F — pool, lake, or AC is your friend.`,
      tone: "warn",
    });
    out.push({
      icon: <Droplets className="size-4" />,
      title: "Hydrate constantly",
      detail: "Carry water and avoid strenuous outdoor activity midday.",
      tone: "warn",
    });
  } else if (t < 32) {
    out.push({
      icon: <Snowflake className="size-4" />,
      title: "Bundle up",
      detail: `Freezing at ${Math.round(t)}°F — layers, hat, and gloves.`,
      tone: "warn",
    });
    out.push({
      icon: <Coffee className="size-4" />,
      title: "Warm up indoors",
      detail: "Find a cozy café or curl up with something hot.",
      tone: "neutral",
    });
  } else if (t >= 50 && t < 70) {
    out.push({
      icon: <Trees className="size-4" />,
      title: "Crisp walk weather",
      detail: `Comfortable ${Math.round(t)}°F — great for a long stroll outside.`,
      tone: "good",
    });
    out.push({
      icon: <Tent className="size-4" />,
      title: "Outdoor café",
      detail: "Patio dining or al fresco coffee is calling.",
      tone: "good",
    });
  } else {
    out.push({
      icon: <Trees className="size-4" />,
      title: "Get outside",
      detail: "Mild conditions — make the most of it before they change.",
      tone: "good",
    });
  }

  if (wind >= 20) {
    out.push({
      icon: <Wind className="size-4" />,
      title: "Windy — secure loose items",
      detail: `${Math.round(wind)} mph winds — skip the umbrella, watch for debris.`,
      tone: "warn",
    });
  }

  if (current.uvIndex >= 7 && current.isDay) {
    out.push({
      icon: <Sun className="size-4" />,
      title: "Sunscreen required",
      detail: `UV index ${current.uvIndex.toFixed(0)} — high burn risk, reapply every 2 hours.`,
      tone: "warn",
    });
  }

  return out.slice(0, 6);
}

// Re-export Droplets via lucide for the rare case it's referenced above
import { Droplets } from "lucide-react";

export default function DailyRecommendations({
  current,
  today,
  cityName,
}: {
  current: CurrentWeather;
  today?: DailyForecast;
  cityName: string;
}) {
  const recs = recommend(current, today);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Today in {cityName}
        </h2>
        <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-muted-foreground">
          AI suggestions
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recs.map((r, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 flex gap-3 items-start ${
              r.tone === "good"
                ? "border-success/30 bg-success/5"
                : r.tone === "warn"
                  ? "border-warning/30 bg-warning/5"
                  : "border-border bg-surface-2"
            }`}
          >
            <div
              className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                r.tone === "good"
                  ? "bg-success/15 text-success"
                  : r.tone === "warn"
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {r.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {r.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
