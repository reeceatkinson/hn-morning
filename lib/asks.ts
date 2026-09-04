import { randomUUID } from "node:crypto";
import type { AskMessage, AskQuota, AskThread } from "./types";
import { londonDate } from "./london-date";
import { loadQuota, loadThread, saveQuota, saveThread } from "./storage";

export const DEFAULT_ASK_LIMIT = 15;

export function askLimit(): number {
  const n = Number(process.env.ASK_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_ASK_LIMIT;
}

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export type ReserveResult =
  | { ok: true; quota: AskQuota; remaining: number }
  | { ok: false; quota: AskQuota; remaining: 0 };

/** Atomically reserve one of the site-wide 15 asks. Call before any LLM work. */
export function reserveAsk(): Promise<ReserveResult> {
  return withLock(async () => {
    const limit = askLimit();
    const quota = await loadQuota(limit);
    if (quota.used >= limit) {
      return { ok: false, quota: { used: quota.used, limit }, remaining: 0 };
    }
    const next: AskQuota = { used: quota.used + 1, limit };
    await saveQuota(next);
    return { ok: true, quota: next, remaining: next.limit - next.used };
  });
}

export function readQuotaSnapshot(): Promise<AskQuota> {
  return withLock(async () => loadQuota(askLimit()));
}

export function appendMessage(
  date: string,
  message: Omit<AskMessage, "id" | "at" | "date">,
): Promise<AskMessage> {
  return withLock(async () => {
    const thread = await loadThread(date);
    const full: AskMessage = {
      id: randomUUID(),
      at: new Date().toISOString(),
      date,
      question: message.question,
      answer: message.answer,
      source: message.source,
    };
    const next: AskThread = {
      date,
      messages: [...thread.messages, full],
    };
    await saveThread(next);
    return full;
  });
}

export async function loadTodayThread(date: string): Promise<AskThread> {
  return loadThread(date);
}

export async function findMessage(id: string): Promise<AskMessage | null> {
  const thread = await loadThread(londonDate());
  return thread.messages.find((m) => m.id === id) ?? null;
}
