const LONDON = "Europe/London";

export function londonDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function formatLondonLong(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc);
}
