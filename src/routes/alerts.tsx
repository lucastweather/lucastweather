import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Info } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useCity } from "@/lib/city-store";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Severe Weather Alerts — Lucast Weather" },
      { name: "description", content: "Active severe weather alerts and government advisories for your location." },
    ],
    links: [{ rel: "canonical", href: "https://lucastweather.lovable.app/alerts" }],
  }),
  component: AlertsPage,
});

type Alert = {
  id: string;
  event: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor";
  headline: string;
  description: string;
  effective: string;
  expires: string;
  areaDesc: string;
};

function AlertsPage() {
  const [city] = useCity();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // NWS only covers US points
    if (city.country_code !== "US") {
      setAlerts([]);
      setLoading(false);
      return;
    }
    fetch(`https://api.weather.gov/alerts/active?point=${city.latitude},${city.longitude}`, {
      headers: { Accept: "application/geo+json" },
    })
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((j) => {
        if (cancelled) return;
        const list: Alert[] = (j.features ?? []).map((f: any) => ({
          id: f.id,
          event: f.properties.event,
          severity: f.properties.severity,
          headline: f.properties.headline,
          description: f.properties.description,
          effective: f.properties.effective,
          expires: f.properties.expires,
          areaDesc: f.properties.areaDesc,
        }));
        setAlerts(list);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city.id, city.latitude, city.longitude, city.country_code]);

  return (
    <PageShell>
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldAlert className="text-warning" /> Severe Weather Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active advisories for {city.name}
          {city.admin1 ? `, ${city.admin1}` : ""}.
          {city.country_code !== "US" && " International alerts coming soon — currently US (NWS) only."}
        </p>
      </section>

      {loading && <div className="panel p-6 text-sm text-muted-foreground">Checking advisories…</div>}

      {!loading && alerts.length === 0 && (
        <div className="panel p-8 text-center">
          <Info className="size-8 mx-auto text-success mb-2" />
          <div className="font-medium">No active alerts</div>
          <p className="text-sm text-muted-foreground mt-1">
            All clear in your area. We'll notify you instantly if anything changes.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((a) => (
          <article key={a.id} className="panel p-5 border-l-4" style={{ borderLeftColor: severityColor(a.severity) }}>
            <header className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4" style={{ color: severityColor(a.severity) }} />
                <h2 className="font-semibold">{a.event}</h2>
                <span
                  className="text-[10px] uppercase font-mono px-2 py-0.5 rounded"
                  style={{
                    background: `color-mix(in oklab, ${severityColor(a.severity)} 20%, transparent)`,
                    color: severityColor(a.severity),
                  }}
                >
                  {a.severity}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Until {new Date(a.expires).toLocaleString()}
              </div>
            </header>
            <p className="text-sm mt-2">{a.headline}</p>
            <p className="text-xs text-muted-foreground mt-2">{a.areaDesc}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function severityColor(s: Alert["severity"]) {
  switch (s) {
    case "Extreme":
      return "var(--color-danger)";
    case "Severe":
      return "var(--color-warning)";
    case "Moderate":
      return "var(--color-info)";
    default:
      return "var(--color-muted-foreground)";
  }
}
