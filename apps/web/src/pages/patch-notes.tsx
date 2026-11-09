import { useLocale } from "../i18n/react";
import { SelectField } from "../components/ui/select-field";
import { checkboxStyles, inputStyles } from "../components/ui/input";
import { cn } from "../lib/utils";
import { labelStyles } from "../components/ui/label";
import { appText } from "../lib/typography";
import { useState } from "react";
import { ChoiceSelect } from "../components/ui/choice-select";
import { Label } from "../components/ui/label";
import {
  useGetHeroDraftCatalog,
  useGetPatchReferences,
  useGetPatchChanges,
} from "../api/generated/tito";
import { ToolPage, ToolPanel } from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import {
  EvidenceSource,
  SectionStatus,
  EvidenceLimits,
} from "../components/intelligence/common";
import { matchDateFormatter } from "../i18n";
import { intelligenceCopy as t } from "../i18n/intelligence";
export function PatchNotesPage() {
  useLocale();
  const [loadIndex, setLoadIndex] = useState(false);
  const [version, setVersion] = useState("");
  const [pool, setPool] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState<{
    version: string;
    pool: number[];
  } | null>(null);
  const heroes = useGetHeroDraftCatalog({
    query: { staleTime: 24 * 60 * 60_000, retry: false },
  });
  const index = useGetPatchReferences({
    query: {
      enabled: loadIndex,
      staleTime: 60 * 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const notes = useGetPatchChanges(
    request?.version ?? "0.0",
    request?.pool.length ? { heroIds: request.pool.join(",") } : undefined,
    {
      query: {
        enabled: request !== null,
        staleTime: 60 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  );
  const selectedVersion = version || index.data?.data?.[0]?.name || "";
  const names = new Map((heroes.data?.heroes ?? []).map((h) => [h.id, h.name]));
  const current =
    request?.version === selectedVersion &&
    request.pool.join(",") === pool.join(",");
  const data = current ? notes.data : undefined;
  return (
    <ToolPage
      backTo="/tools/reference"
      backLabel={t.reference.title}
      title={t.patch.title}
      description={t.patch.description}
    >
      <ToolPanel title={t.patch.version}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {t.patch.intro}
        </p>
        <div className="select-action-row flex flex-wrap items-end gap-3 [&_>_.select-field]:flex-[1_1_260px] [&_>_.select-field]:max-w-100 [&_>_button]:min-h-12 [&_>_button]:m-0 max-[580px]:[&_>_.select-field]:[flex-basis:100%] max-[580px]:[&_>_.select-field]:max-w-none">
          {index.data?.data?.length ? (
            <SelectField>
              <Label htmlFor="patch-version">{t.patch.version}</Label>
              <ChoiceSelect
                id="patch-version"
                label={t.patch.version}
                value={selectedVersion}
                onChange={setVersion}
                items={index.data.data.map((p) => ({
                  value: p.name,
                  label: p.name,
                  description: p.releasedAt
                    ? matchDateFormatter.format(new Date(p.releasedAt))
                    : undefined,
                }))}
              />
            </SelectField>
          ) : null}
          <Button
            variant="secondary"
            disabled={index.isFetching}
            onClick={() => {
              if (loadIndex) void index.refetch();
              else setLoadIndex(true);
            }}
          >
            {index.isFetching ? t.patch.loading : t.patch.loadIndex}
          </Button>
        </div>
        {index.error ? (
          <RequestError
            error={index.error}
            retry={() => void index.refetch()}
          />
        ) : null}
        {index.data ? (
          <>
            <SectionStatus status={index.data.status} />
            <EvidenceSource section={index.data} />
            <EvidenceLimits items={index.data.limitations} />
          </>
        ) : null}
      </ToolPanel>
      <ToolPanel title={t.patch.pool}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {t.patch.poolHelp}
        </p>
        <label
          className={cn(labelStyles, "m-0 grid w-full max-w-sm gap-2 text-sm")}
        >
          {t.patch.search}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.patch.search}
            className={inputStyles}
          />
        </label>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {pool.length}/10 {t.patch.selected}
        </p>
        <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {(heroes.data?.heroes ?? [])
            .filter((hero) =>
              hero.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((hero) => (
              <label
                key={hero.id}
                className={cn(
                  labelStyles,
                  "mb-0 flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border p-3 text-sm wrap-anywhere",
                )}
              >
                <input
                  type="checkbox"
                  checked={pool.includes(hero.id)}
                  disabled={!pool.includes(hero.id) && pool.length >= 10}
                  onChange={() =>
                    setPool((previous) =>
                      previous.includes(hero.id)
                        ? previous.filter((id) => id !== hero.id)
                        : [...previous, hero.id],
                    )
                  }
                  className={checkboxStyles}
                />
                {hero.name}
              </label>
            ))}
        </div>
        <Button
          disabled={!selectedVersion || notes.isFetching}
          onClick={() => {
            if (current) void notes.refetch();
            else setRequest({ version: selectedVersion, pool: [...pool] });
          }}
        >
          {notes.isFetching ? t.patch.loading : t.patch.loadNotes}
        </Button>
        {heroes.error ? (
          <RequestError
            error={heroes.error}
            retry={() => void heroes.refetch()}
          />
        ) : null}
      </ToolPanel>
      {current && notes.error ? (
        <RequestError error={notes.error} retry={() => void notes.refetch()} />
      ) : null}
      {data ? (
        <>
          <ToolPanel
            title={`${t.patch.version} ${data.data?.version ?? selectedVersion}`}
          >
            <SectionStatus status={data.status} />
            {data.data ? (
              <>
                <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                  {t.patch.released}:{" "}
                  {data.data.releasedAt
                    ? matchDateFormatter.format(new Date(data.data.releasedAt))
                    : t.unknown}
                </p>
                <a
                  href={data.data.sourceUrl}
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.source} ↗
                </a>
              </>
            ) : null}
            <EvidenceSource section={data} />
          </ToolPanel>
          {data.data ? (
            <>
              <ToolPanel title={t.patch.heroes}>
                {data.data.heroChanges.length ? (
                  <div className="space-y-5">
                    {data.data.heroChanges.map((hero) => (
                      <section key={hero.heroId}>
                        <h3 className="m-0 font-medium">
                          {names.get(hero.heroId) ??
                            `${t.patch.hero} ${hero.heroId}`}
                        </h3>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {hero.notes.map((note, i) => (
                            <li key={`${note.kind}:${i}`}>
                              {note.kind === "ability" ? (
                                <span className="font-medium text-foreground">
                                  {t.patch.ability} #{note.abilityId}:{" "}
                                </span>
                              ) : note.kind === "talent" ? (
                                <span className="font-medium text-foreground">
                                  {t.patch.talent}:{" "}
                                </span>
                              ) : null}
                              {appText(note.text)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                    {t.patch.noChanges}
                  </p>
                )}
              </ToolPanel>
              {data.data.generalChanges.length ? (
                <ToolPanel title={t.patch.general}>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {data.data.generalChanges.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </ToolPanel>
              ) : null}
            </>
          ) : null}
          <EvidenceLimits items={data.limitations} />
        </>
      ) : null}
    </ToolPage>
  );
}
