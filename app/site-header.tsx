import Link from "next/link";
import { QuotaPill } from "./quota-pill";

type Props = {
  dateLine: string;
  used: number;
  limit: number;
  stale?: boolean;
  kicker?: string;
  backHref?: string;
};

export function SiteHeader({
  dateLine,
  used,
  limit,
  stale = false,
  kicker = "Hacker News",
  backHref,
}: Props) {
  return (
    <header className="masthead">
      <div className="wrap masthead-row">
        <div>
          <p className="kicker">
            {backHref ? <Link href={backHref}>{kicker}</Link> : kicker}
          </p>
          <p className="wordmark">
            <Link href="/">HN Morning</Link>
          </p>
          <p className="date-line">
            {dateLine}
            {stale ? <span className="pill stale">Latest on file</span> : null}
          </p>
        </div>
        <div className="masthead-pills">
          <QuotaPill used={used} limit={limit} />
        </div>
      </div>
    </header>
  );
}
