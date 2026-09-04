type Props = {
  question: string;
  answer?: string;
  pending?: boolean;
  error?: string | null;
};

export function FollowUpView({ question, answer, pending, error }: Props) {
  return (
    <main className="brief">
      <div className="wrap">
        <p className="kicker">Follow-up</p>
        <h2 className="headline question-display">{question}</h2>
        {pending ? (
          <p className="answer-pending">Reading today’s brief…</p>
        ) : error ? (
          <p className="ask-error">{error}</p>
        ) : (
          <p className="intro answer-body">{answer}</p>
        )}
      </div>
    </main>
  );
}
