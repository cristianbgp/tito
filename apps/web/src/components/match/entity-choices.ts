import { serviceText } from "../../i18n/service-messages";
import type { DraftHero, RecentMatch } from "../../api/generated/models";
import type { ChoiceItem } from "../ui/choice-select";
import { matchDateFormatter } from "../../i18n";

export const heroChoices = (heroes: DraftHero[]): ChoiceItem[] =>
  [...heroes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((hero) => ({
      value: String(hero.id),
      label: serviceText(hero.name),
      image: hero.image,
    }));
export const matchChoices = (matches: RecentMatch[]): ChoiceItem[] =>
  matches.map((match) => ({
    value: match.id,
    label: serviceText(match.hero),
    image: match.heroImage,
    description: `#${match.id} · ${matchDateFormatter.format(new Date(match.startedAt * 1000))}`,
  }));
