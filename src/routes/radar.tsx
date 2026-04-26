import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import RadarMap from "@/components/RadarMap";
import { useCity } from "@/lib/city-store";
import { useAuth, useSubscription } from "@/lib/auth-store";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar & Maps — Lucast Weather" },
      {
        name: "description",
        content:
          "Live AI-blended radar with past + 30-min nowcast forecast, lightning, satellite, and precipitation maps powered by RainViewer.",
      },
    ],
  }),
  component: RadarPage,
});

const layers = [
  { id: "radar", label: "Radar", emoji: "📡", premium: false },
  { id: "satellite", label: "Satellite", emoji: "🛰️", premium: false },
  { id: "temp", label: "Temperature", emoji: "🌡️", premium: false },
  { id: "wind", label: "Wind", emoji: "🌬️", premium: false },
  { id: "precip", label: "Precipitation", emoji: "🌧️", premium: false },
  { id: "clouds", label: "Cloud Cover", emoji: "☁️", premium: false },
  { id: "lightning", label: "Lightning", emoji: "⚡", premium: false },
] as const;

function RadarPage() {
  const [city] = useCity();
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const [layer, setLayer] = useState<(typeof layers)[number]["id"]>("radar");
  const layerSource =
    layer === "radar"
      ? "RainViewer radar composite"
      : layer === "precip"
        ? "NOAA MRMS precipitation"
        : layer === "satellite" || layer === "clouds"
          ? "NOAA nowCOAST satellite"
          : layer === "temp"
            ? "NOAA/NWS temperature"
            : layer === "wind"
              ? "NOAA/NWS wind"
              : "NOAA lightning density";

  // If lightning is selected but user lost premium, drop back to radar
  useEffect(() => {
    if (layer === "lightning" && !subscribed) setLayer("radar");
  }, [subscribed, layer]);

  return (
    <PageShell>
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Radar & Nowcast</h1>
            <p className="text-sm text-muted-foreground">
              Live RainViewer composite over OpenStreetMap, centered on {city.name}
              {city.admin1 ? `, ${city.admin1}` : ""}
              {subscribed && (
                <span className="ml-2 chip px-2 py-0.5 text-[10px] text-warning border-warning/30">
                  Premium · 30-min Nowcast
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {layers.map((l) => {
              const locked = l.premium && !subscribed;
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    if (locked) return;
                    setLayer(l.id);
                  }}
                  disabled={locked}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                    layer === l.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : locked
                        ? "chip text-muted-foreground/60 cursor-not-allowed"
                        : "chip text-muted-foreground hover:text-foreground"
                  }`}
                  title={locked ? "Premium feature — upgrade to unlock" : ""}
                >
                  <span>{l.emoji}</span>
                  {l.label}
                  {locked && <Lock className="size-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <RadarMap
          key={`${city.id}`}
          lat={city.latitude}
          lon={city.longitude}
          showForecast={true}
          layer={layer}
        />

        {layer === "lightning" && subscribed && (
          <div className="mt-4 panel p-4 flex items-center gap-3 border-warning/30">
            <Zap className="size-5 text-warning drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-pulse" />
            <div className="text-sm">
              <div className="font-semibold">Lightning Density Layer Active</div>
              <div className="text-muted-foreground text-xs">
                Real-time GLD360 strike telemetry overlaid at 1-minute cadence within
                250 mi of {city.name}.
              </div>
            </div>
          </div>
        )}

        {!subscribed && (
          <div className="mt-4 panel p-4 flex items-center justify-between gap-3 border-warning/30">
            <div className="flex items-center gap-3">
              <Lock className="size-5 text-warning" />
              <div className="text-sm">
                <div className="font-semibold">Unlock the extended outlook</div>
                <div className="text-muted-foreground text-xs">
                  Radar nowcast and live map layers are free. Premium adds the full extended outlook.
                </div>
              </div>
            </div>
            <Link
              to="/premium"
              search={{ status: undefined }}
              className="chip px-3 py-1.5 text-xs text-warning border-warning/40 hover:bg-warning/10"
            >
              {user ? "Upgrade" : "Sign in & upgrade"} →
            </Link>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Layer: <span className="font-mono text-primary">{layer}</span> · Source:{" "}
          <span className="font-mono">{layerSource}</span> · Live map tiles refresh from
          their source service.
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
