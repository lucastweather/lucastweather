import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Newspaper, ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { fetchNewsStories, type NewsStory } from "@/lib/news-stories";

export const fetchNewsList = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsStory[]> => fetchNewsStories(),
);

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Weather News — Lucast" },
      {
        name: "description",
        content:
          "The latest weather news from Lucast: hurricane landfalls, severe storm outlooks, winter storms, flooding, and live alerts sourced from NWS, SPC, and NHC.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lucastweather.lovable.app/news" }],
  }),
  component: NewsIndexPage,
});

function NewsIndexPage() {
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNewsList()
      .then((s) => !cancelled && setStories(s))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <section className="panel p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold">Lucast Weather News</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Top weather stories of the day — hurricanes, severe storms, winter weather, and major
          alerts curated from NWS, SPC, and the National Hurricane Center.
        </p>
        {loading && <div className="text-sm text-muted-foreground">Loading stories…</div>}
        <ul className="divide-y divide-border">
          {stories.map((s) => (
            <li key={s.id}>
              <Link
                to="/news/$id"
                params={{ id: s.id }}
                className="flex items-start gap-3 py-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary">
                    {s.category} · {s.source}
                  </div>
                  <div className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                    {s.headline}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{s.dek}</div>
                  {s.pubDate && (
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">
                      {new Date(s.pubDate).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            </li>
          ))}
          {!loading && stories.length === 0 && (
            <li className="text-sm text-muted-foreground py-4">No stories available right now.</li>
          )}
        </ul>
      </section>
    </PageShell>
  );
}
