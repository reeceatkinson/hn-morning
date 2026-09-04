export type HnStory = {
  id: number;
  title: string;
  url: string | null;
  hnUrl: string;
  score: number;
  comments: number;
  by: string;
  domain: string | null;
  text: string | null;
};

export type BriefStory = HnStory & {
  blurb: string;
};

export type DailySummary = {
  date: string;
  generatedAt: string;
  timezone: "Europe/London";
  mode: "llm" | "extractive";
  headline: string;
  intro: string;
  themes: string[];
  stories: BriefStory[];
};

export type AskMessage = {
  id: string;
  at: string;
  date: string;
  question: string;
  answer: string;
  source: "llm" | "mock";
};

export type AskQuota = {
  used: number;
  limit: number;
};

export type AskThread = {
  date: string;
  messages: AskMessage[];
};
