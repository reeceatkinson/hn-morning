import { NextRequest } from "next/server";
import { generateDailySummary } from "@/lib/summarize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local/dev: allow if no secret is configured.
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = req.nextUrl.searchParams.get("secret");
  return bearer === secret || query === secret;
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const { summary, file } = await generateDailySummary();
    return Response.json({
      ok: true,
      date: summary.date,
      mode: summary.mode,
      stories: summary.stories.length,
      file,
      headline: summary.headline,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
