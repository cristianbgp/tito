import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { Alert } from "../ui/alert";
import { Button, buttonVariants } from "../ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMatchQueryKey,
  getGetMatchEvidenceQueryKey,
  useGetMatchParseStatus,
  useRequestMatchParse,
} from "../../api/generated/tito";
import { copy } from "../../i18n";
import { retryReplayPoll } from "./replay-query";

type ReplayState =
  | "idle"
  | "submitting"
  | "queued"
  | "waiting"
  | "complete"
  | "unavailable"
  | "error";

export function ReplayAnalysisView({
  matchId,
  signedIn,
  state,
  error,
  onRequest,
  onCheck,
}: {
  matchId: string;
  signedIn: boolean;
  state: ReplayState;
  error?: string;
  onRequest: () => void;
  onCheck: () => void;
}) {
  useLocale();
  const busy = state === "submitting" || state === "queued";
  const message =
    state === "submitting"
      ? copy.match.submittingReplay
      : state === "queued"
        ? copy.match.queuedReplay
        : state === "waiting"
          ? copy.match.waitingReplay
          : state === "unavailable"
            ? copy.match.unavailableReplay
            : state === "complete"
              ? copy.match.completeReplay
              : copy.match.replayHelp;
  return (
    <Alert
      id={`replay-analysis-${matchId}`}
      tabIndex={-1}
      role="note"
      className={
        "replay-analysis [&_h2]:text-[16px] [&_h2]:mb-2.5 [&_>_p_+_p]:mt-2.5"
      }
      aria-label={copy.match.replayAnalysis}
    >
      <h2>{copy.match.replayAnalysis}</h2>
      <p role={busy || state === "complete" ? "status" : undefined}>
        {message}
      </p>
      {error ? <p role="alert">{serviceText(error)}</p> : null}
      {state === "idle" ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {copy.match.replayCaveat}
        </p>
      ) : null}
      <div className="replay-actions flex items-center flex-wrap gap-4 mt-4 [&_.button]:min-h-10.5 [&_.button]:py-2.5 [&_.button]:px-3.5 [&_.button]:text-[12px]">
        {!signedIn ? (
          <Link
            to="/signin"
            className={buttonVariants({ variant: "secondary" })}
          >
            {copy.match.signInReplay}
          </Link>
        ) : state === "waiting" || state === "error" ? (
          <Button variant="secondary" onClick={onCheck}>
            {copy.match.checkReplay}
          </Button>
        ) : state !== "complete" ? (
          <Button variant="secondary" onClick={onRequest} disabled={busy}>
            {busy ? copy.match.submittingReplay : copy.match.requestReplay}
          </Button>
        ) : null}
        <a
          className={
            "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
          }
          href={`https://www.opendota.com/matches/${matchId}`}
          target="_blank"
          rel="noreferrer"
        >
          {copy.match.openDota} ↗
        </a>
      </div>
    </Alert>
  );
}

export function ReplayAnalysis({
  matchId,
  signedIn,
  cacheScope,
}: {
  matchId: string;
  signedIn: boolean;
  cacheScope?: string;
}) {
  useLocale();
  const client = useQueryClient();
  const [job, setJob] = useState<{ id: string; startedAt: number } | null>(
    null,
  );
  const submit = useRequestMatchParse({
    mutation: {
      retry: false,
      onMutate: () => setJob(null),
      onSuccess: (data) => setJob({ id: data.jobId, startedAt: Date.now() }),
    },
  });
  const progress = useGetMatchParseStatus(matchId, job?.id ?? "", {
    query: {
      enabled: signedIn && Boolean(job),
      retry: retryReplayPoll,
      retryDelay: () => 9000 + Math.random() * 2000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: (query) =>
        job &&
        Date.now() - job.startedAt < 5 * 60_000 &&
        !query.state.error &&
        (!query.state.data || query.state.data.status === "queued")
          ? 10000
          : false,
    },
  });
  useEffect(() => {
    if (progress.data?.match) {
      const matchKey = getGetMatchQueryKey(matchId);
      client.setQueryData(
        cacheScope ? [...matchKey, cacheScope] : matchKey,
        progress.data.match,
      );
      // Parsing can finish while a previously loaded evidence request is still
      // in flight. Discard that older read before refreshing active evidence.
      const queryKey = getGetMatchEvidenceQueryKey(matchId);
      void client
        .cancelQueries({ queryKey })
        .then(() => client.invalidateQueries({ queryKey }));
    }
  }, [client, matchId, cacheScope, progress.data]);

  const error = submit.error ?? progress.error;
  const state: ReplayState = submit.isPending
    ? "submitting"
    : error
      ? "error"
      : progress.data?.status === "complete"
        ? "complete"
        : progress.data?.status === "unavailable"
          ? "unavailable"
          : job
            ? Date.now() - job.startedAt >= 5 * 60_000
              ? "waiting"
              : "queued"
            : "idle";
  const request = () => submit.mutate({ matchId });
  return (
    <ReplayAnalysisView
      matchId={matchId}
      signedIn={signedIn}
      state={state}
      error={
        error
          ? error instanceof Error
            ? error.message
            : copy.errors.generic
          : undefined
      }
      onRequest={request}
      onCheck={() => {
        if (job) void progress.refetch();
        else request();
      }}
    />
  );
}
