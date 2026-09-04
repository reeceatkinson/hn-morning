import { generateDailySummary } from "../lib/summarize";

async function main() {
  const { summary, file } = await generateDailySummary();
  console.log(`Wrote ${file}`);
  console.log(`date=${summary.date} mode=${summary.mode} stories=${summary.stories.length}`);
  console.log(summary.headline);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
