import { AskBar } from "./ask-bar";
import { SiteHeader } from "./site-header";
import { askLimit, readQuotaSnapshot } from "@/lib/asks";
import { formatLondonLong, londonDate } from "@/lib/london-date";
import { loadLatestSummary } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const today = londonDate();
  const [summary, quota] = await Promise.all([
    loadLatestSummary(),
    readQuotaSnapshot(),
  ]);
  const stale = Boolean(summary && summary.date !== today);
  const limit = askLimit();

  return (
    <>
      <SiteHeader
        dateLine={formatLondonLong(summary?.date ?? today)}
        used={quota.used}
        limit={limit}
        stale={stale}
      />

      <main className="brief">
        <div className="wrap">
          {!summary ? (
            <p className="empty">
              No brief on file yet. Run <code>npm run seed</code> or wait for
              the 07:00 Europe/London cron.
            </p>
          ) : (
            <>
              <h2 className="headline">{summary.headline}</h2>
              <p className="intro">{summary.intro}</p>
              {summary.themes.length > 0 ? (
                <ul className="themes">
                  {summary.themes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
              {summary.stories.map((story) => (
                <article key={story.id} className="story">
                  <h2>
                    <a href={story.url ?? story.hnUrl} rel="noreferrer">
                      {story.title}
                    </a>
                  </h2>
                  <p className="meta">
                    <span className="chip">{story.score} pts</span>
                    <span className="chip">{story.comments} comments</span>
                    <span className="chip">{story.by}</span>
                    {story.domain ? (
                      <span className="chip">{story.domain}</span>
                    ) : null}
                  </p>
                  <p className="blurb">{story.blurb}</p>
                  <p className="links">
                    {story.url ? (
                      <a href={story.url} rel="noreferrer">
                        Article
                      </a>
                    ) : null}
                    <a href={story.hnUrl} rel="noreferrer">
                      HN thread
                    </a>
                  </p>
                </article>
              ))}
            </>
          )}
        </div>
      </main>

      <footer className="site-foot">
        <div className="wrap">Seeded from the public HN Firebase API.</div>
      </footer>

      <AskBar initialUsed={quota.used} limit={limit} />
    </>
  );
}
