import { useLocale } from "../i18n/react";
import { SelectField } from "../components/ui/select-field";
import { useState } from "react";
import { ItemIdentity } from "../components/match/item-identity";
import { ChoiceSelect } from "../components/ui/choice-select";
import { matchChoices } from "../components/match/entity-choices";
import { Label } from "../components/ui/label";
import { Link } from "react-router";
import {
  getGetSavedHistoryQueryKey,
  useGetSavedHistory,
  useGetMatchEvidence,
} from "../api/generated/tito";
import type {
  RecentMatch,
  MatchEvidencePlayersItem,
  PurchaseEvent,
} from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import { EvidenceLimits } from "../components/intelligence/common";
import {
  unavailable,
  duration,
  matchDateFormatter,
  numberFormatter,
} from "../i18n";
import { intelligenceCopy } from "../i18n/intelligence";
const historyParams = { limit: 1000 };
const metrics = [
  "kills",
  "deaths",
  "assists",
  "goldPerMinute",
  "experiencePerMinute",
] as const;
function recordedTime(seconds: number) {
  return duration(seconds);
}
function numeric(value: number | null | undefined) {
  const t = intelligenceCopy.compare;
  return value == null ? t.unknown : numberFormatter.format(value);
}
function difference(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  const t = intelligenceCopy.compare;
  return a == null || b == null
    ? t.unknown
    : `${b - a > 0 ? "+" : ""}${numberFormatter.format(b - a)}`;
}
export function ComparePage() {
  useLocale();
  const t = intelligenceCopy.compare;
  const identity = useToolIdentity();
  return (
    <ToolPage title={t.title} description={t.description}>
      <PrivateTool steam>
        <OwnComparison key={identity.key.join(":")} identity={identity} />
      </PrivateTool>
    </ToolPage>
  );
}
function OwnComparison({
  identity,
}: {
  identity: ReturnType<typeof useToolIdentity>;
}) {
  useLocale();
  const t = intelligenceCopy.compare;
  const history = useGetSavedHistory(historyParams, {
    query: {
      queryKey: [...getGetSavedHistoryQueryKey(historyParams), ...identity.key],
      enabled:
        identity.signedIn && Boolean(identity.steamId) && !identity.loading,
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const [firstId, setFirstId] = useState<string | null>(null);
  const [secondId, setSecondId] = useState<string | null>(null);
  const matches = (history.data?.matches ?? []).filter(
    (match) => match.accountId === history.data?.accountId,
  );
  const first = matches.find((match) => match.id === firstId) ?? matches[0];
  const second =
    matches.find((match) => match.id === secondId && match.id !== first?.id) ??
    matches.find((match) => match.id !== first?.id);
  return (
    <>
      <ToolPanel title={t.choose}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {t.ownOnly}
        </p>
        {history.isLoading ? (
          <p
            className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
            role="status"
          >
            {t.loading}
          </p>
        ) : null}
        {history.error ? (
          <RequestError
            error={history.error}
            retry={() => void history.refetch()}
          />
        ) : null}
        {matches.length >= 2 ? (
          <div
            className={
              "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
            }
          >
            <SelectField>
              <Label htmlFor="compare-first">{t.first}</Label>
              <ChoiceSelect
                id="compare-first"
                label={t.first}
                value={first?.id ?? ""}
                onChange={setFirstId}
                items={matchChoices(matches)}
                searchable
              />
            </SelectField>
            <SelectField>
              <Label htmlFor="compare-second">{t.second}</Label>
              <ChoiceSelect
                id="compare-second"
                label={t.second}
                value={second?.id ?? ""}
                onChange={setSecondId}
                items={matchChoices(
                  matches.filter((match) => match.id !== first?.id),
                )}
                searchable
              />
            </SelectField>
          </div>
        ) : !history.isLoading ? (
          <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
            {t.empty}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to="/"
          >
            {t.history}
          </Link>
          <Button
            variant="secondary"
            disabled={history.isFetching}
            onClick={() => void history.refetch()}
          >
            {t.refresh}
          </Button>
        </div>
      </ToolPanel>
      {first && second ? (
        <>
          <SummaryComparison first={first} second={second} />
          <ReplayComparison
            key={`${first.id}:${second.id}`}
            first={first}
            second={second}
            accountId={history.data!.accountId}
          />
        </>
      ) : null}
    </>
  );
}
function SummaryComparison({
  first,
  second,
}: {
  first: RecentMatch;
  second: RecentMatch;
}) {
  useLocale();
  const t = intelligenceCopy.compare;
  const contextRows = [
    { label: t.hero, a: first.hero, b: second.hero },
    {
      label: t.result,
      a: first.result ? t[first.result] : t.unknown,
      b: second.result ? t[second.result] : t.unknown,
    },
    {
      label: t.date,
      a: matchDateFormatter.format(new Date(first.startedAt * 1000)),
      b: matchDateFormatter.format(new Date(second.startedAt * 1000)),
    },
    {
      label: t.duration,
      a: duration(first.duration),
      b: duration(second.duration),
    },
    { label: t.mode, a: numeric(first.gameMode), b: numeric(second.gameMode) },
    { label: t.patch, a: numeric(first.patch), b: numeric(second.patch) },
    {
      label: t.role,
      a: first.actualRole ?? t.unknown,
      b: second.actualRole ?? t.unknown,
    },
  ];
  const unknownContext =
    first.gameMode == null ||
    second.gameMode == null ||
    first.patch == null ||
    second.patch == null;
  return (
    <>
      <ToolPanel title={t.summary}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="p-2 text-left">
                  {t.metric}
                </th>
                <th scope="col" className="p-2 text-right">
                  {t.first} · #{first.id}
                </th>
                <th scope="col" className="p-2 text-right">
                  {t.second} · #{second.id}
                </th>
                <th scope="col" className="p-2 text-right">
                  {t.difference}
                </th>
              </tr>
            </thead>
            <tbody>
              {contextRows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th
                    scope="row"
                    className="p-2 text-left font-normal text-muted-foreground"
                  >
                    {row.label}
                  </th>
                  <td className="p-2 text-right">{row.a}</td>
                  <td className="p-2 text-right">{row.b}</td>
                  <td className="p-2 text-right">{unavailable}</td>
                </tr>
              ))}
              {metrics.map((metric) => (
                <tr
                  key={metric}
                  className="border-t border-border tabular-nums"
                >
                  <th
                    scope="row"
                    className="p-2 text-left font-normal text-muted-foreground"
                  >
                    {t[metric]}
                  </th>
                  <td className="p-2 text-right">{numeric(first[metric])}</td>
                  <td className="p-2 text-right">{numeric(second[metric])}</td>
                  <td className="p-2 text-right">
                    {difference(first[metric], second[metric])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ToolPanel>
      <ToolPanel title={t.context}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
          {t.caution}
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {first.gameMode != null &&
          second.gameMode != null &&
          first.gameMode !== second.gameMode ? (
            <li>{t.modeDifferent}</li>
          ) : null}
          {first.patch != null &&
          second.patch != null &&
          first.patch !== second.patch ? (
            <li>{t.patchDifferent}</li>
          ) : null}
          {unknownContext ? <li>{t.contextUnknown}</li> : null}
        </ul>
      </ToolPanel>
    </>
  );
}
function firstPurchases(player: MatchEvidencePlayersItem | undefined) {
  const items = new Map<string, PurchaseEvent>();
  for (const event of player?.itemTimings ?? []) {
    const previous = items.get(event.key);
    if (!previous || event.time < previous.time) items.set(event.key, event);
  }
  return items;
}
function ReplayComparison({
  first,
  second,
  accountId,
}: {
  first: RecentMatch;
  second: RecentMatch;
  accountId: string;
}) {
  useLocale();
  const t = intelligenceCopy.compare;
  const [enabled, setEnabled] = useState(false);
  const [metric, setMetric] = useState<"gold" | "experience" | "lastHits">(
    "gold",
  );
  const options = {
    query: {
      enabled,
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  };
  const a = useGetMatchEvidence(first.id, options);
  const b = useGetMatchEvidence(second.id, options);
  const playerA = enabled
    ? a.data?.players.find((player) => player.accountId === accountId)
    : undefined;
  const playerB = enabled
    ? b.data?.players.find((player) => player.accountId === accountId)
    : undefined;
  const purchasesA = firstPurchases(playerA);
  const purchasesB = firstPurchases(playerB);
  const itemKeys = [...new Set([...purchasesA.keys(), ...purchasesB.keys()])]
    .sort(
      (left, right) =>
        Math.min(
          purchasesA.get(left)?.time ?? Infinity,
          purchasesB.get(left)?.time ?? Infinity,
        ) -
        Math.min(
          purchasesA.get(right)?.time ?? Infinity,
          purchasesB.get(right)?.time ?? Infinity,
        ),
    )
    .slice(0, 30);
  const samplesB = new Map(
    playerB?.minuteSamples.map((sample) => [sample.time, sample]),
  );
  const samples = (playerA?.minuteSamples ?? [])
    .flatMap((sample) => {
      const other = samplesB.get(sample.time);
      const valueA = sample[metric];
      const valueB = other?.[metric];
      return valueA == null || valueB == null
        ? []
        : [{ time: sample.time, a: valueA, b: valueB }];
    })
    .slice(0, 121);
  const complete = enabled && a.data && b.data;
  return (
    <ToolPanel title={t.detail}>
      <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
        {t.detailHelp}
      </p>
      <Button
        variant="secondary"
        disabled={a.isFetching || b.isFetching}
        onClick={() => {
          if (enabled) {
            void a.refetch();
            void b.refetch();
          } else setEnabled(true);
        }}
      >
        {a.isFetching || b.isFetching ? t.loadingDetail : t.load}
      </Button>
      {a.error ? <RequestError error={a.error} /> : null}
      {b.error ? <RequestError error={b.error} /> : null}
      {complete ? (
        <div className="grid min-w-0 gap-5">
          {!playerA || !playerB ? (
            <p
              role="status"
              className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere"
            >
              {t.missingPlayer}
            </p>
          ) : (
            <>
              <section className="grid min-w-0 gap-3">
                <h3 className="m-0 font-medium">{t.purchases}</h3>
                <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                  {t.purchasesHelp}
                </p>
                {itemKeys.length ? (
                  <div className="min-w-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th scope="col" className="p-2 text-left">
                            {t.item}
                          </th>
                          <th scope="col" className="p-2 text-right">
                            {t.first}
                          </th>
                          <th scope="col" className="p-2 text-right">
                            {t.second}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemKeys.map((key) => (
                          <tr key={key} className="border-t border-border">
                            <th
                              scope="row"
                              className="p-2 text-left font-normal"
                            >
                              <ItemIdentity
                                name={
                                  purchasesA.get(key)?.name ??
                                  purchasesB.get(key)?.name
                                }
                                image={
                                  purchasesA.get(key)?.image ??
                                  purchasesB.get(key)?.image
                                }
                                itemId={
                                  purchasesA.get(key)?.itemId ??
                                  purchasesB.get(key)?.itemId
                                }
                                itemKey={key}
                              />
                            </th>
                            <td className="p-2 text-right tabular-nums">
                              {purchasesA.has(key)
                                ? recordedTime(purchasesA.get(key)!.time)
                                : t.noRecord}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {purchasesB.has(key)
                                ? recordedTime(purchasesB.get(key)!.time)
                                : t.noRecord}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                    {t.noPurchases}
                  </p>
                )}
              </section>
              <section className="grid min-w-0 gap-3">
                <h3 className="m-0 font-medium">{t.samples}</h3>
                <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                  {t.samplesHelp}
                </p>
                <SelectField className="max-w-xs">
                  <Label htmlFor="compare-metric">{t.sampleMetric}</Label>
                  <ChoiceSelect
                    id="compare-metric"
                    label={t.sampleMetric}
                    value={metric}
                    onChange={(value) => setMetric(value as typeof metric)}
                    items={[
                      { value: "gold", label: t.gold },
                      { value: "experience", label: t.xp },
                      { value: "lastHits", label: t.lastHits },
                    ]}
                  />
                </SelectField>
                {samples.length ? (
                  <div className="min-w-0 max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {[t.time, t.first, t.second, t.difference].map(
                            (heading) => (
                              <th
                                scope="col"
                                key={heading}
                                className="p-2 text-right first:text-left"
                              >
                                {heading}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {samples.map((sample) => (
                          <tr
                            key={sample.time}
                            className="border-t border-border tabular-nums"
                          >
                            <th
                              scope="row"
                              className="p-2 text-left font-normal"
                            >
                              {recordedTime(sample.time)}
                            </th>
                            <td className="p-2 text-right">
                              {numeric(sample.a)}
                            </td>
                            <td className="p-2 text-right">
                              {numeric(sample.b)}
                            </td>
                            <td className="p-2 text-right">
                              {difference(sample.a, sample.b)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                    {t.noSamples}
                  </p>
                )}
              </section>
            </>
          )}
          <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
            {t.partial}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={a.data!.sourceUrl}
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
              target="_blank"
              rel="noreferrer"
            >
              {t.sourceA} ↗
            </a>
            <a
              href={b.data!.sourceUrl}
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
              target="_blank"
              rel="noreferrer"
            >
              {t.sourceB} ↗
            </a>
          </div>
          <EvidenceLimits
            items={[
              ...new Set([...a.data!.limitations, ...b.data!.limitations]),
            ]}
          />
        </div>
      ) : null}
    </ToolPanel>
  );
}
