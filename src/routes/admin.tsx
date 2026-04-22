import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { LockKeyhole, LogOut, Crown } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSubscription } from "@/lib/auth-store";

export const Route = createFileRoute("/admin")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Lucast Weather" },
      { name: "description", content: "Sign in or create an account to manage your Lucast subscription." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin" });
  const { user, ready, signOut } = useAuth();
  const { subscribed, tier, endsAt } = useSubscription();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Redirect after login
  useEffect(() => {
    if (ready && user && search.redirect) {
      navigate({ to: search.redirect as any });
    }
  }, [ready, user, search.redirect, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  if (ready && user) {
    return (
      <PageShell>
        <section className="max-w-md mx-auto panel p-8 mt-12">
          <div className="flex items-center gap-2 mb-4">
            <LockKeyhole className="text-primary" />
            <h1 className="text-2xl font-semibold">Account</h1>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">Signed in as</div>
            <div className="font-mono">{user.email}</div>
          </div>
          <div className="mt-4 panel p-4 flex items-center gap-3">
            <Crown className={`size-5 ${subscribed ? "text-warning" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {subscribed ? `Lucast ${tier ?? "Pro"} active` : "Free tier"}
              </div>
              {subscribed && endsAt ? (
                <div className="text-xs text-muted-foreground font-mono">
                  Renews {new Date(endsAt).toLocaleDateString()}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Upgrade to unlock radar nowcast & 16-day forecast.
                </div>
              )}
            </div>
            <Link
              to="/premium"
              search={{ status: undefined }}
              className="chip px-3 py-1.5 text-xs text-warning border-warning/40 hover:bg-warning/10"
            >
              {subscribed ? "Manage" : "Upgrade"}
            </Link>
          </div>
          <button
            onClick={signOut}
            className="mt-6 w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="max-w-md mx-auto panel p-8 mt-12">
        <div className="flex items-center gap-2 mb-6">
          <LockKeyhole className="text-primary" />
          <h1 className="text-2xl font-semibold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg p-3">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => {
            setErr(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground text-center"
        >
          {mode === "signin"
            ? "Need an account? Create one →"
            : "← Already have an account? Sign in"}
        </button>
      </section>
    </PageShell>
  );
}
