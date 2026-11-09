import { serviceText } from "../../i18n/service-messages";
import { GeneratedLanguage } from "../generated-language";
import { useLocale } from "../../i18n/react";
import { matchText } from "../../lib/typography";
import { Link } from "react-router";
import type {
  CoachingInsightsEvidenceItem,
  SavedCoaching,
} from "../../api/generated/models";
import { dateFormatter, numberFormatter } from "../../i18n";
import { coachingCopy as c } from "../../i18n/coaching";
export function CoachingEvidence({
  evidence,
  ids,
}: {
  evidence: CoachingInsightsEvidenceItem[];
  ids?: string[];
}) {
  useLocale();
  const selected = ids ? evidence.filter((e) => ids.includes(e.id)) : evidence;
  if (!selected.length) return null;
  return (
    <details>
      <summary>{c.evidence}</summary>
      <ul
        className="review-evidence flex flex-wrap gap-1.5 [list-style:none] mt-3.5 [&_li]:flex [&_li]:gap-1.5 [&_li]:flex-wrap [&_li]:[align-items:baseline] [&_li]:bg-[var(--surface-raised)] [&_li]:border [&_li]:border-border [&_li]:rounded-[7px] [&_li]:py-1.5 [&_li]:px-2 [&_li]:text-[10px] [&_li]:text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_strong]:tabular-nums [&_li_>_span]:w-full [&_li_>_span]:text-[9px]"
        aria-label={c.evidence}
      >
        {selected.map((e) => (
          <li key={e.id}>
            <div>
              <strong>
                {c.metrics[e.metric] ?? e.metric}:{" "}
                {numberFormatter.format(e.value)}
              </strong>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                {c.samples(e.samples)} · {e.id}
              </p>
              <p>
                {e.matchIds.map((id, i) => (
                  <span key={id}>
                    {i ? " · " : ""}
                    <Link
                      className={
                        "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                      }
                      to={`/matches/${id}`}
                    >
                      {c.match(id)}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
export function SavedCoachingAnswer({
  answer,
}: {
  answer: NonNullable<SavedCoaching> & {
    evidence?: CoachingInsightsEvidenceItem[];
  };
}) {
  useLocale();
  return (
    <article>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {c.saved} {dateFormatter.format(new Date(answer.generatedAt))} ·{" "}
        {answer.model}
      </p>
      {answer.question ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {c.source}: {serviceText(answer.question)}
        </p>
      ) : null}
      <GeneratedLanguage locale={answer.locale} />
      <p lang={answer.locale ?? "en"}>{matchText(answer.content.text)}</p>
      {answer.content.needsReplay ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {c.needsReplay}
        </p>
      ) : null}
      <CoachingEvidence
        evidence={answer.evidence ?? []}
        ids={answer.content.evidenceIds}
      />
    </article>
  );
}
