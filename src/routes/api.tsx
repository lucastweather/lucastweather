import { createFileRoute } from "@tanstack/react-router";
import { Code2, Zap, Lock } from "lucide-react";
import PageShell from "@/components/PageShell";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "API — Lucast Weather" },
      { name: "description", content: "Developer API for hyperlocal weather, radar, and alerts." },
    ],
  }),
  component: ApiPage,
});

function ApiPage() {
  return (
    <PageShell>
      <section className="panel p-8">
        <h1 className="text-3xl font-semibold flex items-center gap-3">
          <Code2 className="text-primary" /> Lucast Weather API
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          A clean, low-latency REST API for current conditions, 7-day forecasts, MinuteCast
          precipitation, severe alerts, and historical data — all in one endpoint.
        </p>
        <div className="flex gap-3 mt-5 flex-wrap">
          <span className="chip px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Zap className="size-3.5 text-warning" /> p99 &lt; 80ms global edge
          </span>
          <span className="chip px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Lock className="size-3.5 text-success" /> SLA-backed 99.99% uptime
          </span>
        </div>
      </section>

      {[
        {
          method: "GET",
          path: "/v1/current?lat={lat}&lon={lon}",
          desc: "Current conditions: temperature, humidity, wind, pressure, UV, dew point.",
        },
        {
          method: "GET",
          path: "/v1/forecast/daily?lat={lat}&lon={lon}&days=7",
          desc: "Up to 16-day daily forecast with high/low, precip totals, and probabilities.",
        },
        {
          method: "GET",
          path: "/v1/minutecast?lat={lat}&lon={lon}",
          desc: "120-minute precipitation forecast at 1-minute resolution.",
        },
        {
          method: "GET",
          path: "/v1/alerts?lat={lat}&lon={lon}",
          desc: "Active severe weather advisories from official government sources.",
        },
        {
          method: "GET",
          path: "/v1/geocode?q={query}",
          desc: "Worldwide city lookup with timezone and admin region.",
        },
      ].map((e) => (
        <article key={e.path} className="panel p-5">
          <header className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-1 rounded bg-success/15 text-success">{e.method}</span>
            <code className="font-mono text-sm">{e.path}</code>
          </header>
          <p className="text-sm text-muted-foreground mt-2">{e.desc}</p>
        </article>
      ))}

      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-3">Example request</h2>
        <pre className="bg-surface-2 rounded-lg p-4 text-xs font-mono overflow-x-auto border border-border">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://api.lucast.weather/v1/current?lat=40.71&lon=-74.01"`}
        </pre>
      </section>
    </PageShell>
  );
}
