import { useLocale } from "../../i18n/react";
import { useId } from "react";
import type { PlayerProgress } from "../../api/generated/models";
import {
  unavailable,
  copy,
  progressDateFormatter as progressDate,
  averageFormatter as average,
  numberFormatter,
  percentageFormatter,
} from "../../i18n";
import { Card } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export { progressDate };

export function WeeklyResults({ weeks }: { weeks: PlayerProgress["weeks"] }) {
  useLocale();
  const id = useId();
  const maximum = Math.max(1, ...weeks.map((week) => week.stats.games));
  const statistic = (
    metric: { value: number | null; samples: number },
    percent = false,
  ) => (
    <span
      className={
        "progress-week-statistic inline-grid gap-1.25 [&_small]:text-[10px] [&_small]:text-muted-foreground [&_small]:whitespace-nowrap"
      }
    >
      <span>
        {metric.value == null
          ? unavailable
          : percent
            ? percentageFormatter.format(metric.value)
            : average.format(metric.value)}
      </span>
      <small>
        {copy.progress.validSamples(numberFormatter.format(metric.samples))}
      </small>
    </span>
  );
  return (
    <Card
      render={<section />}
      className="progress-weekly mt-6 min-w-0 [&_.section-header_.field-hint]:mt-2.5 [&_.section-header_.field-hint]:max-w-[72ch]"
      aria-labelledby={`${id}-title`}
    >
      <div
        className={
          "section-header flex items-center justify-between gap-3.5 mb-5 max-[580px]:[&_h2]:text-[19px]"
        }
      >
        <div>
          <h2 id={`${id}-title`}>{copy.progress.weeklyTitle}</h2>
          <p
            className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
            id={`${id}-note`}
          >
            {copy.progress.weeklyHint}
          </p>
        </div>
      </div>
      <div
        className={
          "progress-legend flex flex-wrap gap-[10px_18px] text-[12px] text-muted-foreground [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-1.75 [&_i]:block [&_i]:w-2 [&_i]:h-2 [&_i]:rounded-[2px]"
        }
        aria-hidden="true"
      >
        <span>
          <i className={"progress-win bg-[var(--success)]"} />
          {copy.home.win}
        </span>
        <span>
          <i className={"progress-loss bg-[var(--danger)]"} />
          {copy.home.loss}
        </span>
        <span>
          <i className={"progress-unknown bg-[var(--faint)]"} />
          {copy.home.unknown}
        </span>
      </div>
      <div
        className="progress-bars grid grid-cols-[repeat(8,_minmax(0,_1fr))] gap-4.5 pt-7 px-1 pb-0 max-[580px]:gap-1.5 max-[580px]:px-0"
        role="img"
        aria-label={copy.progress.chartLabel}
        aria-describedby={`${id}-note`}
      >
        {weeks.map((week) => (
          <div
            className={
              "progress-week grid gap-2.5 [justify-items:center] min-w-0 [&_>_span]:text-[11px] [&_>_span]:text-muted-foreground [&_>_span]:text-center [&_>_.progress-week-count]:text-[12px] [&_>_.progress-week-count]:text-foreground [&_>_.progress-week-count]:tabular-nums max-[580px]:[&_>_span]:text-[10px]"
            }
            key={week.from}
            aria-hidden="true"
            title={copy.progress.weekTooltip(
              progressDate.format(new Date(week.from)),
              numberFormatter.format(week.stats.wins),
              numberFormatter.format(week.stats.losses),
              numberFormatter.format(week.stats.unknown),
            )}
          >
            <span className="progress-week-count">
              {numberFormatter.format(week.stats.games)}
            </span>
            <div
              className={
                "progress-stack flex flex-col justify-end h-47.5 w-full max-w-16 [border-bottom:1px_solid_var(--line)] rounded-[7px_7px_0_0] overflow-hidden [&_>_span]:block [&_>_span]:flex-[none] max-[580px]:h-35"
              }
            >
              <span
                className={"progress-unknown bg-[var(--faint)]"}
                style={{ height: `${(100 * week.stats.unknown) / maximum}%` }}
              />
              <span
                className={"progress-loss bg-[var(--danger)]"}
                style={{ height: `${(100 * week.stats.losses) / maximum}%` }}
              />
              <span
                className={"progress-win bg-[var(--success)]"}
                style={{ height: `${(100 * week.stats.wins) / maximum}%` }}
              />
            </div>
            <span>{progressDate.format(new Date(week.from))}</span>
          </div>
        ))}
      </div>
      <Collapsible className="progress-numbers mt-5 [&_>_[data-slot=collapsible-trigger]]:inline-flex [&_>_[data-slot=collapsible-trigger]]:items-center [&_>_[data-slot=collapsible-trigger]]:gap-2 [&_>_[data-slot=collapsible-trigger]]:min-h-10 [&_>_[data-slot=collapsible-trigger]]:py-1.5 [&_>_[data-slot=collapsible-trigger]]:px-0 [&_>_[data-slot=collapsible-trigger]]:cursor-pointer [&_>_[data-slot=collapsible-trigger]]:text-muted-foreground [&_>_[data-slot=collapsible-trigger]]:text-[12px] [&_.table-scroll]:mt-3.5">
        <CollapsibleTrigger>{copy.progress.numbers}</CollapsibleTrigger>
        <CollapsibleContent>
          <div
            className={
              "table-scroll w-full overflow-x-auto [scrollbar-color:var(--line-bright)_transparent] [scrollbar-width:thin]"
            }
            tabIndex={0}
            role="region"
            aria-label={copy.progress.table}
          >
            <Table
              className={
                "progress-week-table min-w-190 text-[13px] [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:min-w-27.5 [&_th:first-child]:bg-[var(--row-sticky)] [&_th:first-child]:z-[1] [&_th_small]:block [&_th_small]:text-[10px] [&_th_small]:mt-1 [&_th_small]:text-muted-foreground"
              }
              aria-label={copy.progress.table}
            >
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{copy.progress.week}</TableHead>
                  <TableHead scope="col">{copy.history.games}</TableHead>
                  <TableHead scope="col">{copy.history.recordTitle}</TableHead>
                  <TableHead scope="col">{copy.home.unknown}</TableHead>
                  <TableHead scope="col">{copy.history.winRate}</TableHead>
                  <TableHead scope="col">{copy.progress.deaths}</TableHead>
                  <TableHead scope="col">{copy.history.averageGpm}</TableHead>
                  <TableHead scope="col">{copy.history.averageXpm}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((week) => (
                  <TableRow key={week.from}>
                    <TableHead scope="row">
                      {progressDate.format(new Date(week.from))}
                      {week.partial ? (
                        <small>{copy.progress.partial}</small>
                      ) : null}
                    </TableHead>
                    <TableCell>
                      {numberFormatter.format(week.stats.games)}
                    </TableCell>
                    <TableCell>
                      <span className="sr-only">
                        {copy.history.recordLabel(
                          week.stats.wins,
                          week.stats.losses,
                          week.stats.unknown,
                        )}
                      </span>
                      <span aria-hidden="true">
                        {copy.history.record(
                          week.stats.wins,
                          week.stats.losses,
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {numberFormatter.format(week.stats.unknown)}
                    </TableCell>
                    <TableCell>{statistic(week.stats.winRate, true)}</TableCell>
                    <TableCell>{statistic(week.stats.deaths)}</TableCell>
                    <TableCell>{statistic(week.stats.goldPerMinute)}</TableCell>
                    <TableCell>
                      {statistic(week.stats.experiencePerMinute)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
