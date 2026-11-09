import { useLocale } from "../i18n/react";
import { SelectField } from "../components/ui/select-field";
import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSavedDraftsQueryKey,
  getGetSavedHistoryQueryKey,
  useGetSavedDrafts,
  useGetSavedHistory,
  useGetHeroDraftCatalog,
  useUpdateDraftSnapshot,
  useDeleteDraftSnapshot,
} from "../api/generated/tito";
import type {
  DraftHero,
  RecentMatch,
  SavedDraftSnapshot,
  UpdateDraftSnapshotBody,
  GetSavedDrafts200,
} from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { RequestError } from "../components/shared";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { ChoiceSelect } from "../components/ui/choice-select";
import { heroChoices, matchChoices } from "../components/match/entity-choices";
import { Badge } from "../components/ui/badge";
import { copy, dateFormatter } from "../i18n";
import { companionCopy as c } from "../i18n/companion";
import { libraryCopy as library } from "../i18n/library";
export function DraftHistoryPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/tools/hero-picker"
      backLabel={copy.tools.heroPicker}
      title={c.draftsTitle}
      description={c.draftsDescription}
    >
      <PrivateTool>
        <DraftHistoryContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
function DraftHistoryContent() {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [...getGetSavedDraftsQueryKey(), ...identity.key];
  const query = useGetSavedDrafts({
    query: { queryKey, staleTime: 30000, retry: false },
  });
  const catalog = useGetHeroDraftCatalog({
    query: { staleTime: Infinity, retry: false },
  });
  const history = useGetSavedHistory(
    { limit: 1000 },
    {
      query: {
        queryKey: [
          ...getGetSavedHistoryQueryKey({ limit: 1000 }),
          ...identity.key,
        ],
        enabled: Boolean(identity.steamId),
        staleTime: 30000,
        retry: false,
      },
    },
  );
  const drafts = query.data?.drafts ?? [];
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {catalog.error ? (
        <RequestError
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : null}
      {history.error ? (
        <RequestError
          error={history.error}
          retry={() => void history.refetch()}
        />
      ) : null}
      {query.isLoading || catalog.isLoading ? (
        <p role="status">{library.loading}</p>
      ) : query.data && catalog.data ? (
        <>
          {drafts.length ? (
            <>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                {library.draftCount(drafts.length)} · {c.chosenHelp}
              </p>
              <div className="grid gap-5">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    heroes={catalog.data.heroes}
                    matches={history.data?.matches ?? []}
                    linked={Boolean(identity.steamId)}
                    historyReady={Boolean(history.data)}
                    onSaved={(value) =>
                      client.setQueryData<GetSavedDrafts200>(
                        queryKey,
                        (previous) => ({
                          drafts: (previous?.drafts ?? []).map((d) =>
                            d.id === draft.id ? value : d,
                          ),
                        }),
                      )
                    }
                    onDeleted={() =>
                      client.setQueryData<GetSavedDrafts200>(
                        queryKey,
                        (previous) => ({
                          drafts: (previous?.drafts ?? []).filter(
                            (d) => d.id !== draft.id,
                          ),
                        }),
                      )
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <ToolPanel title={c.draftsTitle}>
              <p>{c.draftsEmpty}</p>
              <Link
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                to="/tools/hero-picker"
              >
                {library.heroPicker}
              </Link>
            </ToolPanel>
          )}
        </>
      ) : null}
    </>
  );
}
function DraftCard({
  draft,
  heroes,
  matches,
  linked,
  historyReady,
  onSaved,
  onDeleted,
}: {
  draft: SavedDraftSnapshot;
  heroes: DraftHero[];
  matches: RecentMatch[];
  linked: boolean;
  historyReady: boolean;
  onSaved: (draft: SavedDraftSnapshot) => void;
  onDeleted: () => void;
}) {
  useLocale();
  const update = useUpdateDraftSnapshot({ mutation: { retry: false } }),
    remove = useDeleteDraftSnapshot({ mutation: { retry: false } });
  const [chosen, setChosen] = useState(
      draft.chosenHeroId === null ? "" : String(draft.chosenHeroId),
    ),
    [matchId, setMatchId] = useState(draft.matchId ?? "");
  const [saved, setSaved] = useState(false);
  const busy = update.isPending || remove.isPending;
  const unavailable = new Set([
    ...draft.input.allies,
    ...draft.input.enemies,
    ...draft.input.bans,
  ]);
  const choices = heroes.filter(
    (hero) =>
      !unavailable.has(hero.id) &&
      (!draft.input.pool.length || draft.input.pool.includes(hero.id)),
  );
  const heroName = (id: number) =>
    heroes.find((hero) => hero.id === id)?.name ?? `#${id}`;
  const submit = async () => {
    setSaved(false);
    remove.reset();
    const data: UpdateDraftSnapshotBody = {
      chosenHeroId: chosen === "" ? null : Number(chosen),
      matchId: matchId === "" ? null : matchId,
    };
    const value = await update.mutateAsync({ id: draft.id, data });
    onSaved(value);
    setSaved(true);
  };
  return (
    <ToolPanel
      title={`${library.roles[draft.input.role]} · ${dateFormatter.format(new Date(draft.createdAt))}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            [library.draftGroups.allies, draft.input.allies],
            [library.draftGroups.enemies, draft.input.enemies],
            [library.draftGroups.bans, draft.input.bans],
            [library.draftGroups.pool, draft.input.pool],
          ] as const
        ).map(([label, ids]) => (
          <div key={label} className="grid content-start gap-2">
            <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {ids.length ? (
                ids.map((id) => (
                  <Badge key={id} variant="secondary">
                    {heroName(id)}
                  </Badge>
                ))
              ) : (
                <span className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                  {c.noChoice}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        className="grid min-w-0 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit().catch(() => {});
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField>
            <Label htmlFor={`chosen-${draft.id}`}>{c.chooseHero}</Label>
            <ChoiceSelect
              id={`chosen-${draft.id}`}
              label={c.chooseHero}
              value={chosen}
              disabled={busy}
              searchable
              onChange={(value) => {
                setChosen(value);
                setSaved(false);
              }}
              items={[
                { value: "", label: c.noChoice },
                ...heroChoices(choices),
              ]}
            />
          </SelectField>
          <SelectField>
            <Label htmlFor={`match-${draft.id}`}>{c.linkMatch}</Label>
            <ChoiceSelect
              id={`match-${draft.id}`}
              label={c.linkMatch}
              value={matchId}
              disabled={busy || !linked || !historyReady}
              searchable
              onChange={(value) => {
                setMatchId(value);
                setSaved(false);
              }}
              items={[
                { value: "", label: c.noChoice },
                ...(draft.matchId &&
                !matches.some((match) => match.id === draft.matchId)
                  ? [
                      {
                        value: draft.matchId,
                        label: `#${draft.matchId}`,
                        description: library.outsideHistory,
                      },
                    ]
                  : []),
                ...matchChoices(matches),
              ]}
            />
            {!linked ? (
              <Link
                className="field-hint text-link text-[12px] leading-[1.7] m-0 inline-flex items-center gap-1.75 text-primary [@media(hover:_hover)]:[&:hover]:text-foreground"
                to="/account"
              >
                {library.connectMatch}
              </Link>
            ) : null}
          </SelectField>
        </div>
        {draft.matchId ? (
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to={`/matches/${draft.matchId}`}
          >
            {c.openMatch} #{draft.matchId}
          </Link>
        ) : null}
        {update.error ? <RequestError error={update.error} /> : null}
        {remove.error ? <RequestError error={remove.error} /> : null}
        {saved ? (
          <p
            role="status"
            className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0"
          >
            {c.saved}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {update.isPending ? c.saving : c.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            aria-label={library.deleteDraftLabel(draft.id)}
            onClick={() => {
              update.reset();
              void remove
                .mutateAsync({ id: draft.id })
                .then(onDeleted)
                .catch(() => {});
            }}
          >
            {remove.isPending ? c.deleting : c.delete}
          </Button>
        </div>
      </form>
    </ToolPanel>
  );
}
