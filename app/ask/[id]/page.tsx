import { AskBar } from "../../ask-bar";
import { FollowUpView } from "../../follow-up-view";
import { SiteHeader } from "../../site-header";
import { askLimit, findMessage, readQuotaSnapshot } from "@/lib/asks";
import { formatLondonLong } from "@/lib/london-date";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AskPage({ params }: Props) {
  const { id } = await params;
  const [message, quota] = await Promise.all([
    findMessage(id),
    readQuotaSnapshot(),
  ]);
  if (!message) notFound();
  const limit = askLimit();

  return (
    <>
      <SiteHeader
        dateLine={formatLondonLong(message.date)}
        used={quota.used}
        limit={limit}
        backHref="/"
        kicker="Today’s brief"
      />
      <FollowUpView question={message.question} answer={message.answer} />
      <footer className="site-foot">
        <div className="wrap">One question, one page.</div>
      </footer>
      <AskBar initialUsed={quota.used} limit={limit} />
    </>
  );
}
