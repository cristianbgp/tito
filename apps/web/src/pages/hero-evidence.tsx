import { serviceText } from "../i18n/service-messages";
import { traitLabel } from "../i18n/traits";
import { useLocale } from "../i18n/react";
import { SelectField } from "../components/ui/select-field";
import { useState } from "react";
import { ItemIdentity } from "../components/match/item-identity";
import { ChoiceSelect } from "../components/ui/choice-select";
import { heroChoices } from "../components/match/entity-choices";
import { Label } from "../components/ui/label";
import { Link, useParams } from "react-router";
import {
  useGetHeroDraftCatalog,
  useGetHeroEvidence,
} from "../api/generated/tito";
import { ToolPage, ToolPanel, ToolStats } from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import {
  EvidenceSource,
  SectionStatus,
  EvidenceLimits,
} from "../components/intelligence/common";
import { unavailable, numberFormatter, percentageFormatter } from "../i18n";
import { intelligenceCopy as t } from "../i18n/intelligence";
export function HeroEvidencePage() {
  useLocale();
  const params = useParams();
  const [heroId, setHeroId] = useState(
    params.heroId && /^[1-9]\d{0,3}$/.test(params.heroId) ? params.heroId : "1",
  );
  const [loadedHero, setLoadedHero] = useState<number | null>(null);
  const catalog = useGetHeroDraftCatalog({
    query: { staleTime: 24 * 60 * 60_000, retry: false },
  });
  const evidence = useGetHeroEvidence(String(loadedHero ?? 0), {
    query: {
      enabled: loadedHero !== null,
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const heroes = catalog.data?.heroes ?? [];
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const data = loadedHero === Number(heroId) ? evidence.data : undefined;
  return (
    <ToolPage title={t.reference.title} description={t.reference.description}>
      <Link
        className={
          "text-link justify-self-start inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
        }
        to="/tools/patches"
      >
        {t.patch.title}
      </Link>
      <ToolPanel title={t.reference.choose}>
        <div className="select-action-row flex flex-wrap items-end gap-3 [&_>_.select-field]:flex-[1_1_260px] [&_>_.select-field]:max-w-100 [&_>_button]:min-h-16 [&_>_button]:m-0 max-[580px]:[&_>_.select-field]:[flex-basis:100%] max-[580px]:[&_>_.select-field]:max-w-none">
          <SelectField>
            <Label htmlFor="reference-hero">{t.reference.choose}</Label>
            <ChoiceSelect
              id="reference-hero"
              label={t.reference.choose}
              value={heroId}
              onChange={setHeroId}
              searchable
              disabled={catalog.isLoading}
              items={
                heroes.length
                  ? heroChoices(heroes)
                  : [
                      {
                        value: heroId,
                        label: `${t.reference.unknownHero} ${heroId}`,
                      },
                    ]
              }
            />
          </SelectField>
          <Button
            disabled={evidence.isFetching || catalog.isLoading}
            onClick={() => {
              if (loadedHero === Number(heroId)) void evidence.refetch();
              else setLoadedHero(Number(heroId));
            }}
          >
            {evidence.isFetching ? t.reference.loading : t.reference.load}
          </Button>
        </div>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {t.reference.intro}
        </p>
        {catalog.error ? (
          <RequestError
            error={catalog.error}
            retry={() => void catalog.refetch()}
          />
        ) : null}
      </ToolPanel>
      {loadedHero === Number(heroId) && evidence.error ? (
        <RequestError
          error={evidence.error}
          retry={() => void evidence.refetch()}
        />
      ) : null}
      {data ? (
        <>
          <ToolPanel
            title={
              data.catalog.data?.name ??
              names.get(data.heroId) ??
              `${t.reference.unknownHero} ${data.heroId}`
            }
          >
            <SectionStatus status={data.catalog.status} />
            {data.catalog.data ? (
              <div className="flex min-w-0 flex-wrap items-start gap-5">
                {data.catalog.data.image ? (
                  <img
                    className="h-20 w-32 shrink-0 rounded-lg object-cover"
                    src={data.catalog.data.image}
                    alt=""
                  />
                ) : null}
                <ToolStats className="flex-[1_1_220px]">
                  <div>
                    <dt>{t.reference.roleTags}: </dt>
                    <dd>
                      {data.catalog.data.roles.map(traitLabel).join(", ") ||
                        t.unknown}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.reference.attack}: </dt>
                    <dd>
                      {data.catalog.data.attackType
                        ? traitLabel(data.catalog.data.attackType)
                        : t.unknown}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.reference.attribute}: </dt>
                    <dd>
                      {data.catalog.data.primaryAttribute
                        ? traitLabel(data.catalog.data.primaryAttribute)
                        : t.unknown}
                    </dd>
                  </div>
                </ToolStats>
              </div>
            ) : null}
            <EvidenceSource section={data.catalog} />
          </ToolPanel>
          {data.referenceCards.length ? (
            <ToolPanel title={t.reference.cards}>
              <div
                className={
                  "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
                }
              >
                {data.referenceCards.map((card) => (
                  <article
                    key={serviceText(card.title)}
                    className="rounded-lg border border-border p-4"
                  >
                    <h3 className="m-0 font-medium">
                      {serviceText(card.title)}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {serviceText(card.body)}
                    </p>
                    <a
                      className={
                        "text-link mt-2 inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                      }
                      href={card.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.source} ↗
                    </a>
                  </article>
                ))}
              </div>
            </ToolPanel>
          ) : null}
          <div
            className={
              "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
            }
          >
            <ToolPanel title={t.reference.matchups}>
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                {t.reference.matchupHelp}
              </p>
              <SectionStatus status={data.matchups.status} />
              {data.matchups.data?.length ? (
                <div className="min-w-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2">
                          {t.reference.opponent}
                        </th>
                        <th className="text-right">{t.reference.games}</th>
                        <th className="text-right">{t.reference.winRate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.matchups.data.slice(0, 12).map((m) => (
                        <tr key={m.heroId} className="border-t border-border">
                          <td className="py-2">
                            {names.get(m.heroId) ??
                              `${t.reference.unknownHero} ${m.heroId}`}
                          </td>
                          <td className="text-right tabular-nums">
                            {numberFormatter.format(m.gamesPlayed)}
                          </td>
                          <td className="text-right tabular-nums">
                            {m.winRate == null
                              ? unavailable
                              : percentageFormatter.format(m.winRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <EvidenceSource section={data.matchups} />
            </ToolPanel>
            <ToolPanel title={t.reference.benchmarks}>
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                {t.reference.benchmarkHelp}
              </p>
              <SectionStatus status={data.benchmarks.status} />
              <div className="space-y-4">
                {data.benchmarks.data
                  ?.filter((b) =>
                    [
                      "gold_per_min",
                      "xp_per_min",
                      "last_hits_per_min",
                    ].includes(b.metric),
                  )
                  .map((b) => (
                    <div key={b.metric}>
                      <h3 className="m-0 text-sm font-medium">
                        {t.reference.metrics[
                          b.metric as keyof typeof t.reference.metrics
                        ] ?? b.metric}
                      </h3>
                      <dl className="m-0 mt-2 flex flex-wrap gap-x-5 gap-y-2">
                        {b.percentiles
                          .filter(
                            (p) => p.percentile >= 0.25 && p.percentile <= 0.9,
                          )
                          .slice(0, 5)
                          .map((p) => (
                            <div
                              key={p.percentile}
                              className="grid min-w-0 grid-cols-1 gap-1 border-0 p-0 text-sm"
                            >
                              <dt className="text-xs text-muted-foreground">
                                P{Math.round(p.percentile * 100)}
                              </dt>
                              <dd className="tabular-nums">
                                {numberFormatter.format(p.value)}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  ))}
              </div>
              <EvidenceSource section={data.benchmarks} />
            </ToolPanel>
          </div>
          <ToolPanel title={t.reference.items}>
            <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
              {t.reference.itemHelp}
            </p>
            <SectionStatus status={data.itemPopularity.status} />
            <div
              className={
                "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
              }
            >
              {data.itemPopularity.data?.map((phase) => (
                <section key={phase.phase}>
                  <h3 className="m-0 text-sm font-medium">
                    {t.reference.phases[phase.phase]}
                  </h3>
                  <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {phase.items.slice(0, 5).map((item) => (
                      <li
                        key={item.itemId}
                        className="flex items-center justify-between gap-3 py-1"
                      >
                        <ItemIdentity
                          name={item.name}
                          image={item.image}
                          itemId={item.itemId}
                        />
                        <span className="shrink-0 tabular-nums">
                          {numberFormatter.format(item.count)}{" "}
                          {t.reference.count.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
            <EvidenceSource section={data.itemPopularity} />
          </ToolPanel>
          <EvidenceLimits items={data.limitations} />
        </>
      ) : null}
    </ToolPage>
  );
}
