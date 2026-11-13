import { useLocale } from "../../i18n/react";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import type { MatchDetail } from "../../api/generated/models";
import type { ReactNode } from "react";
import {
  unavailable,
  copy,
  dateFormatter,
  duration,
  numberFormatter,
} from "../../i18n";
import { AssetImage } from "./asset-image";
import { MatchMomentum } from "./match-momentum";
import { Scoreboard } from "./scoreboard";

export function MatchDetails({
  match,
  viewerAccountId,
  selectedAccountId,
  replayControls,
}: {
  match: MatchDetail;
  viewerAccountId?: string | null;
  selectedAccountId?: string | null;
  replayControls?: ReactNode;
}) {
  useLocale();
  const ownPlayer = viewerAccountId
    ? match.players.find((p) => p.accountId === viewerAccountId)
    : undefined;
  const result =
    match.winner == null
      ? copy.home.unknown
      : ownPlayer?.team === match.winner
        ? copy.home.win
        : copy.home.loss;
  const missing = copy.home.unknown;
  const metadata = [
    [copy.home.duration, duration(match.duration)],
    [copy.home.played, dateFormatter.format(new Date(match.startedAt * 1000))],
    [
      copy.match.gameMode,
      match.gameMode == null
        ? missing
        : (copy.match.gameModes[match.gameMode] ??
          copy.match.unknownMode(match.gameMode)),
    ],
    [
      copy.match.lobby,
      match.lobbyType == null
        ? missing
        : (copy.match.lobbyTypes[match.lobbyType] ??
          copy.match.unknownLobby(match.lobbyType)),
    ],
    [copy.match.region, match.region ?? missing],
  ];
  return (
    <>
      <Card
        render={<section />}
        className="match-overview"
        aria-label={copy.match.overview}
      >
        <div className="match-overview-top flex items-center justify-between gap-4 [&_.eyebrow]:m-0">
          <span className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3.5">
            {copy.match.overview}
          </span>
          <Badge>
            {match.source === "replay" ? `${copy.replayImport.source} · ` : ""}
            {match.parsed ? copy.match.parsed : copy.match.unparsed}
          </Badge>
        </div>
        <div className="match-score grid grid-cols-[1fr_2fr_1fr] items-center gap-5 text-center py-7.5 px-0 [&_>_div_>_span]:block [&_>_div_>_span]:text-[13px] [&_>_div_>_strong]:block [&_>_div_>_strong]:mt-2.25 [&_>_div_>_strong]:text-[clamp(40px,_5vw,_60px)] [&_>_div_>_strong]:leading-[1.2] [&_>_div_>_strong]:font-semibold [&_>_div_>_strong]:tabular-nums [&_>_div_>_strong]:tracking-[-2px] max-[580px]:gap-2.25 max-[580px]:grid-cols-[1fr_1.65fr_1fr]">
          <div className={"radiant-color text-[var(--success)]"}>
            <span>{copy.match.radiant}</span>
            <strong>
              {match.radiantScore == null
                ? unavailable
                : numberFormatter.format(match.radiantScore)}
            </strong>
          </div>
          <div
            className={
              "match-verdict [&_h2]:mb-3 max-[580px]:[&_h2]:text-[17px] max-[580px]:[&_.text-link]:text-[11px]"
            }
          >
            <h2>
              {match.winner
                ? `${match.winner === "radiant" ? copy.match.radiant : copy.match.dire}${copy.match.winner}`
                : copy.match.unknownWinner}
            </h2>
            {match.source !== "replay" ? (
              <a
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                href={`https://www.opendota.com/matches/${match.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {copy.match.openDota} ↗
              </a>
            ) : null}
          </div>
          <div className={"dire-color text-[var(--danger)]"}>
            <span>{copy.match.dire}</span>
            <strong>
              {match.direScore == null
                ? unavailable
                : numberFormatter.format(match.direScore)}
            </strong>
          </div>
        </div>
        <dl className="match-facts grid grid-cols-[repeat(5,_minmax(0,_1fr))] gap-5 [border-top:1px_solid_var(--line)] pt-5.5 m-0 [&_>_div]:flex [&_>_div]:flex-col [&_>_div]:gap-2 [&_>_div]:p-0 [&_>_div]:border-0 [&_>_div]:text-[13px] [&_dt]:text-[11px] max-[1050px]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[800px]:gap-4.5 max-[580px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[580px]:[&_>_div]:gap-1.5 max-[580px]:[&_>_div]:flex">
          {metadata.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {ownPlayer ? (
        <Card
          render={<section />}
          className={
            "personal-match flex items-center gap-4 mt-5 [border-left:3px_solid_var(--accent)] [&_h2]:text-[17px] [&_h2]:mt-1 [&_>_.mono]:ml-auto max-[580px]:flex-wrap max-[580px]:gap-3 max-[580px]:[&_h2]:text-[15px]"
          }
          aria-label={copy.match.performance}
        >
          <AssetImage
            src={ownPlayer.heroImage}
            fallback={ownPlayer.hero.slice(0, 2)}
            className={
              "hero-portrait w-16 h-9 border border-border rounded-[5px]"
            }
          />
          <div>
            <span className={"caption text-muted-foreground text-[11px]"}>
              {copy.match.performance}
            </span>
            <h2>{copy.match.personalResult(ownPlayer.hero, result)}</h2>
          </div>
          <span className={"mono text-[12px] tabular-nums"}>
            {ownPlayer.kills ?? unavailable} / {ownPlayer.deaths ?? unavailable}{" "}
            / {ownPlayer.assists ?? unavailable}
          </span>
        </Card>
      ) : viewerAccountId ? (
        <Alert role="note">{copy.match.profileAbsent}</Alert>
      ) : null}
      {!match.parsed ||
      !match.goldAdvantage.some((p) => p.value != null) ||
      !match.experienceAdvantage.some((p) => p.value != null)
        ? (replayControls ?? (
            <Alert role="note">{copy.match.timelinesUnavailable}</Alert>
          ))
        : null}
      {!match.metadataAvailable ? (
        <Alert role="note">{copy.match.metadataUnavailable}</Alert>
      ) : null}
      <Scoreboard
        match={match}
        viewerAccountId={viewerAccountId}
        selectedAccountId={selectedAccountId}
      />
      <MatchMomentum
        key={match.id}
        gold={match.goldAdvantage}
        xp={match.experienceAdvantage}
      />
    </>
  );
}
