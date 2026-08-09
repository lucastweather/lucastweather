import { useState } from "react";
import { Heart, Loader2, Check } from "lucide-react";

const PRESETS = [3, 5, 10, 25];

export default function DonationForm() {
  const [amount, setAmount] = useState<number>(5);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const thanks =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("donation") === "thanks";

  const value = custom.trim() ? Number(custom) : amount;

  async function donate() {
    setErr(null);
    if (!Number.isFinite(value) || value < 1 || value > 5000) {
      setErr("Enter an amount between $1 and $5,000.");
      return;
    }
    setLoading(true);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/public/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          name,
          message,
          recurring,
          successUrl: `${origin}/premium?donation=thanks`,
          cancelUrl: `${origin}/premium?donation=cancelled`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(typeof data?.error === "string" ? data.error : "Donation failed.");
      }
      window.location.href = data.url as string;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Donation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="icon-tile size-8 rounded-lg">
          <Heart className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">Support Lucast Weather</h2>
          <p className="text-xs text-muted-foreground">
            Donations pay for radar tiles, NOAA ingest, and server time. No account needed.
          </p>
        </div>
      </div>

      {thanks && (
        <div className="chip px-3 py-2 text-xs text-success border-success/40 flex items-center gap-2">
          <Check className="size-3.5" /> Thank you — your donation went through.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom("");
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              !custom.trim() && amount === p
                ? "bg-primary/15 text-primary border-primary/40"
                : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            ${p}
          </button>
        ))}
        <div className="flex items-center gap-1 px-3 rounded-xl border border-border/70 focus-within:border-primary/50">
          <span className="text-muted-foreground text-sm">$</span>
          <input
            inputMode="decimal"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Other"
            aria-label="Custom donation amount"
            className="w-20 bg-transparent outline-none text-sm py-2"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Name (optional)"
          aria-label="Your name"
          className="px-3 py-2 rounded-xl bg-transparent border border-border/70 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 300))}
          placeholder="Message (optional)"
          aria-label="Message"
          className="px-3 py-2 rounded-xl bg-transparent border border-border/70 text-sm outline-none focus:border-primary/50"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="accent-[var(--primary)]"
        />
        Make this a monthly donation
      </label>

      {err && <div className="text-xs text-danger">{err}</div>}

      <button
        type="button"
        onClick={donate}
        disabled={loading}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
        {loading
          ? "Opening checkout…"
          : `Donate $${Number.isFinite(value) ? value : 0}${recurring ? "/mo" : ""}`}
      </button>
      <p className="text-[11px] text-muted-foreground">
        Payments are processed securely by Stripe. Donations are not tax-deductible.
      </p>
    </section>
  );
}
