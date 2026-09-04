# HN Morning

Public prototype for a daily Hacker News morning brief, with a site-wide cap of **15** follow-up asks. ClickUp REECE-1085. Host target: **reeceatkinson.dev** (lab).

Unauthenticated. No accounts.

## Run locally

```bash
npm install
npm run seed          # fetch HN top ~30, write today's brief to .data/
npm run dev           # http://127.0.0.1:43147
```

`npm run seed` hits the public Firebase HN API (not Cursor MCP), skips hiring/jobs, picks ~12–15 stories by score with domain diversity, then writes:

`.data/summary-YYYY-MM-DD.json`

Dates are **Europe/London**. If `OPENAI_API_KEY` is set, the brief and follow-ups use a cheap chat model (`gpt-4o-mini` by default). If not, the brief is extractive (ranked titles + one-liners from HN fields) and asks are answered by a **grounded mock** over that same JSON — still a real `/api/ask` that increments the counter.

You can also generate via HTTP once the app is running:

```bash
curl -X POST http://127.0.0.1:43147/api/cron/generate \
  -H "Authorization: Bearer $CRON_SECRET"
```

In production `CRON_SECRET` is required. Locally, if it is unset, generate is allowed.

## Follow-ups (`/api/ask`)

- `GET /api/ask` — `{ used, remaining, limit, messages }` for today.
- `POST /api/ask` `{ "question": "…" }` — **reserves a slot first** (atomic file write), then answers. Hard-stops at 15 with HTTP 429. Abuse cannot run unbounded model calls.
- Remaining copy in the bar: `12 / 15 asks left`.
- After 15: input disables, “public cap reached”.

Counter lives in `.data/quota.json`. Today’s thread: `.data/thread-YYYY-MM-DD.json`. Both are gitignored; summaries are committed so the homepage demos without a seed if you skip the live fetch.

### Demo the 15-ask exhaust

```bash
# after seed + dev server
for i in $(seq 1 15); do
  curl -s -X POST http://127.0.0.1:43147/api/ask \
    -H 'Content-Type: application/json' \
    -d "{\"question\":\"What stands out? ($i)\"}" | head -c 200
  echo
done
# 16th should 429
```

Reset the prototype cap by deleting `.data/quota.json` (and optionally the thread file).

## Env

Copy `.env.example`. None are required for a working demo.

| Variable | Purpose |
| --- | --- |
| `CRON_SECRET` | Protects `/api/cron/generate` (required on Vercel) |
| `OPENAI_API_KEY` | Optional. Cheap LLM for the brief + asks |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `ASK_LIMIT` | Default `15` |
| `DATA_DIR` | Override storage directory |

## Cron

`vercel.json` fires **06:00 UTC** (`0 6 * * *`), which is **07:00 Europe/London during BST**. Vercel cron is UTC-only, so in GMT that is 06:00 London. Close enough for a lab PT.

Vercel sends `Authorization: Bearer $CRON_SECRET` automatically if `CRON_SECRET` is set in the project.

## Deploy (Vercel) and reeceatkinson.dev

1. Import this repo into Vercel (Hobby is fine).
2. Set `CRON_SECRET` (and `OPENAI_API_KEY` if you want live model calls).
3. Trigger a deploy, then run generate once:  
   `curl -X POST https://<deployment>/api/cron/generate -H "Authorization: Bearer $CRON_SECRET"`  
   or rely on the first cron. A committed seed summary ships so the page is never empty on day one.
4. **Domain:** attach **reeceatkinson.dev** (lab), not `.com` / `.sh`.  
   **Note:** `reeceatkinson.dev` currently **redirects to the `.com`**. In Vercel, add the domain on this project and **remove/disable the redirect** at the DNS or the other Vercel project that owns `.dev` → `.com`. Until that redirect is dropped, visitors never hit this app.
5. Filesystem writes on Vercel are **ephemeral** (`/var/task` is read-only; this app writes to `.data` locally). For a durable lab deploy, set `DATA_DIR=/tmp/hn-morning` as a stopgap (resets on cold instance) or later swap storage to Blob/KV. The committed seed summary is enough for a static first paint; quota/thread will reset between instances unless you add KV.

Cron + ask both use the Node.js runtime.

## Stack

Next.js App Router, TypeScript, Tailwind. No auth. No extra services.
