import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { geocode, type GeoResult } from "@/lib/weather";
import { setCity } from "@/lib/city-store";

export default function CitySearch({ currentCity }: { currentCity: GeoResult }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await geocode(q.trim());
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

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
        {open && (q || loading) && (
          <div className="absolute left-0 right-0 mt-2 panel max-h-72 overflow-auto z-40">
            {loading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            )}
            {!loading && results.length === 0 && q.trim() && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setCity(r);
                  setQ("");
                  setOpen(false);
                }}
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
