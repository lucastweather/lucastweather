import { createFileRoute, useSearch, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Check, Loader2, AlertCircle, Settings } from "lucide-react";
import PageShell from "@/components/PageShell";
import { createCheckout, customerPortal, checkSubscription } from "@/lib/stripe-checkout";
import { useAuth, useSubscription } from "@/lib/auth-store";

export const Route = createFileRoute("/premium")({
  validateSearch: (s: Record<string, unknown>) => ({
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Premium — Lucast Weather" },
      { name: "description", content: "Unlock animated radar nowcast, 16-day forecast, and ad-free experience." },
    ],
    links: [{ rel: "canonical", href: "https://lucastweather.lovable.app/premium" }],
  }),
  component: PremiumPage,
});

type Tier = {
  name: string;
  priceCents: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
};

const tiers: Tier[] = [
  {
    name: "Pro",
    priceCents: 300,
    blurb: "Unlock the full Lucast experience.",
    highlight: true,
    features: [
      "30-minute radar nowcast (forward frames)",
      "16-day extended forecast",
      "Ad-free experience",
      "Push notifications for severe alerts",
      "Minute-by-minute MinuteCast",
    ],
  },
  {
    name: "Pro+",
    priceCents: 900,
    blurb: "For power users, hobby pilots, and storm chasers.",
    features: [
      "Everything in Pro",
      "Lightning strike feed (250 mi)",
      "Hi-res satellite & infrared loops",
      "10,000 API calls / month",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    priceCents: 1500,
    blurb: "SLAs, white-label, and unlimited seats.",
    features: [
      "Unlimited API calls",
      "99.99% uptime SLA",
      "White-label embed widget",
      "Dedicated success engineer",
    ],
  },
];

function PremiumPage() {
  const search = useSearch({ from: "/premium" });
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { subscribed, tier: activeTier, endsAt, refresh } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // After successful checkout, verify with Stripe
  useEffect(() => {
    if (search.status === "success" && user) {
      checkSubscription().then(() => refresh());
    }
  }, [search.status, user, refresh]);

  async function subscribe(tier: Tier) {
    if (!user) {
      navigate({ to: "/admin", search: { redirect: "/premium" } });
      return;
    }
    setBusy(tier.name);
    setErr(null);
    try {
      const { url } = await createCheckout({
        data: {
          tier: tier.name,
          successUrl: `${window.location.origin}/premium?status=success`,
          cancelUrl: `${window.location.origin}/premium?status=cancelled`,
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed.");
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("manage");
    setErr(null);
    try {
      const { url } = await customerPortal({
        data: { returnUrl: `${window.location.origin}/premium` },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Could not open billing portal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell>
      <section className="panel p-8 text-center">
        <Crown className="size-10 mx-auto text-warning" />
        <h1 className="text-4xl font-semibold mt-3">Go Premium</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Unlock radar nowcast, 16-day forecast, severe-weather notifications, and the
          full Lucast API.
        </p>
        {search.status === "success" && (
          <div className="mt-4 chip inline-flex items-center gap-2 px-4 py-2 text-success">
            <Check className="size-4" /> Subscription activated. Welcome aboard!
          </div>
        )}
        {search.status === "cancelled" && (
          <div className="mt-4 chip inline-flex items-center gap-2 px-4 py-2 text-muted-foreground">
            Checkout cancelled — no worries, take your time.
          </div>
        )}
        {ready && !user && (
          <div className="mt-4 chip inline-flex items-center gap-2 px-4 py-2">
            <Link to="/admin" search={{ redirect: "/premium" }} className="text-primary">
              Sign in
            </Link>
            <span className="text-muted-foreground">to subscribe and sync across devices.</span>
          </div>
        )}
        {subscribed && (
          <div className="mt-4 panel inline-flex items-center gap-3 px-5 py-3 border-success/30">
            <Crown className="size-5 text-warning" />
            <div className="text-left">
              <div className="text-sm font-semibold text-success">
                Active: Lucast {activeTier ?? "Pro"}
              </div>
              {endsAt && (
                <div className="text-xs text-muted-foreground font-mono">
                  Renews {new Date(endsAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <button
              onClick={manage}
              disabled={busy !== null}
              className="ml-2 chip px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-accent"
            >
              <Settings className="size-3" />
              Manage
            </button>
          </div>
        )}
      </section>

      {err && (
        <div className="panel p-4 flex items-center gap-3 text-danger text-sm">
          <AlertCircle className="size-4" /> {err}
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const isActive = subscribed && activeTier === t.name;
          return (
            <article
              key={t.name}
              className={`panel p-6 flex flex-col ${
                isActive
                  ? "ring-2 ring-success/60 relative"
                  : t.highlight
                    ? "ring-2 ring-primary/50 relative"
                    : ""
              }`}
            >
              {isActive ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase font-mono px-2 py-1 rounded bg-success text-background">
                  Your Plan
                </span>
              ) : (
                t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase font-mono px-2 py-1 rounded bg-primary text-primary-foreground">
                    Most Popular
                  </span>
                )
              )}
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">${(t.priceCents / 100).toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-success shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => (isActive ? manage() : subscribe(t))}
                disabled={busy !== null}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isActive
                    ? "border border-success/40 text-success hover:bg-success/10"
                    : t.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-accent"
                }`}
              >
                {busy === t.name && <Loader2 className="size-4 animate-spin" />}
                {isActive
                  ? "Manage Subscription"
                  : busy === t.name
                    ? "Redirecting…"
                    : `Subscribe to ${t.name}`}
              </button>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
