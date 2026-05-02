import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import PageShell from "@/components/PageShell";
import { fetchNewsStoryById, type NewsStory } from "@/lib/news-stories";

export const fetchNewsStoryFn = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }): Promise<NewsStory | null> => fetchNewsStoryById(data.id));

export const Route = createFileRoute("/news/$id")({
  loader: async ({ params }) => {
    const story = await fetchNewsStoryFn({ data: { id: params.id } });
    return { story };
  },
  head: ({ loaderData }) => {
    const story = loaderData?.story;
    return {
      meta: story
        ? [
            { title: `${story.headline} — Lucast Weather News` },
            { name: "description", content: story.dek },
            { property: "og:title", content: story.headline },
            { property: "og:description", content: story.dek },
          ]
        : [{ title: "Story not found — Lucast Weather News" }],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <PageShell>
        <div className="panel p-6">
          <p className="text-danger">{error.message}</p>
          <button
            className="chip px-3 py-1.5 text-xs mt-3"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="panel p-6">
        <p className="text-sm text-muted-foreground">Story not found.</p>
        <Link to="/news" className="chip px-3 py-1.5 text-xs mt-3 inline-flex">
          Back to news
        </Link>
      </div>
    </PageShell>
  ),
  component: NewsStoryPage,
});

function NewsStoryPage() {
  const { story } = Route.useLoaderData();

  if (!story) {
    return (
      <PageShell>
        <div className="panel p-6">
          <p className="text-sm text-muted-foreground">
            This story is no longer available. It may have rolled off the live feed.
          </p>
          <Link to="/news" className="chip px-3 py-1.5 text-xs mt-3 inline-flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> All weather news
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <article className="panel p-6 lg:p-10">
        <Link
          to="/news"
          className="chip px-3 py-1.5 text-xs inline-flex items-center gap-1 mb-5 w-fit"
        >
          <ArrowLeft className="size-3.5" /> Lucast Weather News
        </Link>
        <div className="text-[10px] font-mono uppercase tracking-wider text-primary flex items-center gap-2">
          <Newspaper className="size-3" /> {story.category} · {story.source}
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mt-2">
          {story.headline}
        </h1>
        <p className="text-lg text-muted-foreground mt-3 leading-relaxed">{story.dek}</p>
        {story.pubDate && (
          <div className="text-xs font-mono text-muted-foreground mt-3">
            {new Date(story.pubDate).toLocaleString()}
          </div>
        )}
        <div className="prose prose-invert mt-6 space-y-4 text-foreground/90 max-w-none">
          {story.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chip px-4 py-2 mt-8 inline-flex items-center gap-2 text-sm hover:bg-accent/30 transition-colors"
        >
          Read original bulletin from {story.source}
          <ExternalLink className="size-3.5" />
        </a>
      </article>
    </PageShell>
  );
}
