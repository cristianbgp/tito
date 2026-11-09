import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { Badge } from "../ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../ui/table";
import { Link } from "react-router";
import type { MatchDetail } from "../../api/generated/models";
import { unavailable, copy, numberFormatter } from "../../i18n";
import { AssetImage } from "./asset-image";
import { Inventory } from "./inventory";

const stat = (value: number | null) =>
  value == null ? unavailable : numberFormatter.format(value);

export function Scoreboard({
  match,
  viewerAccountId,
  selectedAccountId,
}: {
  match: MatchDetail;
  viewerAccountId?: string | null;
  selectedAccountId?: string | null;
}) {
  useLocale();
  return (
    <section className="match-scoreboards" aria-label={copy.match.scoreboard}>
      <p className="field-hint scoreboard-hint text-muted-foreground text-[12px] leading-[1.7] mx-0 mb-0 mt-6.5">
        {copy.match.scoreboardHint}
      </p>
      {(["radiant", "dire"] as const).map((team) => (
        <section className={`team-section mt-7.5 min-w-0 ${team}`} key={team}>
          <div
            className={
              "team-heading flex items-center justify-between gap-4 mb-4 [&_h2]:flex [&_h2]:gap-3 [&_h2]:items-center"
            }
          >
            <h2>
              <span
                className={`team-mark w-1.25 h-4.75 rounded-[4px] bg-[var(--success)] [&.dire]:bg-[var(--danger)] ${team}`}
                aria-hidden="true"
              />
              {team === "radiant" ? copy.match.radiant : copy.match.dire}
              <span
                className={
                  "team-score text-muted-foreground text-[13px] [font-weight:450] ml-1.25"
                }
              >
                {stat(
                  team === "radiant" ? match.radiantScore : match.direScore,
                )}
              </span>
            </h2>
            {match.winner === team ? <Badge>{copy.home.win}</Badge> : null}
          </div>
          <div
            className={
              "table-scroll scoreboard-scroll w-full overflow-x-auto [scrollbar-color:var(--line-bright)_transparent] [scrollbar-width:thin] border border-border rounded-[16px] bg-[var(--surface)] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--surface-solid)]"
            }
            role="region"
            aria-label={`${team === "radiant" ? copy.match.radiant : copy.match.dire} ${copy.match.scoreboard}`}
            tabIndex={0}
          >
            <Table className="scoreboard min-w-340 [&_th]:py-3.75 [&_th]:px-3.25 [&_th]:text-[12px] [&_td]:py-3.75 [&_td]:px-3.25 [&_td]:text-[12px] [&_thead_th]:h-11 [&_thead_th]:bg-[var(--table-head)] [&_thead_th]:text-[11px] [&_tbody_th]:bg-[var(--row-sticky)] [&_tbody_th]:[border-bottom:1px_solid_var(--line)] [&_tbody_th]:[font-weight:450] [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-[1] [&_th:first-child]:min-w-54.5 [&_th:first-child]:max-w-61.25 [&_th:first-child]:[border-right:1px_solid_var(--line)] [&_thead_th:first-child]:z-[2] [&_.your-player-row_>_*]:bg-[var(--selected-solid)] [&_.your-player-row_>_th]:[border-left:3px_solid_var(--accent)] [&_.selected-player-row_>_*]:bg-[var(--selected-solid)] max-[580px]:[&_th:first-child]:min-w-45">
              <TableCaption className="sr-only">
                {team === "radiant" ? copy.match.radiant : copy.match.dire}{" "}
                {copy.match.scoreboard}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{copy.match.player}</TableHead>
                  <TableHead scope="col">{copy.match.level}</TableHead>
                  <TableHead scope="col">{copy.home.kda}</TableHead>
                  <TableHead scope="col" title={copy.match.lhDnTitle}>
                    {copy.match.lhDn}
                  </TableHead>
                  <TableHead scope="col">{copy.match.netWorth}</TableHead>
                  <TableHead scope="col">{copy.match.gpm}</TableHead>
                  <TableHead scope="col">{copy.match.xpm}</TableHead>
                  <TableHead scope="col">{copy.match.heroDamage}</TableHead>
                  <TableHead scope="col">{copy.match.healing}</TableHead>
                  <TableHead scope="col">{copy.match.towerDamage}</TableHead>
                  <TableHead scope="col">{copy.match.items}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {match.players
                  .filter((p) => p.team === team)
                  .toSorted((a, b) => a.slot - b.slot)
                  .map((player) => {
                    const yours = Boolean(
                      player.accountId &&
                      viewerAccountId &&
                      player.accountId === viewerAccountId,
                    );
                    const selected =
                      !yours &&
                      Boolean(
                        player.accountId &&
                        selectedAccountId &&
                        player.accountId === selectedAccountId,
                      );
                    return (
                      <TableRow
                        key={player.slot}
                        className={
                          yours
                            ? "your-player-row"
                            : selected
                              ? "selected-player-row"
                              : undefined
                        }
                      >
                        <TableHead scope="row">
                          <div
                            className={
                              "scoreboard-player flex gap-3 items-center [&_strong]:text-[13px] [&_strong]:[font-weight:550] [&_strong]:text-foreground max-[580px]:gap-2 max-[580px]:[&_.hero-portrait]:w-11 max-[580px]:[&_.hero-portrait]:h-7.5"
                            }
                          >
                            <AssetImage
                              src={player.heroImage}
                              fallback={player.hero.slice(0, 2)}
                              className={
                                "hero-portrait w-16 h-9 border border-border rounded-[5px]"
                              }
                            />
                            <div>
                              <strong>{serviceText(player.hero)}</strong>
                              <span
                                className={
                                  "player-public-name block max-w-32.5 overflow-hidden text-ellipsis text-muted-foreground text-[11px] mt-1.5 [&_a]:[text-decoration:underline] [&_a]:[text-underline-offset:3px] [@media(hover:_hover)]:[&_a:hover]:text-foreground max-[580px]:max-w-25"
                                }
                              >
                                {player.accountId ? (
                                  <Link to={`/?player=${player.accountId}`}>
                                    {player.name || copy.match.anonymous}
                                  </Link>
                                ) : (
                                  player.name || copy.match.anonymous
                                )}
                              </span>
                              {yours ? (
                                <span
                                  className={
                                    "player-marker block mt-1.5 text-[10px] text-primary"
                                  }
                                >
                                  {copy.match.yourPlayer}
                                </span>
                              ) : selected ? (
                                <span
                                  className={
                                    "player-marker block mt-1.5 text-[10px] text-primary"
                                  }
                                >
                                  {copy.match.selectedPlayer}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableHead>
                        <TableCell>{stat(player.level)}</TableCell>
                        <TableCell className={"mono text-[12px] tabular-nums"}>
                          {stat(player.kills)} / {stat(player.deaths)} /{" "}
                          {stat(player.assists)}
                        </TableCell>
                        <TableCell className={"mono text-[12px] tabular-nums"}>
                          {stat(player.lastHits)} / {stat(player.denies)}
                        </TableCell>
                        <TableCell className={"net-worth text-[var(--gold)]"}>
                          {stat(player.netWorth)}
                        </TableCell>
                        <TableCell>{stat(player.goldPerMinute)}</TableCell>
                        <TableCell>
                          {stat(player.experiencePerMinute)}
                        </TableCell>
                        <TableCell>{stat(player.heroDamage)}</TableCell>
                        <TableCell>{stat(player.heroHealing)}</TableCell>
                        <TableCell>{stat(player.towerDamage)}</TableCell>
                        <TableCell>
                          <Inventory player={player} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </section>
  );
}
