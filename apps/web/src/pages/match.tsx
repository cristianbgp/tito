import { useLocale } from "../i18n/react";
import { Alert } from "../components/ui/alert";
import { Link, useParams, useSearchParams } from "react-router";
import {
  getGetPlayerProfileQueryKey,
  useGetMatch,
  useGetPlayerProfile,
} from "../api/generated/tito";
import { copy } from "../i18n";
import { PageHeading, RequestError } from "../components/shared";
import { MatchDetails } from "../components/match/match-details";
import { ReplayAnalysis } from "../components/match/replay-analysis";
import { MatchReview } from "../components/match/match-review";
import { authClient } from "../lib/auth";
import { historySearch, readHistoryFilters } from "../lib/match-history";

export function MatchPage() {
  useLocale();
  const { matchId = "" } = useParams();
  const [params] = useSearchParams();
  const selectedAccountId = params.get("player");
  const { data: session } = authClient.useSession();
  const profile = useGetPlayerProfile({
    query: {
      queryKey: [...getGetPlayerProfileQueryKey(), session?.user.id],
      enabled: Boolean(session),
    },
  });
  const { data, error, isFetching, refetch } = useGetMatch(matchId, {
    query: { enabled: Boolean(matchId) },
  });
  const back =
    selectedAccountId && /^[1-9]\d{0,9}$/.test(selectedAccountId)
      ? `/?${historySearch(selectedAccountId, readHistoryFilters(params))}`
      : "/";
  return (
    <section className="match-page">
      <Link
        className={
          "back-link inline-flex gap-2 items-center mb-6 text-[13px] leading-5 text-muted-foreground"
        }
        to={back}
      >
        ← {copy.nav.home}
      </Link>
      <PageHeading
        eyebrow={`${copy.match.eyebrow} / ${matchId}`}
        title={copy.match.title}
      />
      {error ? (
        <RequestError error={error} retry={() => void refetch()} />
      ) : null}
      {session && profile.error ? (
        <Alert role="note">{copy.match.profileFailed}</Alert>
      ) : null}
      <MatchReview
        key={`review:${matchId}:${session?.user.id ?? "guest"}:${session?.user.steamId ?? "unlinked"}`}
        matchId={matchId}
        userId={session?.user.id}
        steamId={session?.user.steamId}
      />
      {isFetching && !data ? (
        <p
          className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
          role="status"
        >
          {copy.match.loading}
        </p>
      ) : data ? (
        <MatchDetails
          key={data.id}
          match={data}
          viewerAccountId={session ? profile.data?.accountId : null}
          selectedAccountId={selectedAccountId}
          replayControls={
            <ReplayAnalysis
              key={`${data.id}:${session?.user.id ?? "guest"}`}
              matchId={data.id}
              signedIn={Boolean(session)}
            />
          }
        />
      ) : null}
    </section>
  );
}
