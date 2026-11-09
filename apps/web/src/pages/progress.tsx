import { useLocale } from "../i18n/react";
import { Link } from "react-router";
import {
  getGetPlayerProgressQueryKey,
  useGetPlayerProgress,
} from "../api/generated/tito";
import { authClient } from "../lib/auth";
import { copy, dateFormatter, numberFormatter } from "../i18n";
import { Card } from "../components/ui/card";
import { Button, buttonVariants } from "../components/ui/button";
import { EmptyState, PageHeading, RequestError } from "../components/shared";
import { ProgressMetrics } from "../components/progress/metric-cards";
import {
  WeeklyResults,
  progressDate,
} from "../components/progress/weekly-results";
import { ArrowClockwiseIcon } from "../components/icons";

export function ProgressPage() {
  useLocale();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const linked = Boolean(session?.user.steamId);
  const query = useGetPlayerProgress({
    query: {
      queryKey: [
        ...getGetPlayerProgressQueryKey(),
        session?.user.id,
        session?.user.steamId,
      ],
      enabled: linked && !sessionPending,
      staleTime: 60_000,
    },
  });
  const data = query.data;
  const history = session?.user.steamId
    ? `/?player=${session.user.steamId}`
    : "/account";
  return (
    <section className="progress-page">
      <div
        className={"progress-heading flex justify-between items-start gap-4"}
      >
        <PageHeading
          eyebrow={copy.progress.eyebrow}
          title={copy.progress.title}
          description={copy.progress.description}
        />
        {linked ? (
          <Button
            variant="unstyled"
            className={
              "icon-button inline-grid place-items-center shrink-0 w-9 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            title={copy.progress.refresh}
            aria-label={copy.progress.refresh}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <ArrowClockwiseIcon size={20} aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {linked ? (
        <nav
          className="context-links flex flex-wrap gap-[12px_24px] items-center mt-0 mx-0 mb-6 text-[14px]"
          aria-label={copy.context.progress}
        >
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to="/tools/coaching"
          >
            {copy.context.coaching}
          </Link>
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to="/tools/heroes"
          >
            {copy.context.heroes}
          </Link>
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to="/tools/session"
          >
            {copy.context.session}
          </Link>
        </nav>
      ) : null}
      {sessionPending ? (
        <p
          className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
          role="status"
        >
          {copy.shell.loading}
        </p>
      ) : !session || !linked ? (
        <Card className={"progress-empty text-center pb-9"}>
          <EmptyState
            title={
              !session ? copy.progress.signInTitle : copy.progress.connectTitle
            }
          >
            {copy.progress.ownOnly}
          </EmptyState>
          <Link
            className={buttonVariants({ variant: "secondary" })}
            to={!session ? "/signin" : "/account"}
          >
            {!session ? copy.nav.signIn : copy.progress.connect}
          </Link>
        </Card>
      ) : (
        <>
          {query.error ? (
            <RequestError
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : null}
          {query.error && data ? (
            <p className="history-stale mt-0 mx-2 mb-4.5 text-muted-foreground text-[12px] leading-[1.6]">
              {copy.progress.cached}
            </p>
          ) : null}
          {data ? (
            data.retainedMatches ? (
              <>
                <div className="progress-context grid [justify-items:start] gap-2 mb-6 [&_p]:m-0">
                  <p>
                    {copy.progress.period(
                      progressDate.format(new Date(data.current.from)),
                      progressDate.format(new Date(data.current.to)),
                      numberFormatter.format(data.current.stats.games),
                    )}
                  </p>
                  <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                    {copy.progress.scope(
                      numberFormatter.format(data.retainedMatches),
                    )}
                    {data.lastSyncedAt
                      ? ` ${copy.savedHistory.synced(dateFormatter.format(new Date(data.lastSyncedAt)))}`
                      : ""}
                  </p>
                  <Link
                    className={
                      "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                    }
                    to={history}
                  >
                    {copy.savedHistory.myHistory}
                  </Link>
                </div>
                <ProgressMetrics data={data} />
                <p className="progress-caveat field-hint max-w-[88ch] text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                  {copy.progress.caveat}
                </p>
                <WeeklyResults weeks={data.weeks} />
              </>
            ) : (
              <Card className={"progress-empty text-center pb-9"}>
                <EmptyState title={copy.progress.emptyTitle}>
                  {copy.progress.emptyText}
                </EmptyState>
                <Link
                  className={buttonVariants({ variant: "secondary" })}
                  to={history}
                >
                  {copy.savedHistory.import}
                </Link>
              </Card>
            )
          ) : query.isFetching ? (
            <p
              className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
              role="status"
            >
              {copy.shell.loading}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
