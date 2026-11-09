import { useLocale } from "../../i18n/react";
import { SelectField } from "../ui/select-field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { unavailable, copy, percentageFormatter } from "../../i18n";
import {
  defaultHistoryFilters,
  summarizeHistory,
  type HistoryFilters,
} from "../../lib/match-history";
import type { RecentMatch } from "../../api/generated/models";

export function MatchHistoryControls({
  filters,
  shown,
  matches,
  total,
  onChange,
  selectedHero,
  saved = false,
}: {
  filters: HistoryFilters;
  shown: RecentMatch[];
  matches: RecentMatch[];
  total: number;
  onChange: (filters: HistoryFilters) => void;
  selectedHero?: string;
  saved?: boolean;
}) {
  useLocale();
  const summary = summarizeHistory(shown);
  const results = [
    { value: "all", label: copy.history.allResults },
    { value: "win", label: copy.home.win },
    { value: "loss", label: copy.home.loss },
    { value: "unknown", label: copy.home.unknown },
  ];
  const sorts = [
    { value: "newest", label: copy.history.newest },
    { value: "oldest", label: copy.history.oldest },
    { value: "longest", label: copy.history.longest },
    { value: "shortest", label: copy.history.shortest },
  ];
  const queues = [
    { value: "all", label: copy.history.allQueues },
    { value: "ranked", label: copy.history.ranked },
    { value: "normal", label: copy.history.normalQueue },
    { value: "other", label: copy.history.otherQueues },
    { value: "unknown", label: copy.history.unknownQueue },
  ];
  const modeIds = [
    ...new Set([
      23,
      4,
      2,
      3,
      5,
      18,
      ...matches
        .map((m) => m.gameMode)
        .filter(
          (id): id is number => id != null && id > 0 && id !== 1 && id !== 22,
        ),
      ...(typeof filters.gameMode === "number" ? [filters.gameMode] : []),
    ]),
  ];
  const modes = [
    { value: "all", label: copy.history.allModes },
    { value: "all-pick", label: copy.match.gameModes[1] },
    ...modeIds.map((id) => ({
      value: String(id),
      label: copy.match.gameModes[id] ?? copy.match.unknownMode(id),
    })),
    { value: "unknown", label: copy.history.unknownMode },
  ];
  const active =
    filters.hero.trim() ||
    filters.heroId ||
    filters.queue ||
    filters.gameMode != null ||
    filters.result !== "all" ||
    filters.sort !== "newest";
  return (
    <div className="history-tools min-w-0 mt-0.5 mx-2 mb-2.5 max-[580px]:mx-1">
      <div
        className="history-controls [&_[data-slot=select-trigger]]:min-h-12 [&_[data-slot=select-trigger]]:py-2.75 [&_[data-slot=select-trigger]]:px-3 [&_[data-slot=select-trigger]]:text-[14px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2.5 [&_label]:mb-0 [&_label]:text-[12px] [&_label]:text-muted-foreground [&_>_div:first-child]:col-[1_/_-1] [&_input]:min-h-12 [&_input]:py-2.75 [&_input]:px-3 [&_input]:text-[14px] max-[580px]:grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)] max-[580px]:[&_>_div:first-child]:col-[1/-1] max-[580px]:[&_input]:text-[16px] max-[580px]:[&_input]:min-h-12 max-[580px]:[&_[data-slot=select-trigger]]:text-[16px] max-[580px]:[&_[data-slot=select-trigger]]:min-h-12 max-[380px]:grid-cols-[minmax(0,_1fr)] max-[380px]:[&_>_div:first-child]:col-[auto]"
        role="group"
        aria-label={saved ? copy.savedHistory.title : copy.home.recent}
      >
        <SelectField>
          <Label htmlFor="history-search">{copy.history.search}</Label>
          <Input
            id="history-search"
            type="search"
            autoComplete="off"
            maxLength={80}
            value={
              filters.heroId
                ? (selectedHero ?? copy.history.heroIdentity(filters.heroId))
                : filters.hero
            }
            placeholder={copy.history.searchPlaceholder}
            onChange={(event) =>
              onChange({
                ...filters,
                heroId: undefined,
                hero: event.target.value,
              })
            }
          />
        </SelectField>
        <SelectField>
          <Label htmlFor="history-queue">{copy.history.queue}</Label>
          <Select
            items={queues}
            value={filters.queue ?? "all"}
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "ranked" ||
                value === "normal" ||
                value === "other" ||
                value === "unknown"
              )
                onChange({
                  ...filters,
                  queue: value === "all" ? undefined : value,
                });
            }}
          >
            <SelectTrigger id="history-queue">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {queues.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectField>
        <SelectField>
          <Label htmlFor="history-mode">{copy.history.gameMode}</Label>
          <Select
            items={modes}
            value={String(filters.gameMode ?? "all")}
            onValueChange={(value) => {
              if (value != null && modes.some((item) => item.value === value))
                onChange({
                  ...filters,
                  gameMode:
                    value === "all"
                      ? undefined
                      : value === "all-pick" || value === "unknown"
                        ? value
                        : Number(value),
                });
            }}
          >
            <SelectTrigger id="history-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {modes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectField>
        <SelectField>
          <Label htmlFor="history-result">{copy.history.result}</Label>
          <Select
            items={results}
            value={filters.result}
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "win" ||
                value === "loss" ||
                value === "unknown"
              )
                onChange({ ...filters, result: value });
            }}
          >
            <SelectTrigger id="history-result">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {results.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectField>
        <SelectField>
          <Label htmlFor="history-sort">{copy.history.sort}</Label>
          <Select
            items={sorts}
            value={filters.sort}
            onValueChange={(value) => {
              if (
                value === "newest" ||
                value === "oldest" ||
                value === "longest" ||
                value === "shortest"
              )
                onChange({ ...filters, sort: value });
            }}
          >
            <SelectTrigger id="history-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {sorts.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SelectField>
      </div>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {copy.history.typeHint}
      </p>
      {saved &&
      matches.some(
        (match) =>
          match.lobbyType == null ||
          match.gameMode == null ||
          match.gameMode === 0,
      ) ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {copy.history.missingTypes}
        </p>
      ) : null}
      <div
        className={
          "history-summary-row flex flex-wrap items-center justify-between gap-2 mt-3 max-[580px]:items-start"
        }
      >
        <p
          className="history-summary flex flex-wrap [align-items:baseline] gap-[6px_14px] m-0 text-[11px] leading-[1.7] text-muted-foreground [&_strong]:text-foreground [&_strong]:[font-weight:550] max-[580px]:max-w-[calc(100%_-_76px)] max-[580px]:text-[11px]"
          role="status"
          aria-atomic="true"
        >
          <span>
            {saved
              ? copy.savedHistory.showing(summary.total, total)
              : copy.history.showing(summary.total, total)}
          </span>
          <span
            title={copy.history.recordLabel(
              summary.wins,
              summary.losses,
              summary.unknown,
            )}
          >
            {copy.history.record(summary.wins, summary.losses)}
          </span>
          <span title={copy.history.summaryHint}>
            {copy.history.winRate}{" "}
            <strong>
              {summary.winRate == null
                ? unavailable
                : percentageFormatter.format(summary.winRate)}
            </strong>
          </span>
          {summary.unknown ? (
            <span>{copy.history.unknownResults(summary.unknown)}</span>
          ) : null}
        </p>
        <Button
          variant="ghost"
          className={"history-reset shrink-0 min-h-8 text-[11px]"}
          disabled={!active}
          onClick={() => onChange({ ...defaultHistoryFilters })}
        >
          {copy.history.reset}
        </Button>
      </div>
    </div>
  );
}
