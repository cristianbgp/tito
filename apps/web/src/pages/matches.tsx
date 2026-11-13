import { useLocale } from "../i18n/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  getGetPlayerProfileQueryKey,
  useGetPlayerProfile,
  useGetRecentMatches,
  useGetSavedHistory,
} from "../api/generated/tito";
import { authClient } from "../lib/auth";
import {
  filterHistory,
  historySearch,
  readHistoryFilters,
  type HistoryFilters,
} from "../lib/match-history";
import { copy } from "../i18n";
import { EmptyState, PageHeading, RequestError } from "../components/shared";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowClockwiseIcon } from "../components/icons";
import { MatchPreview } from "../components/match/match-preview";
import { MatchHistoryControls } from "../components/match/match-history-controls";
import { RecentMatchesTable } from "../components/match/recent-matches-table";
import { HeroPerformance } from "../components/match/hero-performance";
import { SavedHistoryControls } from "../components/match/saved-history-controls";

export function MatchesPage() {
  useLocale();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [params, setParams] = useSearchParams();
  const profile = useGetPlayerProfile({
    query: {
      queryKey: [...getGetPlayerProfileQueryKey(), session?.user.id],
      enabled: Boolean(session),
    },
  });
  const player = params.get("player") ?? profile.data?.accountId ?? "";
  const linked = profile.data?.linkedAccountId;
  const savedMode = Boolean(
    session?.user.steamId &&
    linked &&
    (player === linked || player === session.user.steamId),
  );
  const scope = ["saved-history", session?.user.id, linked] as const;
  const identity = `${session?.user.id}:${linked}`;
  const [window, setWindow] = useState({ identity: "", limit: 100 });
  const limit = window.identity === identity ? window.limit : 100;
  const saved = useGetSavedHistory(
    { limit },
    {
      query: {
        queryKey: [...scope, limit],
        enabled: savedMode,
        staleTime: 30_000,
      },
    },
  );
  const recent = useGetRecentMatches(player, {
    query: {
      enabled:
        Boolean(player) &&
        !savedMode &&
        !sessionPending &&
        (!session || !profile.isPending),
    },
  });
  const { error, isFetching, refetch } = savedMode ? saved : recent;
  const data = savedMode ? saved.data?.matches : recent.data;
  const title = savedMode ? copy.savedHistory.title : copy.home.recent;
  const filters = readHistoryFilters(params);
  const visible = filterHistory(data ?? [], filters);
  const [selection, setSelection] = useState<{
    player: string;
    matchId: string;
  }>();
  const selected =
    (selection?.player === player
      ? visible.find((match) => match.id === selection.matchId)
      : undefined) ?? visible[0];
  function changeFilters(next: HistoryFilters) {
    setParams(new URLSearchParams(historySearch(player, next)), {
      replace: true,
    });
  }
  return (
    <section className={"matches-page [&_.page-heading_.eyebrow]:hidden"}>
      <PageHeading
        eyebrow={copy.home.eyebrow}
        title={copy.home.title}
        description={
          savedMode ? copy.savedHistory.description : copy.home.description
        }
      />
      {session && profile.error ? (
        <RequestError
          error={profile.error}
          retry={() => void profile.refetch()}
        />
      ) : null}
      <div
        className={`match-explorer-grid grid gap-5 items-start [&.has-preview]:grid-cols-[minmax(0,_1.32fr)_minmax(340px,_1fr)] max-[1250px]:[&.has-preview]:grid-cols-[minmax(0,_1.15fr)_minmax(315px,_1fr)] max-[1250px]:[&.has-preview]:gap-4 max-[1050px]:[&.has-preview]:grid-cols-[1fr] ${selected ? "has-preview" : ""}`}
      >
        <Card
          render={<section />}
          id="recent-matches"
          tabIndex={-1}
          className="recent-matches-panel min-w-0 pt-6.25 px-4.5 pb-3.5 [&_>_.section-header]:px-2 [&_>_.section-header]:mb-4.75 [&_>_.section-header]:min-h-9.5 max-[580px]:pt-4.25 max-[580px]:px-2.5 max-[580px]:pb-3 max-[580px]:[&_>_.section-header]:px-1.5 [&_.section-header_h2]:text-[23px]"
          aria-label={title}
        >
          <div
            className={
              "section-header flex items-center justify-between gap-3.5 mb-5 max-[580px]:[&_h2]:text-[19px]"
            }
          >
            <h2>{title}</h2>
            <div className={"match-list-actions flex gap-3.5 items-center"}>
              {savedMode ? (
                <Link
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  to="/tools/journal"
                >
                  {copy.context.journal}
                </Link>
              ) : null}
              {linked && session?.user.steamId && !savedMode ? (
                <Link
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  to={`/?player=${linked}`}
                >
                  {copy.savedHistory.myHistory}
                </Link>
              ) : profile.data?.accountId &&
                player !== profile.data.accountId ? (
                <Link
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  to={`/?player=${profile.data.accountId}`}
                >
                  {copy.profile.myMatches}
                </Link>
              ) : null}
              {player && !savedMode ? (
                <Button
                  variant="unstyled"
                  type="button"
                  className={
                    "icon-button inline-grid place-items-center shrink-0 w-9 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  title={copy.home.refresh}
                  aria-label={copy.home.refresh}
                  disabled={isFetching}
                  onClick={() => void refetch()}
                >
                  <ArrowClockwiseIcon size={19} aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          </div>
          {savedMode ? (
            <SavedHistoryControls
              key={identity}
              history={saved.data}
              scope={scope}
              loading={isFetching}
              onShowMore={() =>
                setWindow({ identity, limit: Math.min(1000, limit + 100) })
              }
            />
          ) : null}
          {error ? (
            <RequestError error={error} retry={() => void refetch()} />
          ) : null}
          {error && data?.length ? (
            <p className="history-stale mt-0 mx-2 mb-4.5 text-muted-foreground text-[12px] leading-[1.6]">
              {savedMode ? copy.savedHistory.cached : copy.history.cached}
            </p>
          ) : null}
          {data?.length ? (
            <MatchHistoryControls
              filters={filters}
              shown={visible}
              matches={data}
              total={data.length}
              selectedHero={
                data.find((match) => match.heroId === filters.heroId)?.hero
              }
              onChange={changeFilters}
              saved={savedMode}
            />
          ) : null}
          <div className="match-list" aria-busy={isFetching}>
            {!player ? (
              <EmptyState title={copy.home.emptyTitle}>
                {copy.home.hint}
              </EmptyState>
            ) : isFetching && !data ? (
              <div
                className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
                role="status"
              >
                {copy.home.searching}
              </div>
            ) : data?.length === 0 ? (
              <EmptyState
                title={
                  savedMode && !saved.data?.lastSyncedAt
                    ? copy.savedHistory.empty
                    : copy.home.noMatches
                }
              >
                {savedMode && !saved.data?.lastSyncedAt
                  ? copy.savedHistory.emptyText
                  : copy.home.noMatchesText}
              </EmptyState>
            ) : data ? (
              visible.length ? (
                <RecentMatchesTable
                  matches={visible}
                  selectedId={selected?.id}
                  filters={filters}
                  onSelect={(matchId) => setSelection({ player, matchId })}
                />
              ) : (
                <EmptyState title={copy.history.noResults}>
                  {copy.history.noResultsText}
                </EmptyState>
              )
            ) : error ? (
              <EmptyState title={copy.history.loadFailed}>
                {copy.history.loadFailedText}
              </EmptyState>
            ) : null}
          </div>
          <p className="data-credit mt-3.75 mx-2 mb-0.75 text-[var(--faint)] text-[10px]">
            {data?.some((match) => match.source === "replay")
              ? data.every((match) => match.source === "replay")
                ? copy.home.replaySource
                : copy.home.mixedSource
              : copy.home.source}
          </p>
        </Card>
        {selected ? (
          <MatchPreview
            key={`${selected.accountId}:${selected.id}`}
            recent={selected}
            filters={filters}
            deferDetails={savedMode}
          />
        ) : null}
      </div>
      {data?.length ? (
        <HeroPerformance
          matches={data}
          player={data[0].accountId}
          saved={savedMode}
        />
      ) : null}
    </section>
  );
}
