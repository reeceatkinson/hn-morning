import type { BriefStory, DailySummary, HnStory } from "./types";
import { londonDate } from "./london-date";
import { fetchTopStories, pickBrief } from "./hn";
import { saveSummary } from "./storage";

const THEME_HINTS: { label: string; re: RegExp }[] = [
  { label: "AI", re: /\b(ai|llm|gpt|openai|anthropic|claude|gemini|ml|machine learning|neural|model)\b/i },
  { label: "Security", re: /\b(cve|security|vulnerab|exploit|auth|encryption|malware|phishing)\b/i },
  { label: "Open source", re: /\b(open.?source|github|linux|kernel|gpl|foss|rust|golang)\b/i },
  { label: "Startups", re: /\b(startup|yc|y combinator|founder|venture|funding|ipo)\b/i },
  { label: "Web", re: /\b(browser|javascript|typescript|react|next\.js|css|http|web)\b/i },
  { label: "Science", re: /\b(physics|biology|space|nasa|climate|research|paper|arxiv)\b/i },
  { label: "Hardware", re: /\b(chip|gpu|cpu|apple|nvidia|intel|arm|silicon|device)\b/i },
];

function blurbFor(story: HnStory): string {
  if (story.text) {
    const clipped = story.text.slice(0, 220).replace(/\s+/g, " ").trim();
    return clipped.length < story.text.length ? `${clipped}…` : clipped;
  }
  const host = story.domain ?? "Hacker News";
  if (story.title.startsWith("Ask HN:")) {
    return `An Ask HN thread (${story.comments} comments) — no outbound link.`;
  }
  if (story.title.startsWith("Show HN:")) {
    return `A Show HN on ${host}, ${story.score} points into the morning.`;
  }
  return `${story.score} points and ${story.comments} comments via ${host}.`;
}

function detectThemes(
  stories: { title: string; domain: string | null; blurb?: string }[],
): string[] {
  const found: string[] = [];
  for (const hint of THEME_HINTS) {
    if (
      stories.some((s) =>
        hint.re.test(`${s.title} ${s.blurb ?? ""} ${s.domain ?? ""}`),
      )
    ) {
      found.push(hint.label);
    }
  }
  return found.slice(0, 5);
}

function extractiveBrief(stories: HnStory[], date: string): DailySummary {
  const briefStories: BriefStory[] = stories.map((s) => ({
    ...s,
    blurb: blurbFor(s),
  }));
  const themes = detectThemes(briefStories);
  const top = briefStories[0];
  const headline = top
    ? `Front page led by “${top.title}”`
    : "Morning cut of the HN front page";
  const themeBit = themes.length
    ? ` Themes in the mix: ${themes.join(", ")}.`
    : "";
  const intro = `A ${briefStories.length}-story cut of this morning’s Hacker News front page, skipping hiring posts and capping any one domain at two slots so the brief isn’t a single-site pile-up.${themeBit} Ranked by score with a light boost for discussion.`;

  return {
    date,
    generatedAt: new Date().toISOString(),
    timezone: "Europe/London",
    mode: "extractive",
    headline,
    intro,
    themes,
    stories: briefStories,
  };
}

function formatForLlm(stories: HnStory[]): string {
  return stories
    .map(
      (s, i) =>
        `${i + 1}. ${s.title}\n   points=${s.score} comments=${s.comments} by=${s.by} domain=${s.domain ?? "hn"}\n   article=${s.url ?? "(text post)"}\n   hn=${s.hnUrl}\n   text=${s.text ?? ""}`,
    )
    .join("\n\n");
}

type LlmJson = {
  headline?: string;
  intro?: string;
  themes?: string[];
  blurbs?: { id: number; blurb: string }[];
};

async function llmBrief(stories: HnStory[], date: string): Promise<DailySummary | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You write a calm morning brief of Hacker News. Return JSON only: {headline: string, intro: string (2-3 sentences), themes: string[], blurbs: [{id, blurb}]} with one short blurb per story. No hype. No invented facts.",
        },
        {
          role: "user",
          content: `Date (Europe/London): ${date}\n\nStories:\n${formatForLlm(stories)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI summary failed", res.status, await res.text());
    return null;
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: LlmJson;
  try {
    parsed = JSON.parse(content) as LlmJson;
  } catch {
    return null;
  }

  const blurbMap = new Map(
    (parsed.blurbs ?? []).map((b) => [b.id, b.blurb] as const),
  );
  const briefStories: BriefStory[] = stories.map((s) => ({
    ...s,
    blurb: (blurbMap.get(s.id) || blurbFor(s)).slice(0, 280),
  }));

  return {
    date,
    generatedAt: new Date().toISOString(),
    timezone: "Europe/London",
    mode: "llm",
    headline: parsed.headline?.slice(0, 160) || extractiveBrief(stories, date).headline,
    intro: parsed.intro?.slice(0, 800) || extractiveBrief(stories, date).intro,
    themes: Array.isArray(parsed.themes)
      ? parsed.themes.map(String).slice(0, 6)
      : detectThemes(briefStories),
    stories: briefStories,
  };
}

export async function generateDailySummary(): Promise<{
  summary: DailySummary;
  file: string;
}> {
  const date = londonDate();
  const pool = await fetchTopStories(30);
  const picked = pickBrief(pool, 14);
  if (picked.length === 0) {
    throw new Error("No HN stories available after filtering");
  }

  let summary = await llmBrief(picked, date);
  if (!summary) {
    summary = extractiveBrief(picked, date);
  }

  const file = await saveSummary(summary);
  return { summary, file };
}
