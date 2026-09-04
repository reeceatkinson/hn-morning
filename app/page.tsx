import { AskPanel } from "./ask-panel";
import { askLimit, loadTodayThread, readQuotaSnapshot } from "@/lib/asks";
import { formatLondonLong, londonDate } from "@/lib/london-date";
import { loadLatestSummary } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const today = londonDate();
  const [summary, quota, thread] = await Promise.all([
    loadLatestSummary(),
    readQuotaSnapshot(),
    loadTodayThread(today),
  ]);
  const stale = summary && summary.date !== today;

  return (
    <>
      <header className="masthead">
        <div className="wrap masthead-row">
          <div>
            <p className="kicker">Hacker News · morning cut</p>
            <h1>HN Morning</h1>
            <p className="date-line">
              {summary ? formatLondonLong(summary.date) : formatLondonLong(today)}
              {stale ? (
                <span className="stale">Showing latest on file</span>
              ) : null}
            </p>
          </div>
          <p className="proto">Prototype · reeceatkinson.dev</p>
        </div>
      </header>

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
                    {story.score} points · {story.comments} comments · {story.by}
                    {story.domain ? ` · ${story.domain}` : ""}
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

      <AskPanel
        initialMessages={thread.messages}
        initialUsed={quota.used}
        limit={askLimit()}
      />
    </>
  );
}
