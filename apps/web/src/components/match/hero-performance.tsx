import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { Link } from "react-router";
import type { RecentMatch } from "../../api/generated/models";
import {
  unavailable,
  copy,
  numberFormatter,
  percentageFormatter,
} from "../../i18n";
import { heroPerformance, historySearch } from "../../lib/match-history";
import { Card } from "../ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { ArrowUpRightIcon } from "../icons";
import { AssetImage } from "./asset-image";

export function HeroPerformance({
  matches,
  player,
  saved = false,
}: {
  matches: RecentMatch[];
  player: string;
  saved?: boolean;
}) {
  useLocale();
  const heroes = heroPerformance(matches);
  const title = saved ? copy.savedHistory.heroTitle : copy.history.heroTitle;
  const average = (value: number | null) =>
    value == null ? unavailable : numberFormatter.format(Math.round(value));
  return (
    <Card
      render={<section />}
      className="hero-performance mt-7 min-w-0 [&_.table-scroll]:relative [&_>_.field-hint]:max-w-195 max-[580px]:py-5.5 max-[580px]:px-3.5 max-[580px]:[&_.section-header]:mx-1 max-[580px]:[&_h2]:text-[20px]"
      aria-labelledby="hero-performance-heading"
    >
      <div
        className={
          "section-header flex items-center justify-between gap-3.5 mb-5 max-[580px]:[&_h2]:text-[19px]"
        }
      >
        <div>
          <h2 id="hero-performance-heading">{title}</h2>
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {saved
              ? copy.savedHistory.heroScope(matches.length)
              : copy.history.heroScope(matches.length)}
          </p>
        </div>
      </div>
      <p className="hero-scroll-hint field-hint hidden max-[580px]:block max-[580px]:mt-0 max-[580px]:mx-1 max-[580px]:mb-3 text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {copy.history.heroScrollHint}
      </p>
      <div
        className={
          "table-scroll w-full overflow-x-auto [scrollbar-color:var(--line-bright)_transparent] [scrollbar-width:thin]"
        }
        role="region"
        aria-label={title}
        tabIndex={0}
      >
        <Table
          className="hero-performance-table min-w-170 [&_th]:py-4 [&_th]:px-3.25 [&_th]:text-[13px] [&_td]:py-4 [&_td]:px-3.25 [&_td]:text-[13px] [&_thead_th]:text-[12px] [&_tbody_th]:[border-bottom:1px_solid_var(--line)] max-[580px]:[table-layout:fixed] max-[580px]:min-w-155 max-[580px]:[&_th:first-child]:w-45 max-[580px]:[&_th:first-child]:sticky max-[580px]:[&_th:first-child]:left-0 max-[580px]:[&_th:first-child]:bg-[var(--row-sticky)] max-[580px]:[&_th:first-child]:z-[1] max-[580px]:[&_thead_th:first-child]:z-[2]"
          aria-label={title}
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{copy.home.hero}</TableHead>
              <TableHead scope="col">{copy.history.games}</TableHead>
              <TableHead scope="col">{copy.history.recordTitle}</TableHead>
              <TableHead scope="col">{copy.history.winRate}</TableHead>
              <TableHead scope="col">{copy.history.averageGpm}</TableHead>
              <TableHead scope="col">{copy.history.averageXpm}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {heroes.map((hero) => (
              <TableRow key={hero.heroId}>
                <TableHead scope="row">
                  <Link
                    className={
                      "hero-name hero-history-link flex gap-3 items-center text-foreground text-[13px] [&_strong]:block [&_strong]:[font-weight:550] [&_small]:block [&_small]:text-[var(--faint)] [&_small]:text-[11px] [&_small]:mt-1.5 w-[fit-content] min-h-9 [&_strong]:text-[14px] max-[580px]:max-w-38.5 max-[580px]:gap-2 max-[580px]:[&_.hero-portrait]:w-10 max-[580px]:[&_.hero-portrait]:h-6 max-[580px]:[&_strong]:min-w-0 max-[580px]:[&_strong]:whitespace-normal max-[580px]:[&_strong]:text-[13px] max-[580px]:[&_svg]:w-3.5 max-[580px]:[&_svg]:h-3.5"
                    }
                    aria-label={copy.history.heroAction(serviceText(hero.hero))}
                    to={`/?${historySearch(player, { hero: "", heroId: hero.heroId, result: "all", sort: "newest" })}#recent-matches`}
                    onClick={(event) => {
                      if (
                        event.button === 0 &&
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !event.altKey
                      )
                        document.getElementById("recent-matches")?.focus();
                    }}
                  >
                    <AssetImage
                      src={hero.heroImage}
                      fallback={hero.hero.slice(0, 2)}
                      className={
                        "hero-portrait w-16 h-9 border border-border rounded-[5px]"
                      }
                    />
                    <strong>{serviceText(hero.hero)}</strong>
                    <ArrowUpRightIcon size={15} aria-hidden="true" />
                  </Link>
                </TableHead>
                <TableCell>{numberFormatter.format(hero.total)}</TableCell>
                <TableCell>
                  <span className="sr-only">
                    {copy.history.recordLabel(
                      hero.wins,
                      hero.losses,
                      hero.unknown,
                    )}
                  </span>
                  <span aria-hidden="true">
                    {copy.history.record(hero.wins, hero.losses)}
                  </span>
                  {hero.unknown ? (
                    <small
                      className={
                        "hero-unknown block mt-1.25 text-[10px] text-[var(--faint)] max-[580px]:whitespace-normal"
                      }
                    >
                      {copy.history.unknownResults(hero.unknown)}
                    </small>
                  ) : null}
                </TableCell>
                <TableCell>
                  {hero.winRate == null
                    ? unavailable
                    : percentageFormatter.format(hero.winRate)}
                </TableCell>
                <TableCell>{average(hero.goldPerMinute)}</TableCell>
                <TableCell>{average(hero.experiencePerMinute)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {copy.history.heroHint}
      </p>
    </Card>
  );
}
