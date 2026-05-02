import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Newspaper, ChevronRight, AlertTriangle } from "lucide-react";
import { fetchNewsStories, type NewsStory } from "@/lib/news-stories";

/**
 * Weather News — pulls real-time bulletins from NWS / SPC / NHC, reformats
 * them into magazine-style story cards (e.g. "Hurricane Melissa Makes
 * Landfall…"), and links each one to an internal Lucast Weather News page so
 * readers stay inside the app instead of bouncing to raw .gov bulletins.
 */

export const fetchWeatherNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsStory[]> => fetchNewsStories(),
);

export default function WeatherNews() {
  const [items, setItems] = useState<NewsStory[]>([]);
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

  const top = items.slice(0, 6);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Newspaper className="size-5 text-primary" /> Weather News
          <span className="chip px-2 py-0.5 text-[10px] text-success border-success/30">
            Lucast Newsroom
          </span>
        </h2>
        <Link
          to="/news"
          className="chip px-3 py-1.5 text-xs hover:bg-accent/30 transition-colors flex items-center gap-1"
        >
          All stories <ChevronRight className="size-3" />
        </Link>
      </div>
      {loading && (
        <div className="text-sm text-muted-foreground">Loading the latest weather stories…</div>
      )}
      {err && (
        <div className="chip px-3 py-2 text-xs text-danger border-danger/30 flex items-center gap-2">
          <AlertTriangle className="size-3.5" /> {err}
        </div>
      )}
      {!loading && !err && top.length === 0 && (
        <div className="text-sm text-muted-foreground">No stories available right now.</div>
      )}
      <ul className="grid sm:grid-cols-2 gap-3">
        {top.map((story) => (
          <li key={story.id}>
            <Link
              to="/news/$id"
              params={{ id: story.id }}
              className="chip px-4 py-3 flex flex-col gap-1.5 h-full hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-primary uppercase tracking-wider">
                <span>{story.category}</span>
                <span className="text-muted-foreground">
                  {story.pubDate
                    ? new Date(story.pubDate).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : story.source}
                </span>
              </div>
              <div className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                {story.headline}
              </div>
              {story.dek && (
                <div className="text-xs text-muted-foreground line-clamp-2">{story.dek}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
