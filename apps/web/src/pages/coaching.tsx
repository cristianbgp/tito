import { serviceText } from "../i18n/service-messages";
import { useLocale } from "../i18n/react";
import { copy } from "../i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  getGetCoachingQueryKey,
  useGetCoaching,
  useGenerateCoachingSummary,
} from "../api/generated/tito";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import {
  CoachingEvidence,
  SavedCoachingAnswer,
} from "../components/coaching/evidence";
import { coachingCopy as c } from "../i18n/coaching";
function CoachingContent() {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [...getGetCoachingQueryKey(), ...identity.key];
  const query = useGetCoaching({
    query: {
      queryKey,
      enabled:
        identity.signedIn && Boolean(identity.steamId) && !identity.loading,
      staleTime: 60000,
      retry: false,
    },
  });
  const mutation = useGenerateCoachingSummary({
    mutation: {
      retry: false,
      onSuccess: (data) => client.setQueryData(queryKey, data),
    },
  });
  const data = query.data,
    insights = data?.insights;
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.error && data ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
          {c.cached}
        </p>
      ) : null}
      {!data && query.isFetching ? <p role="status">{c.generating}</p> : null}
      {insights ? (
        <>
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {c.refresh}
          </Button>
          {!insights.retainedMatches ? (
            <ToolPanel title={c.title}>
              <p>{c.empty}</p>
              <Link
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                to={`/?player=${identity.steamId}`}
              >
                {c.import}
              </Link>
            </ToolPanel>
          ) : null}
          {insights.latestDay ? (
            <ToolPanel title={c.latest}>
              <p>
                {c.day(
                  insights.latestDay.date,
                  insights.latestDay.games,
                  insights.latestDay.wins,
                  insights.latestDay.losses,
                  insights.latestDay.unknown,
                )}
              </p>
              <p>{serviceText(insights.latestDay.reflection)}</p>
            </ToolPanel>
          ) : null}
          <div
            className={
              "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
            }
          >
            {(["strengths", "concerns"] as const).map((kind) => (
              <ToolPanel key={kind} title={c[kind]}>
                {insights[kind].length ? (
                  <ul className="grid gap-4">
                    {insights[kind].map((item, i) => (
                      <li key={i}>
                        <p>{serviceText(item.text)}</p>
                        <CoachingEvidence
                          evidence={insights.evidence}
                          ids={item.evidenceIds}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                    {kind === "strengths" ? c.noStrengths : c.noConcerns}
                  </p>
                )}
              </ToolPanel>
            ))}
          </div>
          {!insights.evidence.length ? (
            <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
              {c.insufficient}
            </p>
          ) : null}
          <ul className="field-hint grid gap-2 text-muted-foreground text-[12px] leading-[1.7] m-0">
            {insights.limitations.map((text) => (
              <li key={text}>{serviceText(text)}</li>
            ))}
          </ul>
          <ToolPanel title={c.summary}>
            {!data.enabled ? (
              <p className="notice m-0 py-4.5 px-5.25 text-[13px] leading-[1.8] border border-border rounded-[15px] bg-[var(--surface-raised)] text-muted-foreground [&.error]:[border-color:var(--danger)] [&.error]:bg-[var(--danger-tint)] [&.error]:text-foreground [&_p]:m-0 [&_.text-button]:mt-2 max-[580px]:p-4">
                {c.notConfigured}
              </p>
            ) : null}
            {data.summary ? (
              <SavedCoachingAnswer answer={data.summary} />
            ) : (
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                {c.noSummary}
              </p>
            )}
            {mutation.error ? <RequestError error={mutation.error} /> : null}
            <Button
              disabled={
                !data.enabled || !insights.evidence.length || mutation.isPending
              }
              onClick={() => mutation.mutate({ data: {} })}
            >
              {mutation.isPending ? c.generating : c.generate}
            </Button>
            {mutation.isPending ? <p role="status">{c.generating}</p> : null}
            <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
              {c.limits}
            </p>
          </ToolPanel>
        </>
      ) : null}
    </>
  );
}
export function CoachingPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/progress"
      backLabel={copy.nav.progress}
      title={c.title}
      description={c.description}
    >
      <PrivateTool steam>
        <CoachingContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
