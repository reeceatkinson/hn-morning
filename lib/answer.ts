import type { DailySummary } from "./types";

const STOP = new Set([
  "what",
  "whats",
  "which",
  "about",
  "this",
  "that",
  "with",
  "from",
  "have",
  "does",
  "anything",
  "something",
  "today",
  "there",
  "their",
  "your",
  "more",
  "most",
  "into",
  "just",
  "like",
  "tell",
  "give",
  "show",
  "brief",
  "story",
  "stories",
  "hacker",
  "news",
  "morning",
]);

function words(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function hay(summary: DailySummary, id?: number): string {
  if (id != null) {
    const s = summary.stories.find((x) => x.id === id);
    if (!s) return "";
    return `${s.title} ${s.blurb} ${s.domain ?? ""} ${s.by}`.toLowerCase();
  }
  return `${summary.headline} ${summary.intro} ${summary.themes.join(" ")} ${summary.stories
    .map((s) => `${s.title} ${s.blurb} ${s.domain ?? ""}`)
    .join(" ")}`.toLowerCase();
}

function cite(s: DailySummary["stories"][number]): string {
  const host = s.domain ? ` (${s.domain})` : "";
  return `“${s.title}”${host} — ${s.score} points, ${s.comments} comments`;
}

export function mockAnswer(question: string, summary: DailySummary): string {
  const q = question.trim();
  const qLower = q.toLowerCase();
  const tokens = words(q);

  const scored = summary.stories
    .map((s) => {
      const h = hay(summary, s.id);
      const hits = tokens.filter((t) => h.includes(t)).length;
      return { s, hits };
    })
    .sort((a, b) => b.hits - a.hits || b.s.score - a.s.score);

  const matched = scored.filter((x) => x.hits > 0).slice(0, 3);

  if (/most (discussed|commented)|comment/.test(qLower)) {
    const top = [...summary.stories].sort((a, b) => b.comments - a.comments)[0];
    if (top) {
      return `The noisiest thread in this morning’s brief is ${cite(top)}. ${top.blurb} Discussion: ${top.hnUrl}`;
    }
  }

  if (/(highest|top) (score|points)|most (popular|upvoted)|front of the (page|brief)/.test(qLower)) {
    const top = [...summary.stories].sort((a, b) => b.score - a.score)[0];
    if (top) {
      return `Highest score in the cut is ${cite(top)}. ${top.blurb}${top.url ? ` Article: ${top.url}` : ""}`;
    }
  }

  if (matched.length > 0) {
    const lead = matched[0].s;
    const extra = matched.slice(1);
    const more = extra.length
      ? ` Also in range: ${extra.map((x) => `“${x.s.title}”`).join("; ")}.`
      : "";
    return `From today’s brief, that points at ${cite(lead)}. ${lead.blurb}${more} HN: ${lead.hnUrl}`;
  }

  if (/theme|overview|summary|what.?s on|anything interesting|tl;?dr/.test(qLower) || tokens.length === 0) {
    const names = summary.stories
      .slice(0, 3)
      .map((s) => `“${s.title}”`)
      .join("; ");
    const themes = summary.themes.length
      ? ` Themes: ${summary.themes.join(", ")}.`
      : "";
    return `${summary.intro}${themes} Opening the list: ${names}.`;
  }

  const top3 = summary.stories.slice(0, 3);
  return `Nothing in the brief is a close lexical hit for “${q.slice(0, 80)}”, so here is the top of the cut instead. ${summary.headline}. ${top3.map((s) => cite(s)).join(". ")}.`;
}

export function formatSummaryForLlm(summary: DailySummary): string {
  const lines = [
    `Headline: ${summary.headline}`,
    `Intro: ${summary.intro}`,
    `Themes: ${summary.themes.join(", ") || "(none)"}`,
    "",
    ...summary.stories.map(
      (s, i) =>
        `${i + 1}. ${s.title}\n   ${s.blurb}\n   ${s.score} pts / ${s.comments} comments / ${s.domain ?? "hn"}\n   article: ${s.url ?? "(none)"}\n   hn: ${s.hnUrl}`,
    ),
  ];
  return lines.join("\n");
}

export async function llmAnswer(
  question: string,
  summary: DailySummary,
): Promise<string | null> {
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
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "You answer short follow-ups about today's HN Morning brief. Stay grounded in the provided stories. Cite titles. If the question is off-brief, say so and point back. 1–3 short paragraphs. No tools, no invented links.",
        },
        {
          role: "user",
          content: `DATE: ${summary.date}\n\nBRIEF:\n${formatSummaryForLlm(summary)}\n\nQUESTION: ${question}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI ask failed", res.status, await res.text());
    return null;
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  return content || null;
}
