import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Clock } from "lucide-react";
import { geocode, type GeoResult } from "@/lib/weather";
import { setCity } from "@/lib/city-store";

const POPULAR: { name: string; admin1: string; country_code: string }[] = [
  { name: "New York", admin1: "NY", country_code: "US" },
  { name: "Los Angeles", admin1: "CA", country_code: "US" },
  { name: "Chicago", admin1: "IL", country_code: "US" },
  { name: "Miami", admin1: "FL", country_code: "US" },
  { name: "London", admin1: "England", country_code: "GB" },
  { name: "Tokyo", admin1: "Tokyo", country_code: "JP" },
  { name: "Paris", admin1: "Île-de-France", country_code: "FR" },
  { name: "Sydney", admin1: "NSW", country_code: "AU" },
];

const RECENT_KEY = "lucast.recent-cities";

function loadRecent(): GeoResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(c: GeoResult) {
  const cur = loadRecent().filter((x) => x.id !== c.id);
  cur.unshift(c);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 5)));
}

export default function CitySearch({ currentCity }: { currentCity: GeoResult }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      // Fetch full results AND lightweight name-only suggestions in parallel.
      const [r, s] = await Promise.all([
        geocode(query),
        geocode(query.slice(0, Math.max(2, query.length))),
      ]);
      setResults(r);
      // Build unique name suggestions from the second pass
      const names = Array.from(
        new Set(s.map((x) => x.name).filter((n) => n.toLowerCase().startsWith(query.toLowerCase()))),
      ).slice(0, 5);
      setSuggestions(names);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function pick(r: GeoResult) {
    setCity(r);
    pushRecent(r);
    setRecent(loadRecent());
    setQ("");
    setOpen(false);
  }

  const showEmpty = !q.trim() && (recent.length > 0 || true);

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any city worldwide…"
          className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {open && (
          <div className="absolute left-0 right-0 mt-2 panel max-h-96 overflow-auto z-40">
            {loading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            )}

            {!q.trim() && showEmpty && (
              <>
                {recent.length > 0 && (
                  <div className="border-b border-border">
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Recent
                    </div>
                    {recent.map((r) => (
                      <button
                        key={`r-${r.id}`}
                        onClick={() => pick(r)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                      >
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">
                          {r.admin1 ? `${r.admin1}, ` : ""}
                          {r.country_code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Popular
                </div>
                {POPULAR.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setQ(p.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <MapPin className="size-3.5 text-primary" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">
                      {p.admin1}, {p.country_code}
                    </span>
                  </button>
                ))}
              </>
            )}

            {!loading && q.trim() && suggestions.length > 0 && (
              <div className="border-b border-border px-3 py-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQ(s)}
                    className="chip px-2 py-0.5 text-xs hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {!loading && q.trim() && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
              >
                <MapPin className="size-3.5 text-primary" />
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">
                  {r.admin1 ? `${r.admin1}, ` : ""}
                  {r.country_code}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="chip px-3 py-2 text-xs text-muted-foreground hidden md:flex items-center gap-1.5 shrink-0">
        <MapPin className="size-3.5 text-primary" />
        <span className="font-mono">
          {currentCity.name}
          {currentCity.admin1 ? `, ${currentCity.admin1}` : ""}
        </span>
      </div>
    </div>
  );
}
