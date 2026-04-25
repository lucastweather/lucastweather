import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { Newspaper, ExternalLink, AlertTriangle } from "lucide-react";

/**
 * Weather News — pulls the latest items from the NWS / NOAA newsroom RSS feed
 * via a server function so we avoid browser CORS issues. Falls back gracefully
 * if the upstream feed is unavailable.
 */

export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
};

const SOURCES: { name: string; url: string }[] = [
  // NOAA newsroom — broad weather, climate, ocean & space news
  { name: "NOAA", url: "https://www.noaa.gov/stories.xml" },
  // National Weather Service Weather-Ready Nation news
  { name: "NWS", url: "https://www.weather.gov/wrn/xml/rss/news.xml" },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) ?? [];
  for (const block of matches) {
    const title = /<title>([\s\S]*?)<\/title>/i.exec(block)?.[1] ?? "";
    const link = /<link>([\s\S]*?)<\/link>/i.exec(block)?.[1] ?? "";
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1] ?? "";
    const description = /<description>([\s\S]*?)<\/description>/i.exec(block)?.[1] ?? "";
    if (!title || !link) continue;
    items.push({
      title: decode(title),
      link: decode(link),
      pubDate: decode(pubDate),
      source,
      description: decode(description).slice(0, 220),
    });
  }
  return items;
}

export const fetchWeatherNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsItem[]> => {
    const results = await Promise.allSettled(
      SOURCES.map(async (s) => {
        const r = await fetch(s.url, {
          headers: { "User-Agent": "lucast-weather (contact@lucast.app)" },
        });
        if (!r.ok) throw new Error(`${s.name} ${r.status}`);
        return parseRss(await r.text(), s.name);
      }),
    );
    const merged: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") merged.push(...r.value);
    }
    merged.sort(
      (a, b) =>
        new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime(),
    );
    return merged.slice(0, 12);
  },
);

export default function WeatherNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWeatherNews()
      .then((data) => !cancelled && setItems(data))
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Newspaper className="size-5 text-primary" /> Weather News
        <span className="chip px-2 py-0.5 text-[10px] text-success border-success/30">
          NOAA · NWS
        </span>
      </h2>
      {loading && (
        <div className="text-sm text-muted-foreground">Loading latest weather news…</div>
      )}
      {err && (
        <div className="chip px-3 py-2 text-xs text-danger border-danger/30 flex items-center gap-2">
          <AlertTriangle className="size-3.5" /> {err}
        </div>
      )}
      {!loading && !err && items.length === 0 && (
        <div className="text-sm text-muted-foreground">No news available right now.</div>
      )}
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((n) => (
          <li key={n.link}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="chip px-4 py-3 flex flex-col gap-1.5 h-full hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <span>{n.source}</span>
                <span>
                  {n.pubDate
                    ? new Date(n.pubDate).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
              </div>
              <div className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors flex items-start gap-1">
                <span className="flex-1">{n.title}</span>
                <ExternalLink className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
              </div>
              {n.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {n.description}
                </div>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
