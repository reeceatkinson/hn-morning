import { NextRequest } from "next/server";
import { appendMessage, loadTodayThread, readQuotaSnapshot, reserveAsk } from "@/lib/asks";
import { llmAnswer, mockAnswer } from "@/lib/answer";
import { londonDate } from "@/lib/london-date";
import { loadLatestSummary } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function snapshot(quota: { used: number; limit: number }) {
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: Math.max(0, quota.limit - quota.used),
  };
}

export async function GET() {
  const date = londonDate();
  const [quota, thread] = await Promise.all([
    readQuotaSnapshot(),
    loadTodayThread(date),
  ]);
  return Response.json({
    ok: true,
    date,
    ...snapshot(quota),
    messages: thread.messages,
  });
}

export async function POST(req: NextRequest) {
  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    question = "";
  }

  if (!question) {
    const quota = await readQuotaSnapshot();
    return Response.json(
      { ok: false, error: "empty_question", message: "Ask something about today’s brief.", ...snapshot(quota) },
      { status: 400 },
    );
  }

  if (question.length > 500) {
    const quota = await readQuotaSnapshot();
    return Response.json(
      {
        ok: false,
        error: "too_long",
        message: "Keep follow-ups under 500 characters.",
        ...snapshot(quota),
      },
      { status: 400 },
    );
  }

  const summary = await loadLatestSummary();
  if (!summary) {
    const quota = await readQuotaSnapshot();
    return Response.json(
      {
        ok: false,
        error: "no_summary",
        message: "No brief on file yet. Run npm run seed.",
        ...snapshot(quota),
      },
      { status: 503 },
    );
  }

  const reserved = await reserveAsk();
  if (!reserved.ok) {
    return Response.json(
      {
        ok: false,
        error: "ask_limit_reached",
        message: `Public follow-ups are exhausted (${reserved.quota.used} / ${reserved.quota.limit}).`,
        ...snapshot(reserved.quota),
      },
      { status: 429 },
    );
  }

  let source: "llm" | "mock" = "mock";
  let answer = "";
  try {
    const live = await llmAnswer(question, summary);
    if (live) {
      source = "llm";
      answer = live;
    } else {
      answer = mockAnswer(question, summary);
    }
  } catch (err) {
    console.error(err);
    answer = mockAnswer(question, summary);
  }

  const date = londonDate();
  const message = await appendMessage(date, { question, answer, source });

  return Response.json({
    ok: true,
    ...snapshot(reserved.quota),
    source,
    message,
  });
}
