import { traitLabel } from "../i18n/traits";
import { useLocale } from "../i18n/react";
import { SelectField } from "../components/ui/select-field";
import { copy } from "../i18n";
import { matchText } from "../lib/typography";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  useGetPersonalHeroes,
  useGetPersonalHero,
  getGetPersonalHeroesQueryKey,
  getGetPersonalHeroQueryKey,
} from "../api/generated/tito";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { EmptyState, RequestError } from "../components/shared";
import { AssetImage } from "../components/match/asset-image";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import { HeroStats } from "../components/library/hero-stats";
import { libraryCopy as c } from "../i18n/library";
import { matchDateFormatter, percentageFormatter } from "../i18n";
export function HeroLibraryPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/progress"
      backLabel={copy.nav.progress}
      title={c.heroesTitle}
      description={c.heroesDescription}
    >
      <PrivateTool steam>
        <HeroLibraryContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
function HeroLibraryContent() {
  useLocale();
  const identity = useToolIdentity();
  const [search, setSearch] = useState("");
  const query = useGetPersonalHeroes({
    query: {
      queryKey: [...getGetPersonalHeroesQueryKey(), ...identity.key],
      staleTime: 30000,
    },
  });
  const heroes = query.data?.heroes ?? [];
  const filtered = heroes.filter((row) =>
    row.hero.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? (
        <p role="status">{c.loading}</p>
      ) : query.data ? (
        <>
          {heroes.length ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SelectField className="w-full max-w-sm flex-[1_1_220px]">
                  <Label htmlFor="library-search">{c.heroSearch}</Label>
                  <Input
                    id="library-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </SelectField>
                <Link
                  className={buttonVariants({ variant: "secondary" })}
                  to="/tools/pools"
                >
                  {c.poolsTitle}
                </Link>
              </div>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                {c.scope}
              </p>
              <div
                className={
                  "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
                }
              >
                {filtered.map((row) => (
                  <ToolPanel key={row.hero.id} title={row.hero.name}>
                    <Link
                      className={
                        "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                      }
                      to={`/tools/heroes/${row.hero.id}`}
                    >
                      <AssetImage
                        src={row.hero.image}
                        fallback={row.hero.name.slice(0, 2)}
                        className="h-12 w-20 rounded-lg object-cover"
                      />
                      <span>{c.savedGames(row.games)}</span>
                    </Link>
                    <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-3 [&_>_div]:grid [&_>_div]:min-w-0 [&_>_div]:grid-cols-1 [&_>_div]:gap-1 [&_>_div]:border-0 [&_>_div]:p-0">
                      <div>
                        <dt className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.winRate}
                        </dt>
                        <dd className="m-0 text-lg font-medium tabular-nums">
                          {row.winRate === null
                            ? c.unavailable
                            : percentageFormatter.format(row.winRate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.reviews}
                        </dt>
                        <dd className="m-0 text-lg font-medium tabular-nums">
                          {row.reviewedGames}
                        </dd>
                      </div>
                      <div>
                        <dt className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.notes}
                        </dt>
                        <dd className="m-0 text-lg font-medium tabular-nums">
                          {row.notedGames}
                        </dd>
                      </div>
                    </dl>
                  </ToolPanel>
                ))}
              </div>
              {!filtered.length ? (
                <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                  {c.noSearchHeroes}
                </p>
              ) : null}
            </>
          ) : (
            <ToolPanel title={c.heroesTitle}>
              <EmptyState title={c.heroEmpty}>{c.heroEmptyHelp}</EmptyState>
              <Link className={buttonVariants({ variant: "secondary" })} to="/">
                {c.savedHistory}
              </Link>
            </ToolPanel>
          )}
        </>
      ) : null}
    </>
  );
}
export function PersonalHeroPage() {
  useLocale();
  const identity = useToolIdentity();
  const { heroId } = useParams();
  const id = Number(heroId);
  return (
    <ToolPage
      backTo="/progress"
      backLabel={copy.nav.progress}
      title={c.heroesTitle}
      description={c.heroesDescription}
    >
      <PrivateTool steam>
        {Number.isInteger(id) && id > 0 ? (
          <PersonalHeroContent
            key={`${identity.key.join(":")}:${id}`}
            heroId={id}
          />
        ) : (
          <p role="alert">{c.unknownHero}</p>
        )}
      </PrivateTool>
    </ToolPage>
  );
}
function PersonalHeroContent({ heroId }: { heroId: number }) {
  useLocale();
  const identity = useToolIdentity();
  const query = useGetPersonalHero(heroId, {
    query: {
      queryKey: [...getGetPersonalHeroQueryKey(heroId), ...identity.key],
      staleTime: 30000,
    },
  });
  const hero = query.data;
  return (
    <>
      <Link
        className={
          "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
        }
        to="/tools/heroes"
      >
        ← {c.heroesTitle}
      </Link>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? (
        <p role="status">{c.loading}</p>
      ) : hero ? (
        <>
          <ToolPanel title={hero.hero.name}>
            <div className="flex flex-wrap items-center gap-4">
              <AssetImage
                src={hero.hero.image}
                fallback={hero.hero.name.slice(0, 2)}
                className="h-20 w-36 rounded-xl object-cover"
              />
              <div className="flex flex-wrap gap-2">
                {hero.hero.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {traitLabel(role)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <HeroStats hero={hero} />
            </div>
            <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
              {hero.caution}
            </p>
          </ToolPanel>
          <ToolPanel title={c.recent}>
            {hero.matches.length ? (
              <div className="grid gap-4">
                {hero.matches.map((match) => (
                  <article
                    key={match.matchId}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <Link
                        className={
                          "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                        }
                        to={`/matches/${match.matchId}`}
                      >
                        #{match.matchId} ·{" "}
                        {matchDateFormatter.format(
                          new Date(match.startedAt * 1000),
                        )}
                      </Link>
                      <Badge variant="secondary">
                        {match.result === null
                          ? c.unknownResult
                          : c.resultLabels[match.result]}
                      </Badge>
                    </div>
                    {match.reviewExcerpt ? (
                      <p className="mt-3">{matchText(match.reviewExcerpt)}</p>
                    ) : null}
                    {match.note ? (
                      <div className="mt-3 grid gap-2 rounded-lg bg-muted p-3">
                        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.noteLabel}
                        </p>
                        <p className="m-0 whitespace-pre-wrap break-words">
                          {match.note.text}
                        </p>
                        {match.note.tags.length ? (
                          <div className="flex flex-wrap gap-2">
                            {match.note.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {match.note.actualRole ? (
                          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                            {c.roles[match.note.actualRole]}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                {c.noHeroGames}
              </p>
            )}
          </ToolPanel>
        </>
      ) : null}
    </>
  );
}
