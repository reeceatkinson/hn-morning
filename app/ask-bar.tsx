"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QuotaPill } from "./quota-pill";

type Props = {
  initialUsed: number;
  limit: number;
};

export function AskBar({ initialUsed, limit }: Props) {
  const router = useRouter();
  const [used] = useState(initialUsed);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;
  const disabled = pending || exhausted;

  const hint = useMemo(() => {
    if (exhausted) return "Public follow-ups are exhausted for today.";
    if (pending) return "Opening your question…";
    return "Ask about today’s brief. Site-wide cap — not per person.";
  }, [exhausted, pending]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || disabled) return;
    setPending(true);
    setError(null);
    try {
      const token = crypto.randomUUID();
      sessionStorage.setItem(`hn-morning-ask:${token}`, q);
      router.push(`/asking?t=${token}`);
    } catch {
      setPending(false);
      setError("Couldn’t open the follow-up page.");
    }
  }

  return (
    <section className="ask-dock" aria-label="Follow-ups">
      <div className="ask-inner">
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
          <div className="ask-meta" aria-live="polite">
            <QuotaPill used={used} limit={limit} />
            <p className="hint">{hint}</p>
          </div>
        </form>
        {error ? <p className="ask-error">{error}</p> : null}
      </div>
    </section>
  );
}
