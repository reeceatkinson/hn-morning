# HN Morning

Public prototype for a daily Hacker News morning brief, with a site-wide cap of **15** follow-up asks. ClickUp REECE-1085. Host target: **reeceatkinson.dev** (lab).

Unauthenticated. No accounts.

## Run locally

```bash
npm install
npm run seed          # fetch HN top ~30, write today's brief to .data/
npm run dev           # http://127.0.0.1:43147
```
