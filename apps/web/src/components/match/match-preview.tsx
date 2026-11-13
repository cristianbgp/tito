import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { Badge } from "../ui/badge";
import { buttonVariants } from "../ui/button";
import { Card } from "../ui/card";
import { Link } from "react-router";
import type { MatchDetail, RecentMatch } from "../../api/generated/models";
import { getGetMatchQueryKey, useGetMatch } from "../../api/generated/tito";
import {
  unavailable,
  copy,
  duration,
  matchDateFormatter,
  numberFormatter,
} from "../../i18n";
import { ArrowUpRightIcon } from "../icons";
import { AssetImage } from "./asset-image";
import { AdvantageChart } from "./advantage-chart";
import { RequestError } from "../shared";
import { historySearch, type HistoryFilters } from "../../lib/match-history";

export function MatchPreviewContent({
  recent,
  detail,
  loading = false,
  error,
  retry,
  filters,
  detailsDeferred = false,
}: {
  recent: RecentMatch;
  detail?: MatchDetail;
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  filters?: HistoryFilters;
  detailsDeferred?: boolean;
}) {
  useLocale();
  const gold = detail?.goldAdvantage ?? [];
  const statistic = (value: number | null) =>
    value == null ? unavailable : numberFormatter.format(value);
  return (
    <Card
      render={<aside />}
      className="match-preview min-w-0 overflow-hidden p-0 max-[1050px]:grid max-[1050px]:grid-cols-[0.8fr_1.2fr] max-[800px]:block max-[580px]:p-0"
      id="selected-match-preview"
      aria-label={copy.home.preview}
    >
      <div
        className={
          'preview-hero relative h-[clamp(145px,_12vw,_188px)] [isolation:isolate] [background:#20232b] [&_.asset-image]:w-full [&_.asset-image]:h-full [&_.asset-image]:rounded-[0] [&_.asset-image]:[background:#20232b] [&_.asset-image]:text-[#d2d5df] [&_.asset-image]:text-[32px] [&_img]:[object-position:center_36%] [&::after]:[content:""] [&::after]:absolute [&::after]:[inset:0] [&::after]:[background:linear-gradient(_0deg,_rgb(13_18_25_/_0.93),_rgb(13_18_25_/_0.03)_85%_)] [&::after]:z-[1] [&_h2]:absolute [&_h2]:z-[2] [&_h2]:bottom-4.75 [&_h2]:left-6 [&_h2]:right-6 [&_h2]:text-[#fff] [&_h2]:text-[28px] [&_h2]:[font-weight:650] [&_h2]:tracking-[-0.8px] max-[1050px]:min-h-full max-[1050px]:h-auto max-[800px]:h-45 max-[580px]:h-44'
        }
      >
        <AssetImage
          src={recent.heroImage}
          fallback={recent.hero.slice(0, 2)}
          className="preview-hero-image"
        />
        <h2>{recent.hero}</h2>
      </div>
      <div className="preview-content pt-0 px-5.5 pb-4.5 max-[1250px]:px-4.5 max-[1050px]:pt-0 max-[1050px]:px-5.5 max-[1050px]:pb-4.5 max-[580px]:pt-0 max-[580px]:px-4.5 max-[580px]:pb-4.5">
        <div className="preview-result-line flex flex-wrap items-center gap-[8px_12px] py-3.5 px-0 [border-bottom:1px_solid_var(--line)] text-[13px] [&_time]:text-muted-foreground [&_time]:ml-auto [&_time]:text-[12px]">
          <Badge
            variant="unstyled"
            className={`result-badge [font-weight:550] inline-flex pt-1.25 pr-2.5 pb-1.25 pl-2.5 rounded-[8px] text-[12px] border border-border [&.win]:bg-[var(--success-tint)] [&.win]:text-[var(--success)] [&.loss]:bg-[var(--danger-tint)] [&.loss]:text-[var(--danger)] ${recent.result ?? "unknown"}`}
          >
            {recent.result === "win"
              ? copy.home.win
              : recent.result === "loss"
                ? copy.home.loss
                : copy.home.unknown}
          </Badge>
          {detail ? (
            <span
              className={
                "preview-score flex-[1] text-center [&_strong]:font-semibold"
              }
            >
              {copy.match.radiant}{" "}
              <strong>
                {statistic(detail.radiantScore)} – {statistic(detail.direScore)}
              </strong>{" "}
              {copy.match.dire}
            </span>
          ) : null}
          <time dateTime={new Date(recent.startedAt * 1000).toISOString()}>
            {matchDateFormatter.format(new Date(recent.startedAt * 1000))}
          </time>
        </div>
        <dl className="preview-stats grid grid-cols-[1.7fr_1.15fr_0.8fr_0.8fr] gap-2.5 mt-4.75 mx-0 mb-5.5 [&_>_div]:flex [&_>_div]:flex-col [&_>_div]:p-0 [&_>_div]:border-0 [&_>_div]:gap-1.75 [&_>_div]:min-w-0 [&_dt]:text-[12px] [&_dt]:text-muted-foreground [&_dd]:text-[22px] [&_dd]:font-medium [&_dd]:whitespace-nowrap [&_dd]:tabular-nums max-[580px]:grid-cols-2 max-[580px]:gap-4 max-[580px]:[&_dd]:text-[18px] max-[580px]:[&_>_div]:flex">
          <div>
            <dt>{copy.home.kda}</dt>
            <dd>
              {statistic(recent.kills)} / {statistic(recent.deaths)} /{" "}
              {statistic(recent.assists)}
            </dd>
          </div>
          <div>
            <dt>{copy.home.duration}</dt>
            <dd>{duration(recent.duration)}</dd>
          </div>
          <div>
            <dt>{copy.match.gpm}</dt>
            <dd>{statistic(recent.goldPerMinute)}</dd>
          </div>
          <div>
            <dt>{copy.match.xpm}</dt>
            <dd>{statistic(recent.experiencePerMinute)}</dd>
          </div>
        </dl>
        <Link
          to={`/matches/${recent.id}?${historySearch(recent.accountId, filters)}`}
          className={buttonVariants({
            variant: "default",
            className: "full-width w-full",
          })}
        >
          {copy.home.open}
          <ArrowUpRightIcon size={19} aria-hidden="true" />
        </Link>
        {detailsDeferred && !detail ? (
          <p className="preview-notice mt-5.5 mx-0 mb-2 pt-5 [border-top:1px_solid_var(--line)] text-[12px] leading-[1.8] text-muted-foreground">
            {copy.savedHistory.openDetails}
          </p>
        ) : error ? (
          <RequestError error={error} retry={retry} />
        ) : loading && !detail ? (
          <p
            className="preview-notice mt-5.5 mx-0 mb-2 pt-5 [border-top:1px_solid_var(--line)] text-[12px] leading-[1.8] text-muted-foreground"
            role="status"
          >
            {copy.home.previewLoading}
          </p>
        ) : gold.some((point) => point.value != null) ? (
          <AdvantageChart
            key={recent.id}
            title={copy.match.goldAdvantage}
            points={gold}
            compact
          />
        ) : (
          <p className="preview-notice mt-5.5 mx-0 mb-2 pt-5 [border-top:1px_solid_var(--line)] text-[12px] leading-[1.8] text-muted-foreground">
            {copy.home.previewTimelineUnavailable}
          </p>
        )}
      </div>
    </Card>
  );
}

export function MatchPreview({
  recent,
  filters,
  deferDetails = false,
}: {
  recent: RecentMatch;
  filters?: HistoryFilters;
  deferDetails?: boolean;
}) {
  useLocale();
  const detail = useGetMatch(recent.id, {
    query: {
      enabled: !deferDetails,
      queryKey: [
        ...getGetMatchQueryKey(recent.id),
        recent.source === "replay" ? recent.accountId : "public",
      ],
    },
  });
  return (
    <MatchPreviewContent
      recent={recent}
      filters={filters}
      detailsDeferred={deferDetails}
      detail={detail.data}
      loading={detail.isFetching}
      error={detail.error}
      retry={() => void detail.refetch()}
    />
  );
}
