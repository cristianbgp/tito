import { useLocale } from "../../i18n/react";
import { useId } from "react";
import type { PlayerProgress } from "../../api/generated/models";
import {
  unavailable,
  copy,
  averageFormatter as average,
  changeFormatter as change,
  numberFormatter,
  percentageFormatter,
} from "../../i18n";
import { Card } from "../ui/card";

export function ProgressMetrics({ data }: { data: PlayerProgress }) {
  useLocale();
  const id = useId();
  const current = data.current.stats,
    previous = data.previous.stats;
  const metrics = [
    {
      key: "winRate",
      label: copy.history.winRate,
      current: current.winRate,
      previous: previous.winRate,
      delta: data.changes.winRatePoints,
      format: (value: number) => percentageFormatter.format(value),
      points: true,
    },
    {
      key: "deaths",
      label: copy.progress.deaths,
      current: current.deaths,
      previous: previous.deaths,
      delta: data.changes.deaths,
      format: (value: number) => average.format(value),
    },
    {
      key: "gpm",
      label: copy.progress.gpm,
      current: current.goldPerMinute,
      previous: previous.goldPerMinute,
      delta: data.changes.goldPerMinute,
      format: (value: number) => numberFormatter.format(Math.round(value)),
    },
    {
      key: "xpm",
      label: copy.progress.xpm,
      current: current.experiencePerMinute,
      previous: previous.experiencePerMinute,
      delta: data.changes.experiencePerMinute,
      format: (value: number) => numberFormatter.format(Math.round(value)),
    },
  ];
  return (
    <div
      className={
        "progress-metrics grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-4 max-[1100px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[580px]:gap-3"
      }
    >
      {metrics.map((metric) => (
        <Card
          key={metric.key}
          render={<section />}
          className="progress-metric min-w-0 p-5.5 [&_h2]:text-[14px] [&_h2]:font-medium [&_h2]:text-muted-foreground [&_h2]:m-0 max-[580px]:p-4 max-[580px]:[&_h2]:text-[12px]"
          aria-labelledby={`${id}-${metric.key}`}
        >
          <h2 id={`${id}-${metric.key}`}>{metric.label}</h2>
          <p className="progress-metric-value text-[38px] leading-[1.2] [font-weight:650] tracking-[-1.5px] tabular-nums mt-4 mx-0 mb-1.5 max-[580px]:text-[30px]">
            {metric.current.value == null
              ? unavailable
              : metric.format(metric.current.value)}
          </p>
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {copy.progress.validSamples(
              numberFormatter.format(metric.current.samples),
            )}
          </p>
          <div
            className={
              "progress-previous grid grid-cols-[minmax(0,_1fr)_auto] gap-[5px_8px] [border-top:1px_solid_var(--line)] pt-3.5 mt-4.5 text-[11px] text-muted-foreground [&_strong]:text-foreground [&_strong]:font-medium [&_span:last-child]:col-[1_/_-1]"
            }
          >
            <span>{copy.progress.previous}</span>
            <strong>
              {metric.previous.value == null
                ? unavailable
                : metric.format(metric.previous.value)}
            </strong>
            <span>
              {copy.progress.validSamples(
                numberFormatter.format(metric.previous.samples),
              )}
            </span>
          </div>
          {metric.delta == null ? (
            <p className="progress-comparison-hint text-[11px] leading-[1.6] text-muted-foreground mt-3.5 mx-0 mb-0">
              {copy.progress.minimum(
                numberFormatter.format(data.minimumSamples),
              )}
            </p>
          ) : (
            <p className="progress-change flex flex-wrap gap-[5px_8px] [align-items:baseline] mt-3.5 mx-0 mb-0 text-[11px] text-muted-foreground [&_strong]:text-[14px] [&_strong]:text-foreground [&_strong]:[font-weight:550]">
              <strong>
                {change.format(metric.delta)}
                {metric.points ? ` ${copy.progress.points}` : ""}
              </strong>
              <span>{copy.progress.change}</span>
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
