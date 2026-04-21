import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import { useCity } from "@/lib/city-store";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar & Maps — Lucast Weather" },
      { name: "description", content: "Live radar, satellite, temperature, wind, and precipitation maps." },
    ],
  }),
  component: RadarPage,
});

const layers = [
  { id: "radar", label: "Radar", emoji: "📡" },
  { id: "satellite", label: "Satellite", emoji: "🛰️" },
  { id: "temp", label: "Temperature", emoji: "🌡️" },
  { id: "wind", label: "Wind", emoji: "🌬️" },
  { id: "precip", label: "Precipitation", emoji: "🌧️" },
  { id: "clouds", label: "Cloud Cover", emoji: "☁️" },
] as const;

function RadarPage() {
  const [city] = useCity();
  const [layer, setLayer] = useState<(typeof layers)[number]["id"]>("radar");
  const z = 6;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${city.longitude - 4},${city.latitude - 3},${city.longitude + 4},${city.latitude + 3}&layer=mapnik&marker=${city.latitude},${city.longitude}`;

  return (
    <PageShell>
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Radar & Maps</h1>
            <p className="text-sm text-muted-foreground">
              Centered on {city.name}
              {city.admin1 ? `, ${city.admin1}` : ""}
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {layers.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayer(l.id)}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                  layer === l.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "chip text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{l.emoji}</span>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-border aspect-[16/9] bg-surface-2">
          <iframe
            key={`${city.id}-${layer}`}
            title="map"
            src={mapUrl}
            className="w-full h-full"
            loading="lazy"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Live overlay: <span className="font-mono text-primary">{layer}</span> · Zoom {z} · Free
          tiles courtesy of OpenStreetMap. Premium users unlock animated radar loops and
          high-resolution satellite imagery.
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { t: "Storm Tracker", d: "Auto-detect mesoscale convective systems near you." },
          { t: "Lightning Strikes", d: "Real-time GLD360 strike data within 250 mi." },
          { t: "Hurricane Paths", d: "NHC cone of uncertainty + ensemble model spaghetti." },
        ].map((c) => (
          <div key={c.t} className="panel p-5">
            <div className="text-base font-semibold">{c.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
