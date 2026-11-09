import { useLocale } from "../../i18n/react";
import type { PersonalHeroSummary } from "../../api/generated/models";
import { numberFormatter, percentageFormatter } from "../../i18n";
import { libraryCopy as c } from "../../i18n/library";
export const observedMetric = (value: number | null) =>
  value === null
    ? c.unavailable
    : numberFormatter.format(Math.round(value * 10) / 10);
export function HeroStats({ hero }: { hero: PersonalHeroSummary }) {
  useLocale();
  const stats = [
    [c.games, numberFormatter.format(hero.games)],
    [
      c.winRate,
      hero.winRate === null
        ? c.unavailable
        : percentageFormatter.format(hero.winRate),
    ],
    [
      c.kda,
      [hero.kills, hero.deaths, hero.assists].map(observedMetric).join(" / "),
    ],
    [c.gpm, observedMetric(hero.goldPerMinute)],
    [c.xpm, observedMetric(hero.experiencePerMinute)],
    [c.reviews, numberFormatter.format(hero.reviewedGames)],
    [c.notes, numberFormatter.format(hero.notedGames)],
  ];
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map(([label, value]) => (
        <div
          key={label}
          className={`grid min-w-0 grid-cols-1 gap-1 border-0 p-0 ${label === c.kda ? "col-span-2 sm:col-span-1" : ""}`}
        >
          <dt className="field-hint m-0 text-muted-foreground text-[12px] leading-[1.7]">
            {label}
          </dt>
          <dd className="m-0 text-lg font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
