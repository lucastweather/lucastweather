import { fetchWeatherNewsItems, type NewsItem } from "@/lib/weather-news";

export type NewsStory = {
  id: string;
  headline: string;
  dek: string;
  body: string[];
  category: string;
  source: string;
  sourceUrl: string;
  pubDate: string;
};

/**
 * Build a deterministic slug-style id from a headline so internal links stay
 * stable across renders and the detail route can recover the original story.
 */
function makeId(item: NewsItem): string {
  const base = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  // Append a short hash of the link so duplicate titles don't collide.
  let h = 0;
  for (let i = 0; i < item.link.length; i++) h = (h * 31 + item.link.charCodeAt(i)) | 0;
  return `${base}-${Math.abs(h).toString(36).slice(0, 6)}`;
}

function categoryFor(item: NewsItem): string {
  const t = item.title.toLowerCase();
  if (item.source.startsWith("NHC")) return "Tropical";
  if (item.source === "SPC") return "Severe Weather";
  if (/hurricane|tropical storm|typhoon|cyclone/.test(t)) return "Tropical";
  if (/tornado|thunderstorm|severe|hail/.test(t)) return "Severe Weather";
  if (/winter|snow|ice|blizzard/.test(t)) return "Winter Storm";
  if (/flood|flash flood/.test(t)) return "Flooding";
  if (/heat|wildfire|drought/.test(t)) return "Heat & Fire";
  return "Weather";
}

/**
 * Turn an NWS / NHC / SPC RSS bulletin into a magazine-style news story so the
 * homepage feed reads like real news ("Hurricane Melissa Makes Landfall…")
 * instead of agency boilerplate. We synthesize a dek and body from the source
 * description but always link back to the original bulletin for verification.
 */
function toStory(item: NewsItem): NewsStory {
  const category = categoryFor(item);
  const cleanTitle = item.title
    .replace(/^\s*(NWS|SPC|NHC)\s*[-:]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const headline = cleanTitle.length > 4 ? cleanTitle : item.title;
  const desc = (item.description ?? "").trim();
  const dek =
    desc.length > 20
      ? desc.split(/(?<=[.!?])\s+/)[0].slice(0, 200)
      : `${category} update from ${item.source}.`;
  const body = desc
    ? desc
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.length > 0)
        .reduce<string[]>((paragraphs, sentence) => {
          if (paragraphs.length === 0) paragraphs.push(sentence);
          else if (paragraphs[paragraphs.length - 1].length < 240)
            paragraphs[paragraphs.length - 1] += " " + sentence;
          else paragraphs.push(sentence);
          return paragraphs;
        }, [])
    : [
        `${headline}. This advisory was issued by ${item.source} and may include life-safety guidance for affected areas.`,
        `Refer to the original bulletin for the latest coordinates, watches, and warnings as conditions evolve.`,
      ];
  return {
    id: makeId(item),
    headline,
    dek,
    body,
    category,
    source: item.source,
    sourceUrl: item.link,
    pubDate: item.pubDate,
  };
}

export async function fetchNewsStories(): Promise<NewsStory[]> {
  const items = await fetchWeatherNewsItems();
  return items.map(toStory);
}

export async function fetchNewsStoryById(id: string): Promise<NewsStory | null> {
  const stories = await fetchNewsStories();
  return stories.find((s) => s.id === id) ?? null;
}
