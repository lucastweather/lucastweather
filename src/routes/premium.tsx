import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Check, Loader2, AlertCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { createCheckout } from "@/lib/stripe-checkout";

export const Route = createFileRoute("/premium")({
  validateSearch: (s: Record<string, unknown>) => ({
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Premium — Lucast Weather" },
      { name: "description", content: "Unlock animated radar, hourly precision, ad-free, and API access." },
    ],
  }),
  component: PremiumPage,
});

const tiers = [
  {
    name: "Pro",
    priceCents: 499,
    blurb: "Everything you need for daily planning.",
    features: [
      "Animated radar loops",
      "Hourly forecast (15-min precision)",
      "Push notifications for severe alerts",
      "Ad-free experience",
    ],
  },
  {
    name: "Pro+",
    priceCents: 1499,
    blurb: "For power users, hobby pilots, and storm chasers.",
    highlight: true,
    features: [
      "Everything in Pro",
      "16-day extended forecast",
      "Lightning strike feed (250 mi)",
      "10,000 API calls / month",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    priceCents: 9900,
    blurb: "SLAs, white-label, and unlimited seats.",
    features: [
      "Unlimited API calls",
      "99.99% uptime SLA",
      "White-label embed widget",
      "Dedicated success engineer",
    ],
  },
] as const;

function PremiumPage() {
  const search = useSearch({ from: "/premium" });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function subscribe(tier: (typeof tiers)[number]) {
    setBusy(tier.name);
    setErr(null);
    try {
      const { url } = await createCheckout({
        data: {
          name: `Lucast Weather ${tier.name}`,
          amountCents: tier.priceCents,
          successUrl: `${window.location.origin}/premium?status=success`,
          cancelUrl: `${window.location.origin}/premium?status=cancelled`,
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed. Make sure your Stripe key is configured.");
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
          Unlock animated radar, sub-hourly precision, severe-weather notifications, and the
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
      </section>

      {err && (
        <div className="panel p-4 flex items-center gap-3 text-danger text-sm">
          <AlertCircle className="size-4" /> {err}
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <article
            key={t.name}
            className={`panel p-6 flex flex-col ${
              t.highlight ? "ring-2 ring-primary/50 relative" : ""
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase font-mono px-2 py-1 rounded bg-primary text-primary-foreground">
                Most Popular
              </span>
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
              onClick={() => subscribe(t)}
              disabled={busy !== null}
              className={`mt-6 w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                t.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-accent"
              }`}
            >
              {busy === t.name && <Loader2 className="size-4 animate-spin" />}
              {busy === t.name ? "Redirecting…" : `Subscribe to ${t.name}`}
            </button>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
