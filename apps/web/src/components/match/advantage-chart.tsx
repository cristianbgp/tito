import { useLocale } from "../../i18n/react";
import { Label } from "../ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../ui/table";
import { Card } from "../ui/card";
import { useId, useState } from "react";
import type { AdvantagePoint } from "../../api/generated/models";
import { copy, duration, numberFormatter } from "../../i18n";
import { AdvantagePlot } from "./advantage-plot";
import { Slider } from "../ui/slider";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";

function lead(value: number | null) {
  if (value == null) return copy.home.unknown;
  return value === 0
    ? copy.match.even
    : copy.match.lead(
        value > 0 ? copy.match.radiant : copy.match.dire,
        numberFormatter.format(Math.abs(value)),
      );
}

export function AdvantageChart({
  title,
  points,
  compact = false,
}: {
  title: string;
  points: AdvantagePoint[];
  compact?: boolean;
}) {
  useLocale();
  const id = useId();
  const [selected, setSelected] = useState(points.length - 1);
  if (!points.some((point) => point.value != null))
    return (
      <Card
        render={<section />}
        className="advantage-panel min-w-0 py-6 px-5 [&_input[type=range]]:min-h-9 [&_input[type=range]]:p-0 [&_input[type=range]]:border-0 [&_input[type=range]]:[accent-color:var(--accent)] [&_input[type=range]]:bg-transparent [&_input[type=range]]:cursor-pointer max-[580px]:py-5 max-[580px]:px-3.25"
      >
        <h3>{title}</h3>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
          {copy.match.seriesUnavailable}
        </p>
      </Card>
    );
  const index = Math.max(0, Math.min(selected, points.length - 1));
  const point = points[index];
  const controls = (
    <>
      <Label
        className={
          "graph-time-label flex flex-wrap justify-between gap-2 mt-3 text-[11px] [&_>_span]:text-muted-foreground"
        }
        id={`${id}-time-label`}
      >
        {copy.match.exploreTime}
        <span>
          {duration(point.time)} · {lead(point.value)}
        </span>
      </Label>
      <Slider
        min={0}
        max={Math.max(1, points.length - 1)}
        step={1}
        value={[index]}
        disabled={points.length < 2}
        thumbProps={{
          "aria-labelledby": `${id}-time-label`,
          "aria-valuetext": `${duration(point.time)}: ${lead(point.value)}`,
        }}
        onValueChange={(value) =>
          setSelected(Array.isArray(value) ? value[0] : value)
        }
      />
      <Collapsible className="graph-data [&_[data-slot=collapsible-trigger]]:cursor-pointer [&_[data-slot=collapsible-trigger]]:py-1.5 [&_[data-slot=collapsible-trigger]]:px-0 [&_[data-slot=collapsible-trigger]]:text-muted-foreground [&_[data-slot=collapsible-trigger]]:text-[11px] mt-3 pt-2 [border-top:1px_solid_var(--line)] [&_th]:p-2.5 [&_th]:whitespace-normal [&_td]:p-2.5 [&_td]:whitespace-normal">
        <CollapsibleTrigger>{copy.match.viewGraphData}</CollapsibleTrigger>
        <CollapsibleContent
          keepMounted
          className={"graph-data-scroll mt-2 max-h-62.5 overflow-auto"}
        >
          <Table>
            <TableCaption className="sr-only">{title}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{copy.match.matchTime}</TableHead>
                <TableHead scope="col">{copy.match.advantage}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p) => (
                <TableRow key={p.time}>
                  <TableCell>{duration(p.time)}</TableCell>
                  <TableCell>{lead(p.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
  return (
    <Card
      render={<section />}
      surface={compact ? "flat" : "glass"}
      className={`advantage-panel min-w-0 pt-6 pr-5 pb-6 pl-5 [&_input[type="range"]]:min-h-9 [&_input[type="range"]]:pt-0 [&_input[type="range"]]:pr-0 [&_input[type="range"]]:pb-0 [&_input[type="range"]]:pl-0 [&_input[type="range"]]:border-0 [&_input[type="range"]]:[accent-color:var(--accent)] [&_input[type="range"]]:bg-transparent [&_input[type="range"]]:cursor-pointer max-[580px]:pt-5 max-[580px]:pr-3.25 max-[580px]:pb-5 max-[580px]:pl-3.25 ${compact ? "compact-chart mt-5.5 pt-5 px-0 pb-0 [border-top:1px_solid_var(--line)] rounded-[0] bg-transparent shadow-[none] [&_.graph-heading_h3]:text-[20px] [&_.graph-time-label]:text-[10px] max-[580px]:pt-5 max-[580px]:px-0 max-[580px]:pb-0 [&_.graph-readout]:text-[14px]" : ""}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="graph-heading flex items-center justify-between gap-4 [&_h3]:m-0 [&_h3]:text-[17px] [&_.mono]:text-[11px] [&_.mono]:text-muted-foreground">
        <h3 id={`${id}-heading`}>{title}</h3>
        <span className={"mono text-[12px] tabular-nums"}>
          {duration(point.time)}
        </span>
      </div>
      <p
        className={`graph-readout min-h-5 text-[12px] mt-3 mr-0 mb-0 ml-0 ${point.value != null && point.value < 0 ? "dire-color text-[var(--danger)]" : "radiant-color text-[var(--success)]"}`}
        aria-live="polite"
      >
        {lead(point.value)}
      </p>
      <div className="my-3">
        <AdvantagePlot
          title={title}
          points={points}
          time={point.time}
          onTimeChange={(time) =>
            setSelected(
              points.reduce(
                (best, p, i) =>
                  Math.abs(p.time - time) < Math.abs(points[best].time - time)
                    ? i
                    : best,
                0,
              ),
            )
          }
        />
      </div>
      {compact ? (
        <Collapsible className="compact-explore [&_>_[data-slot=collapsible-trigger]]:cursor-pointer [&_>_[data-slot=collapsible-trigger]]:py-2 [&_>_[data-slot=collapsible-trigger]]:px-0 [&_>_[data-slot=collapsible-trigger]]:text-muted-foreground [&_>_[data-slot=collapsible-trigger]]:text-[11px]">
          <CollapsibleTrigger>{copy.match.exploreTimeline}</CollapsibleTrigger>
          <CollapsibleContent keepMounted>{controls}</CollapsibleContent>
        </Collapsible>
      ) : (
        controls
      )}
    </Card>
  );
}
