"use client";

import { AskBar } from "../ask-bar";
import { FollowUpView } from "../follow-up-view";
import { SiteHeader } from "../site-header";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AskMessage } from "@/lib/types";

type AskResponse = {
  ok: boolean;
  used?: number;
  remaining?: number;
  limit?: number;
  message?: AskMessage | string;
  error?: string;
};

const LIMIT_FALLBACK = 15;
const postedTokens = new Set<string>();

export function AskingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("t") ?? "";

  const [question, setQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(LIMIT_FALLBACK);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!token) return;
    const key = `hn-morning-ask:${token}`;
    const q = sessionStorage.getItem(key);
    if (!q) {
      setMissing(true);
      return;
    }
    setQuestion(q);
    if (postedTokens.has(token)) return;
    postedTokens.add(token);

    void (async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        const data = (await res.json()) as AskResponse;
        if (typeof data.used === "number") setUsed(data.used);
        if (typeof data.limit === "number") setLimit(data.limit);
        if (!data.ok || !data.message || typeof data.message === "string") {
          postedTokens.delete(token);
          setError(
            typeof data.message === "string"
              ? data.message
              : "Follow-up failed. Try again if any asks remain.",
          );
          return;
        }
        sessionStorage.removeItem(key);
        router.replace(`/ask/${data.message.id}`);
      } catch {
        postedTokens.delete(token);
        setError("Network error — the ask was not recorded.");
      }
    })();
  }, [router, token]);

  if (missing) {
    return (
      <>
        <SiteHeader dateLine="Today" used={used} limit={limit} backHref="/" kicker="Today’s brief" />
        <main className="brief">
          <div className="wrap">
            <p className="empty">That follow-up is no longer in this session. Ask again from the brief.</p>
          </div>
        </main>
      </>
    );
  }

  if (!question) {
    return (
      <>
        <SiteHeader dateLine="Today" used={used} limit={limit} backHref="/" kicker="Today’s brief" />
        <main className="brief">
          <div className="wrap">
            <p className="answer-pending">Opening your question…</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader
        dateLine="Today"
        used={used}
        limit={limit}
        backHref="/"
        kicker="Today’s brief"
      />
      <FollowUpView question={question} pending={!error} error={error} />
      <footer className="site-foot">
        <div className="wrap">One question, one page.</div>
      </footer>
      {error ? <AskBar initialUsed={used} limit={limit} /> : null}
    </>
  );
}
