import { traitLabel, searchText } from "../../i18n/traits";
import { useLocale } from "../../i18n/react";
import { SelectField } from "../ui/select-field";
import { checkboxStyles } from "../ui/input";
import { labelStyles } from "../ui/label";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import type {
  DraftHero,
  HeroDraftInput,
  HeroDraftResult,
} from "../../api/generated/models";
import { copy, matchDateFormatter } from "../../i18n";
import {
  draftKey,
  editDraft,
  emptyDraft,
  groupLimits,
  loadDraft,
  saveDraft,
  type DraftGroup,
  type LocalDraft,
} from "../../lib/hero-draft";
import { Card } from "../ui/card";
import { Button, buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Alert } from "../ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { AssetImage } from "../match/asset-image";
import { BrandMark } from "../brand";
import { LocalDraftImport } from "./local-import";
import { DraftLibraryActions } from "./library-actions";
const groups = ["allies", "enemies", "bans", "pool"] as const;
function Portrait({ hero }: { hero: DraftHero }) {
  useLocale();
  return (
    <AssetImage
      src={hero.image}
      fallback={hero.name.slice(0, 2)}
      className={
        "draft-portrait block w-full [aspect-ratio:16_/_9] h-auto rounded-[5px] overflow-hidden [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
      }
    />
  );
}
function Recommendation({
  recommendation: r,
  rank,
}: {
  recommendation: HeroDraftResult["recommendations"][number];
  rank?: number;
}) {
  useLocale();
  const c = copy.draft;
  return (
    <li>
      <div className="draft-recommendation-header flex items-center gap-2.5 mb-3.5 [&_.draft-portrait]:w-14.5 [&_.draft-portrait]:h-8.5 [&_.draft-portrait]:shrink-0 max-[1200px]:flex-wrap max-[580px]:flex-nowrap">
        {rank ? (
          <span className="draft-rank [font:10px_var(--font-mono)] text-muted-foreground">
            0{rank}
          </span>
        ) : null}
        <Portrait hero={r.hero} />
        <div>
          <h4 className="text-[14px] font-semibold">{r.hero.name}</h4>
          <span className="draft-fit text-[10px] text-[var(--success)] block mt-1.25">
            {r.fit >= 3
              ? c.fit.good
              : r.fit >= 2
                ? c.fit.possible
                : c.fit.limited}
          </span>
        </div>
      </div>
      <p>{c.reasons[r.reason]}</p>
      <p className="draft-tradeoff [&_strong]:font-medium [&_strong]:text-foreground">
        <strong>{c.consider}</strong> {c.tradeoffs[r.tradeoff]}
      </p>
      {r.favorite || r.savedGames > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {r.favorite ? <Badge variant="secondary">{c.favorite}</Badge> : null}
          {r.savedGames > 0 ? (
            <Badge variant="secondary">{c.experience(r.savedGames)}</Badge>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
export function HeroPickerTool({
  heroes,
  retrievedAt,
  enabled,
  signedIn,
  steamConnected,
  onSuggest,
  storageScope = "guest",
}: {
  heroes: DraftHero[];
  retrievedAt: string;
  enabled: boolean;
  signedIn: boolean;
  steamConnected: boolean;
  onSuggest: (input: HeroDraftInput) => Promise<HeroDraftResult>;
  storageScope?: string;
}) {
  useLocale();
  const c = copy.draft;
  const [draft, setDraft] = useState<LocalDraft>(() => {
    try {
      return loadDraft(localStorage, Date.now(), storageScope);
    } catch {
      return emptyDraft();
    }
  });
  const [group, setGroup] = useState<DraftGroup>("allies");
  const [search, setSearch] = useState("");
  const requestEpoch = useRef(0);
  const [result, setResult] = useState<HeroDraftResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [failedResult, setFailedResult] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!result) {
      setExpired(false);
      return;
    }
    const remaining = Date.parse(result.expiresAt) - Date.now();
    setExpired(remaining <= 0);
    if (remaining <= 0) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.min(remaining, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [result]);
  useEffect(() => {
    try {
      setStorageOk(saveDraft(localStorage, draft, Date.now(), storageScope));
    } catch {
      setStorageOk(false);
    }
  }, [draft, storageScope]);
  const used = new Set([...draft.allies, ...draft.enemies, ...draft.bans]);
  const sameDraft = result && draftKey(result.input) === draftKey(draft);
  const current = sameDraft && !failedResult && !expired;
  const favoriteRecommendations = (
    result?.favoriteRecommendations ?? []
  ).filter(
    (r, index, recommendations) =>
      !result?.recommendations.some((main) => main.hero.id === r.hero.id) &&
      recommendations.findIndex((other) => other.hero.id === r.hero.id) ===
        index,
  );
  const filtered = heroes.filter((h) =>
    searchText(
      `${h.name} ${h.roles.join(" ")} ${h.roles.map(traitLabel).join(" ")}`,
    ).includes(searchText(search)),
  );
  async function suggest() {
    if (!draft.role || busy) return;
    const epoch = ++requestEpoch.current;
    setBusy(true);
    setError(null);
    try {
      const next = await onSuggest({ ...draft, role: draft.role });
      if (epoch === requestEpoch.current) {
        setResult(next);
        setFailedResult(false);
      }
    } catch (e) {
      if (epoch === requestEpoch.current) {
        setError(e instanceof Error ? e.message : copy.errors.generic);
        setFailedResult(true);
      }
    } finally {
      if (epoch === requestEpoch.current) setBusy(false);
    }
  }
  function reset() {
    requestEpoch.current++;
    setBusy(false);
    setFailedResult(false);
    setDraft(emptyDraft());
    setResult(null);
    setError(null);
    setGroup("allies");
    setSearch("");
  }
  return (
    <div
      className={
        "draft-layout grid grid-cols-[minmax(0,_1fr)_340px] gap-6 items-start max-[1200px]:grid-cols-[minmax(0,_1fr)]"
      }
    >
      <div className={"draft-workspace grid gap-6 min-w-0"}>
        <Card
          className="draft-board p-6 min-w-0 wrap-anywhere [&_h2]:text-[22px] [&_h2]:tracking-[-0.6px] max-[580px]:p-5"
          render={<section aria-label={c.board} />}
        >
          <div className="draft-board-heading flex items-center justify-between gap-4 mb-5.5 [&_.eyebrow]:text-[9px] [&_.eyebrow]:mb-2 [&_.button]:text-[11px] [&_.button]:py-2.5 [&_.button]:px-3 [&_.button]:min-h-10 [&_.button]:shrink-0">
            <div>
              <p className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3.5">
                {c.manual}
              </p>
              <h2>{c.board}</h2>
            </div>
            <Button variant="secondary" onClick={reset}>
              {c.reset}
            </Button>
          </div>
          <SelectField className="draft-role grid-cols-[90px_minmax(0,_260px)] items-center mb-6 [&_label]:text-[12px] [&_label]:text-muted-foreground [&_[data-slot=select-trigger]]:text-[14px] [&_[data-slot=select-trigger]]:min-h-12 [&_[data-slot=select-trigger]]:py-2.75 [&_[data-slot=select-trigger]]:px-3 max-[580px]:grid-cols-[minmax(0,_1fr)] max-[580px]:gap-2.5 [&.select-field]:grid-cols-[minmax(0,_1fr)] [&.select-field]:max-w-80 [&.select-field]:gap-2">
            <Label htmlFor="draft-role">{c.role}</Label>
            <Select
              items={copy.profile.roles}
              value={draft.role}
              onValueChange={(role) =>
                setDraft((d) => ({ ...d, role: role as LocalDraft["role"] }))
              }
            >
              <SelectTrigger id="draft-role" aria-label={c.role}>
                <SelectValue placeholder={c.chooseRole} />
              </SelectTrigger>
              <SelectContent>
                {copy.profile.roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectField>
          <div
            className={
              "draft-groups [&_.draft-group-allies_.draft-group-select]:text-[var(--success)] [&_.draft-group-enemies_.draft-group-select]:text-[var(--danger)] grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3 max-[580px]:grid-cols-[minmax(0,_1fr)]"
            }
          >
            {groups.map((key) => (
              <section
                className={`border border-border bg-[var(--surface-raised)] rounded-[14px] overflow-hidden min-w-0 [&.is-selected]:[border-color:var(--accent)] [&.is-selected]:bg-[var(--selected)] draft-group draft-group-${key}${group === key ? " is-selected" : ""}`}
                key={key}
                aria-label={c.groups[key]}
              >
                <Button
                  variant="unstyled"
                  className="draft-group-select flex justify-between gap-2.5 items-center p-3.5 w-full text-[12px] font-semibold text-left min-h-11 [&_>_span]:[font:10px_var(--font-mono)] [&_>_span]:text-muted-foreground [&_>_span]:whitespace-nowrap max-[580px]:p-3"
                  aria-pressed={group === key}
                  onClick={() => setGroup(key)}
                >
                  {c.groups[key]}{" "}
                  <span>
                    {draft[key].length} / {groupLimits[key]}
                  </span>
                </Button>
                <div className="draft-chips flex flex-wrap gap-1.5 pt-0 px-3 pb-3 min-h-14 content-start">
                  {draft[key].map((id) => {
                    const hero = heroes.find((h) => h.id === id);
                    return (
                      <Button
                        variant="unstyled"
                        className="draft-chip flex items-center gap-1.75 border border-border bg-[var(--surface)] rounded-[7px] py-1 pr-1.75 pl-1 min-h-9 text-[10px] text-left max-w-full [&_.draft-portrait]:w-8.75 [&_.draft-portrait]:h-5.5 [&_.draft-portrait]:shrink-0 [&_.draft-portrait]:rounded-[4px] [&_>_span:last-child]:ml-auto [&_>_span:last-child]:text-muted-foreground [&_>_span:last-child]:text-[14px] max-[580px]:min-h-11"
                        key={id}
                        aria-label={c.remove(
                          hero?.name ?? c.unknownHero(id),
                          key,
                        )}
                        onClick={() => setDraft((d) => editDraft(d, key, id))}
                      >
                        {hero ? <Portrait hero={hero} /> : null}
                        <span>{hero?.name ?? c.unknownHero(id)}</span>
                        <span aria-hidden="true">×</span>
                      </Button>
                    );
                  })}
                  {!draft[key].length ? (
                    <p className="draft-placeholder text-muted-foreground text-[11px] py-0 px-0.5">
                      {key === "pool" ? c.emptyPool : c.emptyGroup}
                    </p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
          <p className="text-[11px] leading-[1.7] text-muted-foreground mt-3">
            {c.favoritesHelp}
          </p>
          <div
            className={
              "draft-preferences pt-4.5 mt-5 [border-top:1px_solid_var(--line)] [&_label]:flex [&_label]:items-center [&_label]:gap-2.5 [&_label]:text-[12px] [&_label]:min-h-11 [&_label]:mb-0 [&_input]:size-4 [&_input]:min-h-4 [&_input]:p-0 [&_p]:text-[10px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_p]:mt-2"
            }
          >
            <label className={labelStyles}>
              <input
                type="checkbox"
                checked={steamConnected && draft.useHistory}
                disabled={!steamConnected}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, useHistory: e.target.checked }))
                }
                className={checkboxStyles}
              />
              <span>{c.useHistory}</span>
            </label>
            <p>{steamConnected ? c.historyHelp : c.connectHistory}</p>
            <label className={labelStyles}>
              <input
                type="checkbox"
                checked={draft.useEvidence === true}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, useEvidence: e.target.checked }))
                }
                className={checkboxStyles}
              />
              <span>{c.useEvidence}</span>
            </label>
            <p>{c.evidenceHelp}</p>
          </div>
          {signedIn ? (
            <>
              <DraftLibraryActions
                draft={draft}
                onPool={(pool) => setDraft((d) => ({ ...d, pool }))}
              />
              <LocalDraftImport
                onImport={(state) =>
                  setDraft((d) => (d === draft ? { ...d, ...state } : d))
                }
              />
            </>
          ) : null}
          <p
            className={
              "draft-local-note text-[10px] leading-[1.7] text-muted-foreground mt-4"
            }
          >
            {storageOk ? c.localSave : c.localFailed}
          </p>
        </Card>
        <Card
          className="draft-catalog p-6 min-w-0 wrap-anywhere [&_h2]:text-[22px] [&_h2]:tracking-[-0.6px] [&_.field-hint]:mt-2.5 [&_.field-hint]:leading-[1.7] [&_>_label]:block [&_>_label]:text-[12px] [&_>_label]:mb-2.5 [&_input]:text-[16px] max-[580px]:p-5"
          render={<section aria-label={c.catalog} />}
        >
          <div
            className={
              "draft-catalog-heading flex items-center justify-between gap-4 mb-5.5 [&_.eyebrow]:text-[9px] [&_.eyebrow]:mb-2"
            }
          >
            <div>
              <p className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3.5">
                {c.addingTo}
              </p>
              <h2>{c.groups[group]}</h2>
            </div>
            <Badge>
              {draft[group].length} / {groupLimits[group]}
            </Badge>
          </div>
          <div
            className="draft-destination grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-1 p-1 border border-border rounded-[12px] bg-[var(--surface-raised)] mb-4.5 [&_button]:py-2.5 [&_button]:px-1.5 [&_button]:text-[10px] [&_button]:min-h-10 [&_button]:rounded-[8px] [&_button]:text-muted-foreground [&_button[aria-pressed=true]]:bg-[var(--selected)] [&_button[aria-pressed=true]]:text-foreground max-[580px]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
            role="group"
            aria-label={c.addingTo}
          >
            {groups.map((key) => (
              <Button
                key={key}
                variant="unstyled"
                aria-pressed={group === key}
                onClick={() => setGroup(key)}
              >
                {c.groups[key]}
              </Button>
            ))}
          </div>
          <Label htmlFor="draft-search">{c.search}</Label>
          <Input
            id="draft-search"
            type="search"
            placeholder={c.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p
            className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
            role="status"
          >
            {c.visibleHeroes(filtered.length)} · {c.selectHelp}
          </p>
          <div
            className="draft-hero-grid grid grid-cols-[repeat(auto-fill,_minmax(84px,_1fr))] gap-2 max-h-100 overflow-auto [overscroll-behavior:contain] mt-4.5 p-1 content-start [scrollbar-width:thin] max-[580px]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[580px]:gap-1.5 max-[580px]:max-h-90"
            role="region"
            aria-label={c.catalog}
            tabIndex={0}
          >
            {filtered.map((hero) => {
              const selected = draft[group].includes(hero.id);
              const disabled =
                !selected &&
                (draft[group].length >= groupLimits[group] ||
                  (group !== "pool" && used.has(hero.id)));
              return (
                <Button
                  variant="unstyled"
                  className="draft-hero-tile relative flex flex-col gap-1.5 items-stretch text-left border border-border rounded-[9px] p-1.25 bg-[var(--surface-raised)] min-w-0 min-h-21 text-[10px] text-muted-foreground [&[aria-pressed=true]]:[border-color:var(--accent)] [&[aria-pressed=true]]:bg-[var(--selected)] [&[aria-pressed=true]]:text-foreground [&:disabled]:opacity-[0.35] [&:disabled]:cursor-default [&_>_span:nth-child(2)]:pt-0 [&_>_span:nth-child(2)]:px-0.5 [&_>_span:nth-child(2)]:pb-0.75 [&_>_span:nth-child(2)]:leading-[1.4]"
                  key={hero.id}
                  aria-label={
                    selected
                      ? c.remove(hero.name, group)
                      : c.add(hero.name, group)
                  }
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => setDraft((d) => editDraft(d, group, hero.id))}
                >
                  <Portrait hero={hero} />
                  <span>{hero.name}</span>
                  {selected ? (
                    <span
                      className={
                        "draft-selected-mark absolute top-1.75 right-1.75 bg-[var(--accent)] text-[var(--accent-ink)] w-4.25 h-4.25 rounded-[50%] text-center text-[11px]"
                      }
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  ) : null}
                </Button>
              );
            })}
            {!filtered.length ? (
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
                {c.noHeroes}
              </p>
            ) : null}
          </div>
          <p
            className={
              "draft-catalog-source mt-4 text-muted-foreground text-[10px] leading-[1.7]"
            }
          >
            {c.catalogDate(matchDateFormatter.format(new Date(retrievedAt)))}
          </p>
        </Card>
      </div>
      <Card
        className="draft-options p-6 min-w-0 wrap-anywhere sticky top-6 [&_h2]:text-[22px] [&_h2]:tracking-[-0.6px] [&_>_.button]:w-full [&_>_.button]:min-h-11 [&_>_.button]:text-[12px] [&_.notice]:text-[12px] [&_.notice]:leading-[1.7] [&_.notice]:mt-4 [&_.notice_>_p]:mt-2 max-[1200px]:[position:static] max-[580px]:p-5"
        render={<section aria-label={c.options} />}
      >
        <div
          className={
            "draft-options-heading flex items-center gap-3 mb-5 [&_.brand-orb]:w-9.5 [&_.brand-orb]:h-9.5 [&_.eyebrow]:text-[8px] [&_.eyebrow]:mb-1.75"
          }
        >
          <BrandMark />
          <div>
            <p className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3.5">
              {c.decisions}
            </p>
            <h2>{c.options}</h2>
          </div>
        </div>
        <p
          className={
            "draft-options-intro text-muted-foreground text-[13px] leading-[1.75] mb-5"
          }
        >
          {c.intro}
        </p>
        {!signedIn ? (
          <Link className={buttonVariants()} to="/signin">
            {c.signIn}
          </Link>
        ) : !enabled ? (
          <Alert role="note">
            <strong>{c.unconfigured}</strong>
            <p>{c.unconfiguredHelp}</p>
          </Alert>
        ) : (
          <>
            <Button
              className="draft-suggest"
              disabled={busy || !draft.role}
              onClick={() => void suggest()}
            >
              {busy ? c.suggesting : c.suggest}
            </Button>
            {!draft.role ? (
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                {c.roleRequired}
              </p>
            ) : null}
          </>
        )}
        {busy ? (
          <p
            className={
              "draft-generation-status text-[12px] leading-[1.7] text-muted-foreground mt-4"
            }
            role="status"
          >
            {c.busy}
          </p>
        ) : null}
        {error ? <Alert role="alert">{error}</Alert> : null}
        {result ? (
          <div
            className={`mt-5 [&_>_p:last-child]:mt-3.5 draft-result${!current ? " is-outdated" : ""}`}
          >
            {!current ? (
              <Alert role="status">
                <strong>
                  {sameDraft ? c.previousSuggestions : c.outdated}
                </strong>
                <p>
                  {!sameDraft
                    ? c.outdatedHelp
                    : failedResult
                      ? c.failedHelp
                      : c.expiredHelp}
                </p>
              </Alert>
            ) : (
              <p
                className={
                  "draft-result-caption text-[10px] leading-[1.7] text-muted-foreground"
                }
              >
                {c.assessed(result.evaluatedHeroes)}
              </p>
            )}
            <section aria-label={c.bestFits}>
              <h3 className="text-[13px] font-semibold mt-4">{c.bestFits}</h3>
              <ol className="draft-recommendations [list-style:none] mt-2 [&_>_li]:py-5 [&_>_li]:px-0 [&_>_li]:[border-bottom:1px_solid_var(--line)] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_.draft-tradeoff]:my-2.5 [&_.draft-tradeoff]:mx-0 [&_.ui-badge]:text-[10px] max-[1200px]:grid max-[1200px]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[1200px]:gap-5.5 max-[580px]:grid-cols-[minmax(0,_1fr)] max-[580px]:gap-0">
                {result.recommendations.map((r, index) => (
                  <Recommendation
                    key={r.hero.id}
                    recommendation={r}
                    rank={index + 1}
                  />
                ))}
              </ol>
            </section>
            {favoriteRecommendations.length ? (
              <section aria-label={c.fromFavorites} className="mt-5">
                <h3 className="text-[13px] font-semibold">{c.fromFavorites}</h3>
                <ul className="draft-favorite-recommendations [list-style:none] mt-2 [&_>_li]:py-3 [&_>_li]:[border-bottom:1px_solid_var(--line)] [&_p]:text-[11px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_.draft-tradeoff]:my-2 [&_.ui-badge]:text-[10px] max-[1200px]:grid max-[1200px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[1200px]:gap-5.5 max-[580px]:grid-cols-[minmax(0,_1fr)] max-[580px]:gap-0">
                  {favoriteRecommendations.map((r) => (
                    <Recommendation key={r.hero.id} recommendation={r} />
                  ))}
                </ul>
              </section>
            ) : null}
            <p
              className={
                "draft-result-caption text-[10px] leading-[1.7] text-muted-foreground"
              }
            >
              {result.personalized
                ? c.historyUsed(result.historyGames)
                : c.noHistory}
            </p>
            {result.evidence ? (
              <div
                className={
                  "draft-result-caption text-[10px] leading-[1.7] text-muted-foreground"
                }
              >
                <p>
                  {c.evidenceCoverage(
                    result.evidence.loadedEnemies,
                    result.evidence.requestedEnemies,
                    result.evidence.matchups,
                  )}
                </p>
                {result.evidence.sources.map((source) => (
                  <p key={source.enemyId}>
                    <a
                      className={
                        "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                      }
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.evidenceSource(
                        heroes.find((h) => h.id === source.enemyId)?.name ??
                          c.unknownHero(source.enemyId),
                      )}
                    </a>
                    {source.fetchedAt
                      ? ` · ${matchDateFormatter.format(new Date(source.fetchedAt))}`
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="draft-options-empty py-7.5 px-0 [border-block:1px_solid_var(--line)] mt-6 text-muted-foreground text-center text-[12px] leading-[1.7] [&_>_span]:block [&_>_span]:text-primary [&_>_span]:text-[28px] [&_>_span]:mb-2.5 [&_+_.draft-caveat]:[border-top:0]">
            <span aria-hidden="true">↗</span>
            <p>{c.emptyResults}</p>
          </div>
        )}
        <p
          className={
            "draft-caveat pt-4.5 mt-5 [border-top:1px_solid_var(--line)] text-muted-foreground text-[10px] leading-[1.8]"
          }
        >
          {c.caveat}
        </p>
      </Card>
    </div>
  );
}
