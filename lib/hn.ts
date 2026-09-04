import type { HnStory } from "./types";

const TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const itemUrl = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

const JOBBY =
  /\b(hiring|is hiring|who'?s hiring|who is hiring|freelancer\?|job listing|jobs?\b)/i;

type RawItem = {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  by?: string;
  text?: string;
  dead?: boolean;
  deleted?: boolean;
};

function decodeEntities(html: string): string {
  return html
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "\u003c")
    .replace(/&gt;/g, "\u003e");
}

function stripHtml(html: string): string {
  return decodeEntities(
    html.replace(/\u003cp\u003e/gi, " ").replace(/\u003c[^\u003e]+\u003e/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function isJob(item: RawItem): boolean {
  if (item.type === "job") return true;
  return JOBBY.test(item.title ?? "");
}

export async function fetchTopStories(limit = 30): Promise<HnStory[]> {
  const res = await fetch(TOP_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HN topstories failed: ${res.status}`);
  }
  const ids = (await res.json()) as number[];
  const slice = ids.slice(0, limit);

  const items = await Promise.all(
    slice.map(async (id) => {
      const r = await fetch(itemUrl(id), { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as RawItem | null;
    }),
  );

  const stories: HnStory[] = [];
  for (const item of items) {
    if (!item || item.dead || item.deleted) continue;
    if (item.type && item.type !== "story") continue;
    if (!item.title) continue;
    if (isJob(item)) continue;
    const url = item.url ?? null;
    stories.push({
      id: item.id,
      title: item.title,
      url,
      hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score ?? 0,
      comments: item.descendants ?? 0,
      by: item.by ?? "unknown",
      domain: domainOf(url),
      text: item.text ? stripHtml(item.text) : null,
    });
  }
  return stories;
}

/** Rank by score, then keep domain diversity. Target 12–15. */
export function pickBrief(stories: HnStory[], target = 14): HnStory[] {
  const ranked = [...stories].sort((a, b) => {
    const as = a.score + Math.min(a.comments, 400) * 0.35;
    const bs = b.score + Math.min(b.comments, 400) * 0.35;
    return bs - as;
  });

  const selected: HnStory[] = [];
  const domainCount = new Map<string, number>();

  for (const story of ranked) {
    const key = story.domain ?? "news.ycombinator.com";
    if ((domainCount.get(key) ?? 0) >= 2) continue;
    domainCount.set(key, (domainCount.get(key) ?? 0) + 1);
    selected.push(story);
    if (selected.length >= target) return selected;
  }

  for (const story of ranked) {
    if (selected.some((s) => s.id === story.id)) continue;
    selected.push(story);
    if (selected.length >= Math.max(12, Math.min(target, 15))) break;
  }

  return selected.slice(0, 15);
}
