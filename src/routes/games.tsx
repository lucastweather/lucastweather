import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import TempDuel from "@/components/games/TempDuel";
import CloudDecoder from "@/components/games/CloudDecoder";
import ForecastChallenge from "@/components/games/ForecastChallenge";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Weather Games — Lucast" },
      {
        name: "description",
        content:
          "Play Lucast weather games: guess which city is warmer right now, decode weather icons, and predict tomorrow's high against our AI forecast ensemble.",
      },
      { property: "og:title", content: "Weather Games — Lucast" },
      {
        property: "og:description",
        content:
          "Temp Duel, Sky Decoder, and the Forecast Challenge — live-data weather games from Lucast Weather.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://lucastweather.lovable.app/games" }],
  }),
  component: GamesPage,
});

function GamesPage() {
  return (
    <PageShell>
      <section className="panel p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Gamepad2 className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-gradient">Weather Games</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Three quick games powered by live Lucast data. Test your weather instincts, build a
          streak, and see if you can out-forecast the ensemble.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <TempDuel />
        <CloudDecoder />
      </div>
      <ForecastChallenge />
    </PageShell>
  );
}
