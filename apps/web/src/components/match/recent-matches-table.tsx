import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import type { RecentMatch } from "../../api/generated/models";
import { Link } from "react-router";
import { unavailable, copy, duration, matchDateFormatter } from "../../i18n";
import { historySearch, type HistoryFilters } from "../../lib/match-history";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { ArrowUpRightIcon } from "../icons";
import { AssetImage } from "./asset-image";
export function RecentMatchesTable({
  matches,
  selectedId,
  filters,
  onSelect,
}: {
  matches: RecentMatch[];
  selectedId?: string;
  filters: HistoryFilters;
  onSelect: (id: string) => void;
}) {
  useLocale();
  return (
    <div
      className={
        "table-scroll recent-table-scroll w-full [scrollbar-color:var(--line-bright)_transparent] [scrollbar-width:thin] max-h-[min(70svh,_900px)] overflow-auto max-[1050px]:max-h-115"
      }
      tabIndex={0}
      role="region"
      aria-label={copy.home.recent}
    >
      <Table
        className="recent-matches-table min-w-143.75 border-separate [border-spacing:0] text-[14px] [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[2] [&_thead_th]:bg-[var(--surface-solid)] [&_thead_th]:pt-3.75 [&_thead_th]:px-2 [&_thead_th]:pb-5 [&_td]:px-2 [&_td]:py-4 [&_tbody_tr:last-child_td]:[border-bottom-color:transparent] [&_.is-selected_td]:bg-[var(--selected)] [&_.is-selected_td]:[border-bottom-color:transparent] [&_.is-selected_td:first-child]:rounded-[13px_0_0_13px] [&_.is-selected_td:first-child]:shadow-[inset_3px_0_0_var(--accent)] [&_.is-selected_td:last-child]:rounded-[0_13px_13px_0] [&_.hero-portrait]:w-12 [&_.hero-portrait]:h-12 [&_.hero-portrait]:rounded-[8px] [&_time]:text-[13px] [&_time]:text-muted-foreground max-[580px]:min-w-142.5 [&_.hero-name_strong]:text-[15px] [&_.mono]:text-[14px]"
        aria-label={copy.home.recent}
      >
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{copy.home.hero}</TableHead>
            <TableHead scope="col">{copy.home.result}</TableHead>
            <TableHead scope="col">{copy.home.kda}</TableHead>
            <TableHead scope="col">{copy.home.duration}</TableHead>
            <TableHead scope="col">{copy.home.played}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow
              key={match.id}
              className={match.id === selectedId ? "is-selected" : undefined}
            >
              <TableCell>
                <div
                  className={"recent-match-identity flex gap-1 items-center"}
                >
                  <Button
                    variant="unstyled"
                    type="button"
                    className="hero-name match-select flex gap-3 items-center text-foreground text-[13px] [&_strong]:block [&_strong]:text-[13px] [&_strong]:[font-weight:550] [&_small]:block [&_small]:text-[var(--faint)] [&_small]:text-[11px] [&_small]:mt-1.5 p-0 border-0 bg-transparent min-h-11.5 text-left flex-[1] [@media(hover:_hover)]:[&:hover_strong]:text-primary"
                    aria-label={copy.home.previewAction(
                      serviceText(match.hero),
                    )}
                    aria-pressed={match.id === selectedId}
                    aria-controls="selected-match-preview"
                    onClick={() => onSelect(match.id)}
                  >
                    <AssetImage
                      src={match.heroImage}
                      fallback={match.hero.slice(0, 2).toUpperCase()}
                      className={
                        "hero-portrait w-16 h-9 border border-border rounded-[5px]"
                      }
                    />
                    <span>
                      <strong>{serviceText(match.hero)}</strong>
                      <small>
                        #{match.id}
                        {match.source === "replay"
                          ? ` · ${copy.replayImport.source}`
                          : ""}
                      </small>
                    </span>
                  </Button>
                  <Link
                    to={`/matches/${match.id}?${historySearch(match.accountId, filters)}`}
                    aria-label={copy.home.openAction(serviceText(match.hero))}
                    title={copy.home.open}
                    className={buttonVariants({
                      variant: "unstyled",
                      className:
                        "row-open grid place-items-center w-5.75 h-8 text-muted-foreground rounded-[7px] [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground",
                    })}
                  >
                    <ArrowUpRightIcon size={16} aria-hidden="true" />
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="unstyled"
                  className={`result [font-weight:550] [&.win]:text-[var(--success)] [&.loss]:text-[var(--danger)] [&.unknown]:text-muted-foreground ${match.result ?? "unknown"}`}
                >
                  {match.result === "win"
                    ? copy.home.win
                    : match.result === "loss"
                      ? copy.home.loss
                      : copy.home.unknown}
                </Badge>
              </TableCell>
              <TableCell className={"mono text-[12px] tabular-nums"}>
                {match.kills ?? unavailable} / {match.deaths ?? unavailable} /{" "}
                {match.assists ?? unavailable}
              </TableCell>
              <TableCell className={"mono text-[12px] tabular-nums"}>
                {duration(match.duration)}
              </TableCell>
              <TableCell>
                <time dateTime={new Date(match.startedAt * 1000).toISOString()}>
                  {matchDateFormatter.format(new Date(match.startedAt * 1000))}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
