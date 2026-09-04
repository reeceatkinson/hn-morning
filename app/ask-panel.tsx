"use client";

import { useMemo, useState } from "react";
import type { AskMessage } from "@/lib/types";

type Props = {
  initialMessages: AskMessage[];
  initialUsed: number;
  limit: number;
};

type AskResponse = {
  ok: boolean;
  used?: number;
  remaining?: number;
  limit?: number;
  message?: AskMessage | string;
  error?: string;
};

export function AskPanel({ initialMessages, initialUsed, limit }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [used, setUsed] = useState(initialUsed);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;
  const disabled = pending || exhausted;

  const hint = useMemo(() => {
    if (exhausted) return `${used} / ${limit} asks used · public cap reached`;
    return `${remaining} / ${limit} asks left`;
  }, [exhausted, remaining, used, limit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || disabled) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = (await res.json()) as AskResponse;
      if (typeof data.used === "number") setUsed(data.used);
      if (!data.ok || !data.message || typeof data.message === "string") {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Follow-up failed. Try again if any asks remain.",
        );
        return;
      }
      setMessages((prev) => [...prev, data.message as AskMessage]);
      setQuestion("");
    } catch {
      setError("Network error — the ask was not recorded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ask-dock" aria-label="Follow-ups">
      <div className="ask-inner">
      {messages.length > 0 ? (
        <ol className="thread">
          {messages.map((m) => (
            <li key={m.id} className="turn">
              <p className="q">
                <span className="who">You</span>
                {m.question}
              </p>
              <p className="a">
                <span className="who">Brief</span>
                {m.answer}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="thread-empty">
          Ask a follow-up about today’s brief. Site-wide cap of {limit} — not per
          person.
        </p>
      )}

      <form onSubmit={onSubmit} className="ask-bar">
        <label htmlFor="ask-input" className="sr-only">
          Ask about today’s brief
        </label>
        <input
          id="ask-input"
          type="text"
          maxLength={500}
          placeholder={
            exhausted
              ? "Public follow-ups are exhausted"
              : "Ask about today’s brief…"
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <button type="submit" disabled={disabled || !question.trim()}>
          {pending ? "…" : "Ask"}
        </button>
        <p className="ask-meta" aria-live="polite">
          {pending ? "Answering…" : hint}
        </p>
      </form>
      {error ? <p className="ask-error">{error}</p> : null}
      </div>
    </section>
  );
}
