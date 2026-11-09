import { useId } from "react";
import type { AdvantagePoint } from "../../api/generated/models";
import { compactNumberFormatter, copy, duration } from "../../i18n";
import { chartGeometry } from "./chart-geometry";

/** A plot has no independent time state: its owner coordinates exploration. */
export function AdvantagePlot({
  title,
  points,
  time,
  endTime,
  onTimeChange,
  markers = [],
}: {
  title: string;
  points: AdvantagePoint[];
  time: number;
  endTime?: number;
  onTimeChange: (time: number) => void;
  markers?: number[];
}) {
  const id = useId();
  const model = chartGeometry(points, endTime);
  const selected = points.find((p) => p.time === time);
  // Separate contiguous segments so neither line nor fill bridges missing evidence.
  const segments: AdvantagePoint[][] = [];
  for (const point of points) {
    if (point.value == null) {
      if (segments.at(-1)?.length) segments.push([]);
    } else {
      if (!segments.length) segments.push([]);
      segments.at(-1)!.push(point);
    }
  }
  const explore = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const time =
      ((((event.clientX - rect.left) / rect.width) * 640 - 64) / 552) *
      model.maxTime;
    onTimeChange(Math.max(0, Math.min(model.maxTime, time)));
  };
  return (
    <svg
      viewBox="0 0 640 250"
      className="advantage-plot block h-auto w-full overflow-visible [&_text]:fill-[var(--muted)] [&_text]:text-[16px] max-[580px]:[&_text]:text-[22px]"
      role="img"
      aria-label={title}
      aria-describedby={`${id}-description`}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") explore(event);
      }}
      onPointerDown={explore}
    >
      <desc id={`${id}-description`}>{copy.match.timelineHelp}</desc>
      <defs>
        <clipPath id={`${id}-radiant`}>
          <rect x="64" y="24" width="552" height="86" />
        </clipPath>
        <clipPath id={`${id}-dire`}>
          <rect x="64" y="110" width="552" height="86" />
        </clipPath>
      </defs>
      {[model.bound, 0, -model.bound].map((value) => (
        <g key={value}>
          <line
            x1="64"
            x2="616"
            y1={model.y(value)}
            y2={model.y(value)}
            stroke={value === 0 ? "var(--muted)" : "var(--line)"}
            strokeWidth={value === 0 ? 1.2 : 0.7}
            strokeDasharray={value === 0 ? "4 4" : undefined}
          />
          <text x="54" y={model.y(value) + 5} textAnchor="end">
            {compactNumberFormatter.format(value)}
          </text>
        </g>
      ))}
      {model.ticks.map((tick, index) => (
        <g key={tick}>
          <line
            x1={model.x(tick)}
            x2={model.x(tick)}
            y1="196"
            y2="201"
            stroke="var(--line)"
          />
          <text
            x={model.x(tick)}
            y="230"
            textAnchor={
              index === 0
                ? "start"
                : index === model.ticks.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {duration(tick)}
          </text>
        </g>
      ))}
      {(["radiant", "dire"] as const).map((team) => (
        <g
          key={team}
          clipPath={`url(#${id}-${team})`}
          style={{
            color: team === "radiant" ? "var(--success)" : "var(--danger)",
          }}
        >
          {segments
            .filter((segment) => segment.length > 1)
            .map((segment, index) => (
              <path
                key={`fill-${index}`}
                d={`M${model.x(segment[0].time)},110 ${segment.map((p) => `L${model.x(p.time)},${model.y(p.value!)}`).join(" ")} L${model.x(segment.at(-1)!.time)},110 Z`}
                fill="currentColor"
                opacity="0.09"
              />
            ))}
          {model.paths.map((path, index) => (
            <path
              key={index}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
      {segments
        .filter((segment) => segment.length === 1)
        .map(([point]) => (
          <circle
            key={`sample-${point.time}`}
            cx={model.x(point.time)}
            cy={model.y(point.value!)}
            r="3"
            fill={point.value! < 0 ? "var(--danger)" : "var(--success)"}
          />
        ))}
      {[...new Set(markers)].map((marker) => {
        const point = points.find((p) => p.time === marker);
        return point?.value == null ? null : (
          <circle
            key={marker}
            cx={model.x(marker)}
            cy={model.y(point.value)}
            r="3"
            fill="var(--surface-solid)"
            stroke={point.value < 0 ? "var(--danger)" : "var(--success)"}
            strokeWidth="1.5"
          />
        );
      })}
      <line
        x1={model.x(time)}
        x2={model.x(time)}
        y1="24"
        y2="196"
        stroke="var(--muted)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      {selected?.value == null ? null : (
        <circle
          cx={model.x(time)}
          cy={model.y(selected.value)}
          r="5"
          fill={selected.value < 0 ? "var(--danger)" : "var(--success)"}
          stroke="var(--surface-solid)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
