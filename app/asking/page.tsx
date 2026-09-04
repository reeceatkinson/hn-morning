import { AskingClient } from "./asking-client";
import { Suspense } from "react";

export default function AskingPage() {
  return (
    <Suspense
      fallback={
        <main className="brief">
          <div className="wrap">
            <p className="answer-pending">Opening your question…</p>
          </div>
        </main>
      }
    >
      <AskingClient />
    </Suspense>
  );
}
