import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import PageShell from "@/components/PageShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Lucast Weather" },
      { name: "description", content: "Administrator sign-in." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("Admin accounts are issued on request. Contact support@lucast.weather.");
  }

  return (
    <PageShell>
      <section className="max-w-md mx-auto panel p-8 mt-12">
        <div className="flex items-center gap-2 mb-6">
          <LockKeyhole className="text-primary" />
          <h1 className="text-2xl font-semibold">Admin Sign-in</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="you@lucast.weather"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
              {err}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90"
          >
            Sign in
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Forgot your credentials? Contact your workspace owner.
        </p>
      </section>
    </PageShell>
  );
}
