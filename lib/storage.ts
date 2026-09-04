import type { AskQuota, AskThread, DailySummary } from "./types";
import { londonDate } from "./london-date";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");

function summaryPath(date: string) {
  return path.join(DATA_DIR, `summary-${date}.json`);
}

function quotaPath() {
  return path.join(DATA_DIR, "quota.json");
}

function threadPath(date: string) {
  return path.join(DATA_DIR, `thread-${date}.json`);
}

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function writeAtomic(file: string, data: unknown) {
  await ensureDir();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

export async function saveSummary(summary: DailySummary): Promise<string> {
  const file = summaryPath(summary.date);
  await writeAtomic(file, summary);
  return file;
}

export async function loadSummary(date: string): Promise<DailySummary | null> {
  try {
    const raw = await readFile(summaryPath(date), "utf8");
    return JSON.parse(raw) as DailySummary;
  } catch {
    return null;
  }
}

export async function loadLatestSummary(): Promise<DailySummary | null> {
  const today = londonDate();
  const todaySummary = await loadSummary(today);
  if (todaySummary) return todaySummary;

  try {
    const names = await readdir(DATA_DIR);
    const dates = names
      .map((n) => n.match(/^summary-(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
      .filter((d): d is string => Boolean(d))
      .sort();
    const latest = dates.at(-1);
    if (!latest) return null;
    return loadSummary(latest);
  } catch {
    return null;
  }
}

export async function loadQuota(limit: number): Promise<AskQuota> {
  try {
    const raw = await readFile(quotaPath(), "utf8");
    const parsed = JSON.parse(raw) as AskQuota;
    return {
      used: Math.max(0, Number(parsed.used) || 0),
      limit,
    };
  } catch {
    return { used: 0, limit };
  }
}

export async function saveQuota(quota: AskQuota): Promise<void> {
  await writeAtomic(quotaPath(), quota);
}

export async function loadThread(date: string): Promise<AskThread> {
  try {
    const raw = await readFile(threadPath(date), "utf8");
    return JSON.parse(raw) as AskThread;
  } catch {
    return { date, messages: [] };
  }
}

export async function saveThread(thread: AskThread): Promise<void> {
  await writeAtomic(threadPath(thread.date), thread);
}

export function dataDir(): string {
  return DATA_DIR;
}
