export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
};

const WEATHER_NEWS_SOURCES: { name: string; url: string }[] = [
  { name: "NWS", url: "https://www.weather.gov/rss_page.php?site_name=nws" },
  { name: "SPC", url: "https://www.spc.noaa.gov/products/spcrss.xml" },
  { name: "NHC Atlantic", url: "https://www.nhc.noaa.gov/index-at.xml" },
  { name: "NHC Pacific", url: "https://www.nhc.noaa.gov/index-ep.xml" },
  { name: "NHC Central Pacific", url: "https://www.nhc.noaa.gov/index-cp.xml" },
];

export const WEATHER_NEWS_SOURCE_LABEL = "NWS · SPC · NHC";

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

export async function fetchWeatherNewsItems(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    WEATHER_NEWS_SOURCES.map(async (source) => {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "lucast-weather (weather news reader)" },
      });
      if (!response.ok) throw new Error(`${source.name} ${response.status}`);
      return parseRss(await response.text(), source.name);
    }),
  );

  const merged: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }
  merged.sort(
    (a, b) =>
      new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime(),
  );
  return merged.slice(0, 12);
}