import { serviceText } from "../../i18n/service-messages";
import { GeneratedLanguage } from "../generated-language";
import { useLocale } from "../../i18n/react";
import { matchText } from "../../lib/typography";
import { Link } from "react-router";
import { useQueryClient, type Query } from "@tanstack/react-query";
import type {
  SavedMatchReview,
  SavedMatchReviewContextFactsItem as Fact,
} from "../../api/generated/models";
import {
  getGetMatchReviewQueryKey,
  getGetPersonalHeroesQueryKey,
  getGetSessionReflectionQueryKey,
  getGetPersonalAiUsageQueryKey,
  getGetCoachingQueryKey,
  useGetMatchReview,
  useGenerateMatchReview,
} from "../../api/generated/tito";
import { copy, dateFormatter, duration, numberFormatter } from "../../i18n";
import { BrandMark } from "../brand";
import { ReviewFeedback } from "../library/review-feedback";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import { Card } from "../ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";

type Review = NonNullable<SavedMatchReview>;
function factValue(fact: Fact) {
  if (fact.metric === "result")
    return fact.value === 1 ? copy.home.win : copy.home.loss;
  if (fact.metric === "duration") return duration(fact.value);
  return numberFormatter.format(Math.round(fact.value * 10) / 10);
}
function factLabel(fact: Fact) {
  const c = copy.review;
  const label = c.metrics[fact.metric];
  return `${fact.source === "baseline" ? c.personalAverage + " · " : ""}${label}${fact.atSeconds !== null ? ` · ${duration(fact.atSeconds)}` : ""}`;
}
function Evidence({ ids, review }: { ids: string[]; review: Review }) {
  useLocale();
  const c = copy.review;
  const facts = review.context.facts.filter((f) => ids.includes(f.id));
  return (
    <ul
      className="review-evidence flex flex-wrap gap-1.5 [list-style:none] mt-3.5 [&_li]:flex [&_li]:gap-1.5 [&_li]:flex-wrap [&_li]:[align-items:baseline] [&_li]:bg-[var(--surface-raised)] [&_li]:border [&_li]:border-border [&_li]:rounded-[7px] [&_li]:py-1.5 [&_li]:px-2 [&_li]:text-[10px] [&_li]:text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_strong]:tabular-nums [&_li_>_span]:w-full [&_li_>_span]:text-[9px]"
      aria-label={c.evidence}
    >
      {facts.map((f) => (
        <li key={f.id}>
          {factLabel(f)} <strong>{factValue(f)}</strong>
          {f.source === "baseline" ? <span>{c.samples(f.samples)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
export function MatchReviewView({
  signedIn,
  steamConnected,
  enabled,
  review,
  loading = false,
  busy = false,
  error,
  onGenerate,
  onRetry,
}: {
  signedIn: boolean;
  steamConnected: boolean;
  enabled?: boolean;
  review?: SavedMatchReview;
  loading?: boolean;
  busy?: boolean;
  error?: string;
  onGenerate: () => void;
  onRetry?: () => void;
}) {
  useLocale();
  const c = copy.review;
  const visible = signedIn && steamConnected ? review : null;
  // Keep match statistics first when there is no review to display or generate.
  // Saved reviews and real request errors remain visible without AI enabled.
  if (
    signedIn &&
    steamConnected &&
    !visible &&
    !error &&
    (loading || enabled === false)
  )
    return null;
  return (
    <Card
      render={<section aria-label={c.title} />}
      className="match-review p-6 mb-6 min-w-0 wrap-anywhere [&_.notice]:mb-4.5 [&_.notice_p]:mt-2 max-[580px]:p-5"
    >
      <div className="review-heading flex items-center gap-3.5 justify-between flex-wrap mb-5.5 [&_.button]:text-[12px] [&_.button]:min-h-10.5 [&_.button]:py-2.5 [&_.button]:px-4 max-[580px]:[&_>_.button]:w-full">
        <div
          className={
            "review-identity flex items-center gap-3.5 min-w-0 [&_.brand-orb]:w-10.5 [&_.brand-orb]:h-10.5 [&_.brand-orb]:shrink-0 [&_.eyebrow]:text-[9px] [&_.eyebrow]:mb-1.5 [&_h2]:text-[24px] [&_h2]:tracking-[-0.7px] max-[580px]:[&_h2]:text-[20px]"
          }
        >
          <BrandMark />
          <div>
            <p className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3.5">
              {c.eyebrow}
            </p>
            <h2>{c.title}</h2>
          </div>
        </div>
        {signedIn && steamConnected && enabled && !loading ? (
          <Button
            variant={visible ? "secondary" : "default"}
            disabled={busy}
            onClick={onGenerate}
          >
            {busy ? c.generating : visible ? c.update : c.generate}
          </Button>
        ) : null}
      </div>
      {!signedIn ? (
        <div
          className={
            "review-intro max-w-[72ch] grid gap-4 text-muted-foreground leading-[1.7] [&_.button]:[justify-self:start]"
          }
        >
          <p>{c.signInHint}</p>
          <Link
            to="/signin"
            className={buttonVariants({ variant: "secondary" })}
          >
            {c.signIn}
          </Link>
        </div>
      ) : !steamConnected ? (
        <div
          className={
            "review-intro max-w-[72ch] grid gap-4 text-muted-foreground leading-[1.7] [&_.button]:[justify-self:start]"
          }
        >
          <p>{c.connectHint}</p>
          <Link
            to="/account"
            className={buttonVariants({ variant: "secondary" })}
          >
            {c.connect}
          </Link>
        </div>
      ) : (
        <>
          {loading ? (
            <p
              role="status"
              className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere"
            >
              {c.loading}
            </p>
          ) : null}
          {enabled === false ? (
            <Alert role="note">
              <strong>{c.unconfigured}</strong>
              <p>{c.unconfiguredHint}</p>
            </Alert>
          ) : null}
          {error ? (
            <Alert role="alert">
              <p>{serviceText(error)}</p>
              {onRetry ? (
                <Button variant="secondary" onClick={onRetry}>
                  {copy.home.retry}
                </Button>
              ) : null}
            </Alert>
          ) : null}
          {busy ? (
            <p
              role="status"
              className="review-status my-3 mx-0 text-[13px] text-muted-foreground"
            >
              {c.generatingHint}
            </p>
          ) : null}
          {visible ? (
            <>
              <div
                className={
                  "review-summary max-w-[84ch] mb-6.5 text-[15px] leading-[1.7]"
                }
              >
                <p
                  className={
                    "review-player text-muted-foreground text-[11px] mb-2.5"
                  }
                >
                  {c.ownPlayer(serviceText(visible.context.hero))}
                </p>
                <GeneratedLanguage locale={visible.locale} />
                <p lang={visible.locale ?? "en"}>
                  {matchText(visible.content.summary)}
                </p>
              </div>
              <div
                className={
                  "review-sections [&_.review-wentWell_h3]:text-[var(--success)] [&_.review-wentWrong_h3]:text-[var(--danger)] [&_.review-improve_h3]:text-[var(--gold)] grid grid-cols-[repeat(3,_minmax(0,_1fr))] [border-top:1px_solid_var(--line)] [border-bottom:1px_solid_var(--line)] max-[1100px]:grid-cols-[1fr]"
                }
              >
                {(["wentWell", "wentWrong", "improve"] as const).map(
                  (section, index) => (
                    <section
                      className={`pt-6 pr-5.5 pb-6 pl-5.5 min-w-0 [&:first-child]:pl-0 [&:last-child]:pr-0 [&_+_.review-section]:[border-left:1px_solid_var(--line)] [&_h3]:text-[17px] [&_h3]:tracking-[-0.35px] [&_h3]:mb-5.5 [&_>_p]:text-[13px] [&_>_p]:leading-[1.7] max-[1100px]:pt-5.5 max-[1100px]:pr-0 max-[1100px]:pb-5.5 max-[1100px]:pl-0 max-[1100px]:[&:first-child]:pt-5.5 max-[1100px]:[&:first-child]:pr-0 max-[1100px]:[&:first-child]:pb-5.5 max-[1100px]:[&:first-child]:pl-0 max-[1100px]:[&:last-child]:pt-5.5 max-[1100px]:[&:last-child]:pr-0 max-[1100px]:[&:last-child]:pb-5.5 max-[1100px]:[&:last-child]:pl-0 max-[1100px]:[&_+_.review-section]:[border-left:0] max-[1100px]:[&_+_.review-section]:[border-top:1px_solid_var(--line)] max-[1100px]:[&_h3]:mb-4.5 review-section review-${section}`}
                      key={section}
                      aria-label={c[section]}
                    >
                      <span
                        className={
                          "review-section-number block [font:11px_var(--font-mono)] text-muted-foreground mb-3"
                        }
                        aria-hidden="true"
                      >
                        0{index + 1}
                      </span>
                      <h3>{c[section]}</h3>
                      {section === "improve" ? (
                        visible.content.improve.map((item, i) => (
                          <article
                            className={
                              "review-finding [&_+_.review-finding]:mt-6.25 [&_+_.review-finding]:pt-5 [&_+_.review-finding]:[border-top:1px_solid_var(--line)] [&_h4]:text-[14px] [&_h4]:font-semibold [&_h4]:mb-2 [&_p]:text-[13px] [&_p]:leading-[1.75] [&_p]:text-muted-foreground"
                            }
                            key={i}
                          >
                            <h4 lang={visible.locale ?? "en"}>
                              {matchText(item.title)}
                            </h4>
                            <p lang={visible.locale ?? "en"}>
                              {matchText(item.action)}
                            </p>
                            <Evidence ids={item.evidenceIds} review={visible} />
                          </article>
                        ))
                      ) : visible.content[section].length ? (
                        visible.content[section].map((item, i) => (
                          <article
                            className={
                              "review-finding [&_+_.review-finding]:mt-6.25 [&_+_.review-finding]:pt-5 [&_+_.review-finding]:[border-top:1px_solid_var(--line)] [&_h4]:text-[14px] [&_h4]:font-semibold [&_h4]:mb-2 [&_p]:text-[13px] [&_p]:leading-[1.75] [&_p]:text-muted-foreground"
                            }
                            key={i}
                          >
                            <Badge
                              variant="ghost"
                              className={
                                "review-certainty text-muted-foreground text-[10px] mb-2.5"
                              }
                            >
                              {item.certainty === "observed"
                                ? c.observed
                                : c.toReview}
                            </Badge>
                            <h4 lang={visible.locale ?? "en"}>
                              {matchText(item.title)}
                            </h4>
                            <p lang={visible.locale ?? "en"}>
                              {matchText(item.interpretation)}
                            </p>
                            <Evidence ids={item.evidenceIds} review={visible} />
                          </article>
                        ))
                      ) : (
                        <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
                          {section === "wentWell"
                            ? c.emptyPositive
                            : c.emptyNegative}
                        </p>
                      )}
                    </section>
                  ),
                )}
              </div>
              <div
                className={
                  "review-footer grid gap-1.5 mt-4.5 text-muted-foreground text-[11px] leading-[1.7]"
                }
              >
                <p>
                  {c.generated(
                    dateFormatter.format(new Date(visible.generatedAt)),
                  )}
                </p>
                <p>{c.aiCaveat}</p>
              </div>
              <Collapsible className="review-data mt-4.5 pt-4 [border-top:1px_solid_var(--line)] [&_[data-slot=collapsible-trigger]]:flex [&_[data-slot=collapsible-trigger]]:items-center [&_[data-slot=collapsible-trigger]]:gap-2 [&_[data-slot=collapsible-trigger]]:text-muted-foreground [&_[data-slot=collapsible-trigger]]:text-[12px] [&_[data-slot=collapsible-trigger]]:cursor-pointer [&_[data-slot=collapsible-content]_>_p]:text-[12px] [&_[data-slot=collapsible-content]_>_p]:leading-[1.7] [&_[data-slot=collapsible-content]_>_p]:text-muted-foreground [&_[data-slot=collapsible-content]_>_p]:mt-4 [&_[data-slot=collapsible-content]_>_p]:max-w-[90ch]">
                <CollapsibleTrigger>{c.statistics}</CollapsibleTrigger>
                <CollapsibleContent>
                  <p>{c.coverage[visible.context.coverage]}</p>
                  <p>{c.baselineHint}</p>
                  <ul className="review-facts [list-style:none] grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[0_28px] mt-4 [&_li]:flex [&_li]:justify-between [&_li]:gap-3.5 [&_li]:py-3 [&_li]:px-0 [&_li]:[border-top:1px_solid_var(--line)] [&_li]:text-[12px] [&_li]:text-muted-foreground [&_strong]:text-foreground [&_strong]:tabular-nums [&_strong]:shrink-0 [&_small]:block [&_small]:mt-1.25 max-[580px]:grid-cols-[1fr]">
                    {visible.context.facts.map((f) => (
                      <li key={f.id}>
                        <span>
                          {factLabel(f)}
                          {f.source === "baseline" ? (
                            <small>{c.samples(f.samples)}</small>
                          ) : null}
                        </span>
                        <strong>{factValue(f)}</strong>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : !loading && enabled ? (
            <div
              className={
                "review-intro max-w-[72ch] grid gap-4 text-muted-foreground leading-[1.7] [&_.button]:[justify-self:start]"
              }
            >
              <p>{c.intro}</p>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                {c.privacy}
              </p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

export function MatchReview({
  matchId,
  userId,
  steamId,
}: {
  matchId: string;
  userId?: string;
  steamId?: string | null;
}) {
  useLocale();
  const client = useQueryClient();
  const key = [
    ...getGetMatchReviewQueryKey(matchId),
    userId ?? "guest",
    steamId ?? "unlinked",
  ];
  const query = useGetMatchReview(matchId, {
    query: {
      queryKey: key,
      enabled: Boolean(userId && steamId && matchId),
      retry: false,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const ownsQuery = (query: Query) =>
    query.queryKey.at(-2) === (userId ?? "guest") &&
    query.queryKey.at(-1) === (steamId ?? "unlinked");
  const dependentRoots = new Set<string>([
    getGetPersonalHeroesQueryKey()[0],
    getGetSessionReflectionQueryKey()[0],
    getGetCoachingQueryKey()[0],
  ]);
  const generate = useGenerateMatchReview({
    mutation: {
      retry: false,
      onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
      onSuccess: (result) => {
        client.setQueryData(key, result);
        void client.invalidateQueries({
          predicate: (query) =>
            ownsQuery(query) &&
            (dependentRoots.has(String(query.queryKey[0])) ||
              String(query.queryKey[0]).startsWith(
                `${getGetPersonalHeroesQueryKey()[0]}/`,
              )),
        });
      },
      // Failed model attempts may still consume a reservation or report usage.
      onSettled: () =>
        client.invalidateQueries({
          queryKey: getGetPersonalAiUsageQueryKey(),
          predicate: ownsQuery,
        }),
    },
  });
  const error = generate.error ?? query.error;
  return (
    <>
      <MatchReviewView
        signedIn={Boolean(userId)}
        steamConnected={Boolean(steamId)}
        enabled={query.data?.enabled}
        review={query.data?.review}
        loading={query.isLoading}
        busy={generate.isPending}
        error={
          error
            ? error instanceof Error
              ? error.message
              : copy.errors.generic
            : undefined
        }
        onGenerate={() => generate.mutate({ matchId, data: {} })}
        onRetry={query.error ? () => void query.refetch() : undefined}
      />
      {query.data?.review && userId && steamId ? (
        <ReviewFeedback
          key={`${userId}:${steamId}:${query.data.review.generatedAt}`}
          matchId={matchId}
          generatedAt={query.data.review.generatedAt}
        />
      ) : null}
    </>
  );
}
