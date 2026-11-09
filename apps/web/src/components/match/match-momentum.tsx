import { useId, useState, useSyncExternalStore } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Popover } from "@base-ui/react/popover";
import type { AdvantagePoint } from "../../api/generated/models";
import { copy, duration, numberFormatter } from "../../i18n";
import { useLocale } from "../../i18n/react";
import { Card } from "../ui/card";
import { Slider } from "../ui/slider";
import { Button, buttonVariants } from "../ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../ui/table";
import { InfoIcon } from "../icons";
import { AdvantagePlot } from "./advantage-plot";
import { momentumRows, goldMoments } from "./match-momentum-model";

const narrowQuery = "(max-width: 800px)";
const isNarrow = () =>
  typeof window !== "undefined" && !!window.matchMedia?.(narrowQuery).matches;
function subscribeNarrow(listener: () => void) {
  const media = window.matchMedia?.(narrowQuery);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}
const desktopSnapshot = () => false;

function lead(value: number | null) {
  if (value == null) return copy.home.unknown;
  return value === 0
    ? copy.match.even
    : copy.match.lead(
        value > 0 ? copy.match.radiant : copy.match.dire,
        numberFormatter.format(Math.abs(value)),
      );
}

function MomentumMetric({
  title,
  value,
  points,
  time,
  endTime,
  onTimeChange,
  markers,
}: {
  title: string;
  value: number | null;
  points: AdvantagePoint[];
  time: number;
  endTime: number;
  onTimeChange: (time: number) => void;
  markers?: number[];
}) {
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="m-0 text-[13px] font-medium text-muted-foreground">
        {title}
      </h3>
      <p
        className={`m-0 mt-2 min-h-7 text-[18px] font-semibold tracking-tight tabular-nums sm:text-[20px] ${value == null || value === 0 ? "text-foreground" : value > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
      >
        {lead(value)}
      </p>
      <div className="mt-4">
        {points.some((point) => point.value != null) ? (
          <AdvantagePlot
            title={title}
            points={points}
            time={time}
            endTime={endTime}
            onTimeChange={onTimeChange}
            markers={markers}
          />
        ) : (
          <div className="flex aspect-[640/250] items-center justify-center text-center text-[13px] leading-relaxed text-muted-foreground">
            {copy.match.seriesUnavailable}
          </div>
        )}
      </div>
    </section>
  );
}

export function MatchMomentum({
  gold,
  xp,
}: {
  gold: AdvantagePoint[];
  xp: AdvantagePoint[];
}) {
  useLocale();
  const id = useId();
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    isNarrow,
    desktopSnapshot,
  );
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [tab, setTab] = useState<string>("gold");
  const rows = momentumRows(gold, xp);
  const moments = goldMoments(gold);
  if (!rows.length || !rows.some((row) => row.gold != null || row.xp != null))
    return null;
  const endTime = rows.at(-1)!.time;
  const time = selectedTime ?? endTime;
  const index = rows.reduce(
    (best, row, i) =>
      Math.abs(row.time - time) < Math.abs(rows[best].time - time) ? i : best,
    0,
  );
  const selected = rows[index];
  const metrics = [
    {
      key: "gold",
      title: copy.match.goldAdvantage,
      value: selected.gold,
      points: rows.map((row) => ({ time: row.time, value: row.gold })),
      markers: moments.map((m) => m.time),
    },
    {
      key: "xp",
      title: copy.match.experienceAdvantage,
      value: selected.xp,
      points: rows.map((row) => ({ time: row.time, value: row.xp })),
    },
  ];
  const metric = ({ key: _key, ...m }: (typeof metrics)[number]) => (
    <MomentumMetric
      {...m}
      time={selected.time}
      endTime={endTime}
      onTimeChange={setSelectedTime}
    />
  );
  return (
    <Card
      render={<section />}
      aria-labelledby={`${id}-heading`}
      className="mt-6 min-w-0"
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2
            id={`${id}-heading`}
            className="m-0 text-[20px] font-semibold tracking-tight"
          >
            {copy.match.momentum}
          </h2>
          <p className="m-0 mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {copy.match.momentumHelp}
          </p>
        </div>
        <Popover.Root>
          <Popover.Trigger
            aria-label={copy.match.timelineAbout}
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "size-11 -mt-2 -mr-2",
            })}
          >
            <InfoIcon size={19} aria-hidden="true" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="end" className="z-50">
              <Popover.Popup className="max-w-[min(320px,calc(100vw-32px))] rounded-2xl border border-border bg-[var(--surface-solid)] p-4 text-[13px] leading-relaxed text-foreground shadow-[var(--shadow)]">
                <Popover.Title className="m-0 text-[13px] font-semibold">
                  {copy.match.timelineAbout}
                </Popover.Title>
                <Popover.Description className="m-0 mt-2 text-muted-foreground">
                  {copy.match.sampleTime} {copy.match.sampleMissing}
                </Popover.Description>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </header>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium">
          <span className="inline-flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-[var(--success)]"
              aria-hidden="true"
            />
            {copy.match.radiant}{" "}
            <span className="text-muted-foreground">+</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-[var(--danger)]"
              aria-hidden="true"
            />
            {copy.match.dire} <span className="text-muted-foreground">−</span>
          </span>
        </div>
        <output
          aria-live="off"
          className="rounded-lg bg-[var(--surface-raised)] px-3 py-1.5 text-[13px] font-semibold tabular-nums"
          aria-label={copy.match.matchTime}
        >
          {duration(selected.time)}
        </output>
      </div>
      <div className="mt-5">
        {narrow ? (
          <Tabs.Root
            value={tab}
            onValueChange={(value) => setTab(String(value))}
          >
            <Tabs.List
              activateOnFocus
              aria-label={copy.match.advantage}
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-raised)] p-1"
            >
              {metrics.map((m) => (
                <Tabs.Tab
                  key={m.key}
                  value={m.key}
                  className="min-h-10 rounded-lg border-0 bg-transparent px-3 text-[13px] font-medium text-muted-foreground data-[active]:bg-[var(--surface-solid)] data-[active]:font-semibold data-[active]:text-foreground data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-border focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {m.key === "gold" ? copy.match.goldShort : copy.match.xpShort}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {metrics.map((m) => (
              <Tabs.Panel
                key={m.key}
                value={m.key}
                className="min-w-0 focus-visible:outline-2 focus-visible:outline-primary"
              >
                {metric(m)}
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {metrics.map((m) => (
              <div key={m.key} className="min-w-0">
                {metric(m)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 border-t border-border pt-4">
        <label
          id={`${id}-time-label`}
          className="block text-[12px] font-medium"
        >
          {copy.match.exploreTime}
        </label>
        <Slider
          className="mt-1"
          min={0}
          max={Math.max(1, rows.length - 1)}
          step={1}
          value={[index]}
          disabled={rows.length < 2}
          thumbProps={{
            "aria-labelledby": `${id}-time-label`,
            "aria-valuetext": `${duration(selected.time)}: ${copy.match.goldShort}: ${lead(selected.gold)}; ${copy.match.xpShort}: ${lead(selected.xp)}`,
          }}
          onValueChange={(value) =>
            setSelectedTime(rows[Array.isArray(value) ? value[0] : value].time)
          }
        />
      </div>
      {moments.length ? (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="m-0 mb-3 text-[12px] font-medium text-muted-foreground">
            {copy.match.keyMoments}
          </h3>
          <div className="grid gap-2 min-[1051px]:grid-cols-3">
            {moments.map((moment) => {
              const team =
                moment.value > 0 ? copy.match.radiant : copy.match.dire;
              return (
                <Button
                  key={`${moment.kind}-${moment.time}`}
                  variant="unstyled"
                  onClick={() => {
                    setSelectedTime(moment.time);
                    setTab("gold");
                  }}
                  className={`flex min-w-0 flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary ${selected.time === moment.time ? "border-primary/50 bg-[var(--surface-raised)]" : "border-border bg-transparent hover:bg-[var(--surface-raised)]"}`}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {moment.kind === "swing"
                      ? copy.match.largestGoldSwing
                      : copy.match.goldLeadChanged}
                  </span>
                  <span className="text-[12px] font-medium tabular-nums">
                    {moment.kind === "swing"
                      ? `${duration(moment.start)} – ${duration(moment.time)}`
                      : duration(moment.time)}{" "}
                    ·{" "}
                    {moment.kind === "swing"
                      ? copy.match.teamGained(
                          team,
                          numberFormatter.format(Math.abs(moment.value)),
                        )
                      : copy.match.teamTakesLead(team)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      <Collapsible className="mt-4 border-t border-border pt-2">
        <CollapsibleTrigger className="min-h-11 text-[12px]">
          {copy.match.viewGraphData}
        </CollapsibleTrigger>
        <CollapsibleContent
          className="mt-2 max-h-72 overflow-auto rounded-xl border border-border"
          keepMounted
        >
          <Table className="w-full text-left text-[12px] [&_th]:bg-[var(--surface-solid)] [&_th]:p-3 [&_td]:p-3 [&_tr]:border-b [&_tr]:border-border [&_td]:tabular-nums">
            <TableCaption className="sr-only">
              {copy.match.momentum}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{copy.match.matchTime}</TableHead>
                <TableHead scope="col">{copy.match.goldAdvantage}</TableHead>
                <TableHead scope="col">
                  {copy.match.experienceAdvantage}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.time}>
                  <TableCell>{duration(row.time)}</TableCell>
                  <TableCell>{lead(row.gold)}</TableCell>
                  <TableCell>{lead(row.xp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
