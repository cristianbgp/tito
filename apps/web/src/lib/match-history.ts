import type { RecentMatch } from "../api/generated/models";

export type HistoryFilters = {
  hero: string;
  heroId?: number;
  queue?: "ranked" | "normal" | "other" | "unknown";
  gameMode?: number | "all-pick" | "unknown";
  result: "all" | "win" | "loss" | "unknown";
  sort: "newest" | "oldest" | "longest" | "shortest";
};
export const defaultHistoryFilters: HistoryFilters = {
  hero: "",
  result: "all",
  sort: "newest",
};

export function readHistoryFilters(params: URLSearchParams): HistoryFilters {
  const raw = (params.get("hero") ?? "").slice(0, 80);
  const result = params.get("result");
  const sort = params.get("sort");
  const queue = params.get("queue");
  const mode = params.get("gameMode") ?? "";
  const gameMode =
    mode === "all-pick" || mode === "unknown"
      ? mode
      : /^[1-9]\d{0,3}$/.test(mode)
        ? Number(mode)
        : undefined;
  const rawId = params.get("heroId") ?? "";
  const heroId = /^[1-9]\d{0,8}$/.test(rawId) ? Number(rawId) : undefined;
  return {
    hero: heroId ? "" : raw.trim() ? raw : "",
    ...(heroId ? { heroId } : {}),
    ...(queue === "ranked" ||
    queue === "normal" ||
    queue === "other" ||
    queue === "unknown"
      ? { queue }
      : {}),
    ...(gameMode != null ? { gameMode } : {}),
    result:
      result === "win" || result === "loss" || result === "unknown"
        ? result
        : "all",
    sort:
      sort === "oldest" || sort === "longest" || sort === "shortest"
        ? sort
        : "newest",
  };
}

export function historySearch(
  accountId: string,
  filters: HistoryFilters = defaultHistoryFilters,
) {
  const params = new URLSearchParams();
  if (accountId) params.set("player", accountId);
  if (filters.heroId) params.set("heroId", String(filters.heroId));
  else if (filters.hero.trim()) params.set("hero", filters.hero.slice(0, 80));
  if (filters.result !== "all") params.set("result", filters.result);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.queue) params.set("queue", filters.queue);
  if (filters.gameMode != null)
    params.set("gameMode", String(filters.gameMode));
  return params.toString();
}

export function filterHistory(
  matches: readonly RecentMatch[],
  filters: HistoryFilters,
) {
  const query = filters.hero.trim().toLowerCase();
  const visible = matches.filter(
    (match) =>
      (filters.heroId
        ? match.heroId === filters.heroId
        : !query ||
          match.hero.toLowerCase().includes(query) ||
          match.id.includes(query)) &&
      (filters.result === "all" ||
        (filters.result === "unknown"
          ? match.result == null
          : match.result === filters.result)) &&
      (!filters.queue ||
        (filters.queue === "unknown"
          ? match.lobbyType == null
          : filters.queue === "ranked"
            ? [5, 6, 7].includes(match.lobbyType ?? -1)
            : filters.queue === "normal"
              ? match.lobbyType === 0
              : match.lobbyType != null &&
                ![0, 5, 6, 7].includes(match.lobbyType))) &&
      (filters.gameMode == null ||
        (filters.gameMode === "unknown"
          ? match.gameMode == null || match.gameMode === 0
          : filters.gameMode === "all-pick"
            ? match.gameMode === 1 || match.gameMode === 22
            : match.gameMode === filters.gameMode)),
  );
  return visible.sort((a, b) => {
    if (filters.sort === "oldest") return a.startedAt - b.startedAt;
    if (filters.sort === "longest")
      return b.duration - a.duration || b.startedAt - a.startedAt;
    if (filters.sort === "shortest")
      return a.duration - b.duration || b.startedAt - a.startedAt;
    return b.startedAt - a.startedAt;
  });
}

export function summarizeHistory(matches: readonly RecentMatch[]) {
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  return {
    total: matches.length,
    wins,
    losses,
    unknown: matches.length - wins - losses,
    winRate: wins + losses ? wins / (wins + losses) : null,
  };
}

export function heroPerformance(matches: readonly RecentMatch[]) {
  const groups = new Map<number, RecentMatch[]>();
  for (const match of matches) {
    const group = groups.get(match.heroId) ?? [];
    group.push(match);
    groups.set(match.heroId, group);
  }
  const average = (
    group: RecentMatch[],
    key: "goldPerMinute" | "experiencePerMinute",
  ) => {
    const values = group
      .map((match) => match[key])
      .filter((value): value is number => value != null);
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  };
  return [...groups]
    .map(([heroId, group]) => {
      const latest = group.reduce((a, b) =>
        a.startedAt >= b.startedAt ? a : b,
      );
      return {
        heroId,
        hero: latest.hero,
        heroImage: latest.heroImage,
        lastPlayed: latest.startedAt,
        ...summarizeHistory(group),
        goldPerMinute: average(group, "goldPerMinute"),
        experiencePerMinute: average(group, "experiencePerMinute"),
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total || b.lastPlayed - a.lastPlayed || a.heroId - b.heroId,
    );
}
