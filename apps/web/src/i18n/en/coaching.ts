export const coachingCopy = {
  title: "Coaching notebook",
  description:
    "Small, evidence-based reflections from your own saved games. Check replays to understand the decisions behind the numbers.",
  strengths: "Patterns to build on",
  concerns: "Patterns to inspect",
  latest: "Latest saved day",
  evidence: "Saved evidence",
  summary: "AI reflection",
  followUp: "Ask about this review",
  notConfigured:
    "AI coaching is not configured. Your saved observations and earlier answers remain available.",
  empty: "Import your saved matches to start.",
  insufficient:
    "At least five valid samples in each same-hero comparison window are needed. More saved games can make a comparison possible.",
  noStrengths: "No supported positive comparison yet.",
  noConcerns: "No supported concern yet.",
  generate: "Generate AI reflection",
  generating: "Preparing a bounded reflection…",
  ask: "Ask about saved evidence",
  asking: "Checking saved evidence…",
  question: "Your question",
  questionHint:
    "Up to 500 characters. Free text selects a limited focus, comparison, replay, or causes question.",
  followUpDescription:
    "Answers use only your own saved review and its evidence. Save a match review first. They cannot reconstruct what happened in a fight.",
  noAnswer: "No saved answer yet. Choose a question when you are ready.",
  noSummary:
    "AI reflection is optional. Your saved observations above are ready to use.",
  needsReplay: "Causes and decisions need replay verification.",
  cached: "Showing previously loaded coaching. It could not be refreshed.",
  privacy:
    "Do not include names, contact details, account IDs, or other private information. Your original question is never stored or sent to AI.",
  import: "Import my matches",
  refresh: "Refresh saved observations",
  saved: "Saved",
  source: "Source question",
  limits:
    "Up to 10 coaching attempts per UTC day. Identical evidence questions reuse a saved answer.",
  samples: (n: number) => `${n} valid samples`,
  match: (id: string) => `Match ${id}`,
  day: (
    date: string,
    games: number,
    wins: number,
    losses: number,
    unknown: number,
  ) =>
    `${date} UTC · ${games} saved games · ${wins} wins · ${losses} losses${unknown ? ` · ${unknown} unknown outcomes` : ""}`,
  metrics: {
    result: "Result",
    duration: "Duration",
    kills: "Kills",
    deaths: "Deaths",
    assists: "Assists",
    goldPerMinute: "Gold per minute",
    experiencePerMinute: "Experience per minute",
    lastHits: "Last hits",
    denies: "Denies",
    level: "Level",
    netWorth: "Net worth",
    heroDamage: "Hero damage",
    heroHealing: "Hero healing",
    towerDamage: "Tower damage",
    teamGoldAdvantage: "Team gold advantage",
    teamExperienceAdvantage: "Team experience advantage",
  } as Record<string, string>,
};
export const usageCopy = {
  title: "My AI usage",
  description: "Your attempts and estimated usage for the current UTC day.",
  reviews: "Match reviews",
  drafts: "Hero suggestions",
  coaching: "Coaching",
  refresh: "Refresh my usage",
  loading: "Loading your usage…",
  unavailable:
    "AI generation is not configured. Your saved results and personal counters remain available.",
  estimate:
    "Costs are estimates based on settled usage and outstanding reservations, not an invoice. Failed requests can count as attempts. Reading a saved result does not start an AI request.",
  attempts: (used: number, total: number) => `${used} of ${total} attempts`,
  remaining: (n: number) => `${n} remaining`,
  cost: "Estimated cost",
  resets: (when: string) => `Daily attempts reset at ${when}.`,
  day: (day: string) => `UTC day: ${day}`,
  cached:
    "Showing previously loaded personal usage. It could not be refreshed.",
};
export const sessionCopy = {
  title: "Session reflection",
  description:
    "Look back at retained match summaries from your latest session or a UTC day. No AI request is needed.",
  scope:
    "Latest session groups saved games until a break longer than two hours after the preceding match. Missing imports can change the grouping.",
  latest: "Latest saved session",
  day: "UTC day",
  viewDay: "View day",
  loading: "Reading saved summaries…",
  refresh: "Refresh reflection",
  summary: "Saved session",
  games: "Saved games",
  results: "Known outcomes",
  duration: "Total match time",
  kills: "Average kills",
  deaths: "Average deaths",
  assists: "Average assists",
  reviewed: "Reviewed games",
  noted: "Games with notes",
  matches: "Matches in this reflection",
  coaching: "Open coaching notebook",
  optional: "AI reflection is an explicit choice in the coaching notebook.",
  empty:
    "No saved games in this selection. Import your own history or choose another UTC day.",
  import: "Import my matches",
  caveat:
    "These are retained match summaries. Missing values are excluded from averages. Team results and totals do not establish causes or personal impact.",
  cached: "Showing previously loaded reflection. It could not be refreshed.",
  outcomes: (wins: number, losses: number, unknown: number) =>
    `${wins} wins · ${losses} losses · ${unknown} unknown`,
};
