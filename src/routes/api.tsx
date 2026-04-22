import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Code2,
  Zap,
  Lock,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { useAuth, useSubscription } from "@/lib/auth-store";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "API — Lucast Weather" },
      {
        name: "description",
        content:
          "Developer API for hyperlocal weather. Generate a key, get 20 free calls/month, upgrade for higher limits.",
      },
    ],
  }),
  component: ApiPage,
});

type KeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  monthly_limit: number;
  monthly_usage: number;
  period_start?: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

function ApiPage() {
  const { user, ready } = useAuth();
  const { subscribed } = useSubscription();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [label, setLabel] = useState("My App");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const { keys } = await listApiKeys();
      setKeys(keys as KeyRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreate() {
    setErr(null);
    setBusy(true);
    setFreshKey(null);
    try {
      const { rawKey } = await createApiKey({ data: { label } });
      setFreshKey(rawKey);
      setLabel("My App");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create key.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? Apps using it will stop working immediately.")) return;
    setErr(null);
    try {
      await revokeApiKey({ data: { id } });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to revoke key.");
    }
  }

  async function copyFresh() {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <PageShell>
      <section className="panel p-8">
        <h1 className="text-3xl font-semibold flex items-center gap-3">
          <Code2 className="text-primary" /> Lucast Weather API
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          A clean, low-latency REST API for current conditions, forecasts, MinuteCast
          precipitation, and severe alerts. Generate a key below — free plan includes{" "}
          <span className="font-semibold text-foreground">20 calls per month</span>.
        </p>
        <div className="flex gap-3 mt-5 flex-wrap">
          <span className="chip px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Zap className="size-3.5 text-warning" /> p99 &lt; 80ms global edge
          </span>
          <span className="chip px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Lock className="size-3.5 text-success" /> SLA-backed 99.99% uptime
          </span>
          <span className="chip px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Key className="size-3.5 text-primary" /> Real keys, real quotas
          </span>
        </div>
      </section>

      {/* API Keys */}
      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="size-5 text-primary" /> Your API Keys
          </h2>
          <span className="chip px-2 py-0.5 text-[10px] font-mono">
            Free plan · 20 calls / month / key
          </span>
        </div>

        {!ready ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !user ? (
          <div className="panel p-5 flex items-center justify-between gap-3 border-warning/30">
            <div className="flex items-center gap-3">
              <Lock className="size-5 text-warning" />
              <div className="text-sm">
                <div className="font-semibold">Sign in to generate API keys</div>
                <div className="text-muted-foreground text-xs">
                  Each account can create up to 3 active keys on the free plan.
                </div>
              </div>
            </div>
            <Link
              to="/admin"
              search={{ redirect: "/api" }}
              className="chip px-3 py-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
            >
              Sign in →
            </Link>
          </div>
        ) : (
          <>
            {err && (
              <div className="panel p-3 mb-3 flex items-center gap-2 text-danger text-sm border-danger/30">
                <AlertCircle className="size-4" /> {err}
              </div>
            )}

            {freshKey && (
              <div className="panel p-4 mb-4 border-success/40 bg-success/5">
                <div className="flex items-center gap-2 text-success text-sm font-semibold">
                  <Check className="size-4" /> Key created — copy it now
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the only time the full key will be shown. Store it somewhere safe.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-background border border-border rounded-md px-3 py-2 break-all">
                    {freshKey}
                  </code>
                  <button
                    onClick={copyFresh}
                    className="chip px-3 py-2 text-xs flex items-center gap-1.5 hover:bg-accent shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-success" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 flex-wrap mb-4">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground font-mono block mb-1">
                  Key label
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={64}
                  placeholder="My App"
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={busy || activeKeys.length >= 3 || !label.trim()}
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Generate Key
              </button>
            </div>
            {activeKeys.length >= 3 && (
              <p className="text-xs text-warning mb-3">
                Maximum 3 active keys. Revoke one to create another.
              </p>
            )}

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading keys…</div>
            ) : activeKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                No keys yet. Generate your first one above.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeKeys.map((k) => {
                  const remaining = Math.max(0, k.monthly_limit - k.monthly_usage);
                  const pct = (k.monthly_usage / k.monthly_limit) * 100;
                  const exhausted = remaining === 0;
                  return (
                    <li key={k.id} className="panel p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{k.label}</span>
                            <code className="font-mono text-[11px] text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">
                              {k.key_prefix}…
                            </code>
                            {exhausted && (
                              <span className="chip px-1.5 py-0.5 text-[10px] text-danger border-danger/40">
                                Quota exhausted
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-1">
                            Created {new Date(k.created_at).toLocaleDateString()} ·{" "}
                            {k.last_used_at
                              ? `Last used ${new Date(k.last_used_at).toLocaleString()}`
                              : "Never used"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="chip px-2 py-1.5 text-xs text-danger hover:bg-danger/10 border-danger/30 flex items-center gap-1"
                          aria-label="Revoke key"
                        >
                          <Trash2 className="size-3.5" /> Revoke
                        </button>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-muted-foreground">
                            {k.monthly_usage} / {k.monthly_limit} calls used this month
                          </span>
                          <span className={exhausted ? "text-danger" : "text-success"}>
                            {remaining} remaining
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              pct >= 100 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!subscribed && (
              <Link
                to="/premium"
                search={{ status: undefined }}
                className="mt-4 panel p-4 flex items-center justify-between gap-3 border-warning/30 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-warning" />
                  <div className="text-sm">
                    <div className="font-semibold">Need more than 20 calls?</div>
                    <div className="text-muted-foreground text-xs">
                      Pro+ unlocks 10,000 calls/month. Enterprise is unlimited.
                    </div>
                  </div>
                </div>
                <span className="chip px-3 py-1.5 text-xs text-warning border-warning/40">
                  Upgrade →
                </span>
              </Link>
            )}
          </>
        )}
      </section>

      {/* Endpoints */}
      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">Endpoints</h2>
        <div className="space-y-3">
          {[
            {
              method: "GET",
              path: "/api/public/v1/current?lat={lat}&lon={lon}",
              desc: "Current conditions: temperature, humidity, wind, pressure, UV, dew point.",
              live: true,
            },
            {
              method: "GET",
              path: "/api/public/v1/forecast/daily?lat={lat}&lon={lon}&days=7",
              desc: "Up to 16-day daily forecast with high/low, precip totals, and probabilities.",
              live: false,
            },
            {
              method: "GET",
              path: "/api/public/v1/minutecast?lat={lat}&lon={lon}",
              desc: "60-minute precipitation forecast at 1-minute resolution.",
              live: false,
            },
            {
              method: "GET",
              path: "/api/public/v1/alerts?lat={lat}&lon={lon}",
              desc: "Active severe weather advisories from official government sources.",
              live: false,
            },
          ].map((e) => (
            <article key={e.path} className="border border-border rounded-lg p-4">
              <header className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs px-2 py-1 rounded bg-success/15 text-success">
                  {e.method}
                </span>
                <code className="font-mono text-sm break-all">{e.path}</code>
                {e.live ? (
                  <span className="chip px-1.5 py-0.5 text-[10px] text-success border-success/40">
                    Live
                  </span>
                ) : (
                  <span className="chip px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </header>
              <p className="text-sm text-muted-foreground mt-2">{e.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold mb-3">Example request</h2>
        <pre className="bg-surface-2 rounded-lg p-4 text-xs font-mono overflow-x-auto border border-border">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${typeof window !== "undefined" ? window.location.origin : "https://lucast.weather"}/api/public/v1/current?lat=40.71&lon=-74.01"`}
        </pre>
        <p className="text-xs text-muted-foreground mt-3">
          Responses include <code className="font-mono text-foreground">X-RateLimit-Limit</code>{" "}
          and <code className="font-mono text-foreground">X-RateLimit-Remaining</code> headers
          so you can track quota in real time.
        </p>
      </section>
    </PageShell>
  );
}
