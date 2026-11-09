import { useLocale } from "../../i18n/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReviewFeedbackQueryKey,
  useGetReviewFeedback,
  useSaveReviewFeedback,
  useDeleteReviewFeedback,
} from "../../api/generated/tito";
import type {
  SaveReviewFeedbackBody,
  GetReviewFeedback200,
} from "../../api/generated/models";
import { libraryCopy as c } from "../../i18n/library";
import { PrivateTool, ToolPanel, useToolIdentity } from "../toolkit";
import { RequestError } from "../shared";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
export function ReviewFeedback({
  matchId,
  generatedAt,
}: {
  matchId: string;
  generatedAt?: string;
}) {
  useLocale();
  const identity = useToolIdentity();
  return (
    <PrivateTool steam>
      <FeedbackContent
        key={`${identity.key.join(":")}:${matchId}:${generatedAt ?? "current"}`}
        matchId={matchId}
        generatedAt={generatedAt}
      />
    </PrivateTool>
  );
}
function FeedbackContent({
  matchId,
  generatedAt,
}: {
  matchId: string;
  generatedAt?: string;
}) {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [
    ...getGetReviewFeedbackQueryKey(matchId),
    generatedAt ?? "current",
    ...identity.key,
  ];
  const query = useGetReviewFeedback(matchId, {
    query: { queryKey, retry: false, refetchOnMount: "always" },
  });
  const save = useSaveReviewFeedback({ mutation: { retry: false } });
  const remove = useDeleteReviewFeedback({ mutation: { retry: false } });
  const [status, setStatus] = useState<
    "feedbackSaved" | "feedbackCleared" | null
  >(null);
  return (
    <ToolPanel title={c.feedbackTitle}>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {c.feedbackHelp}
      </p>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? (
        <p role="status">{c.loading}</p>
      ) : query.data ? (
        <FeedbackEditor
          key={query.data.feedback?.updatedAt ?? "empty"}
          matchId={matchId}
          initial={query.data.feedback}
          busy={save.isPending || remove.isPending}
          onSave={async (data) => {
            setStatus(null);
            remove.reset();
            const feedback = await save.mutateAsync({ matchId, data });
            client.setQueryData(queryKey, { feedback });
            setStatus("feedbackSaved");
          }}
        />
      ) : null}
      {query.data?.feedback ? (
        <Button
          type="button"
          variant="ghost"
          className="justify-self-start"
          disabled={save.isPending || remove.isPending}
          onClick={() => {
            setStatus(null);
            save.reset();
            void remove
              .mutateAsync({ matchId })
              .then(() => {
                client.setQueryData(queryKey, { feedback: null });
                setStatus("feedbackCleared");
              })
              .catch(() => {});
          }}
        >
          {remove.isPending ? c.clearingFeedback : c.clearFeedback}
        </Button>
      ) : null}
      {save.error ? <RequestError error={save.error} /> : null}
      {remove.error ? <RequestError error={remove.error} /> : null}
      {status ? (
        <p
          role="status"
          className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
        >
          {c[status]}
        </p>
      ) : null}
    </ToolPanel>
  );
}
export function FeedbackEditor({
  matchId,
  initial,
  busy,
  onSave,
}: {
  matchId: string;
  initial: GetReviewFeedback200["feedback"];
  busy: boolean;
  onSave: (data: SaveReviewFeedbackBody) => Promise<void>;
}) {
  useLocale();
  const [rating, setRating] = useState<SaveReviewFeedbackBody["rating"] | null>(
    initial?.rating ?? null,
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating && !busy) void onSave({ rating, comment }).catch(() => {});
      }}
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={c.feedbackTitle}
      >
        {Object.entries(c.ratings).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={rating === value ? "default" : "secondary"}
            aria-pressed={rating === value}
            disabled={busy}
            onClick={() => setRating(value as SaveReviewFeedbackBody["rating"])}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`feedback-${matchId}`}>{c.comment}</Label>
        <textarea
          id={`feedback-${matchId}`}
          className="ui-input min-h-20 resize-y"
          maxLength={500}
          rows={3}
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
        />
        <span className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {comment.length}/500
        </span>
      </div>
      <Button
        type="submit"
        className="justify-self-start"
        disabled={busy || rating === null}
      >
        {busy ? c.saving : c.sendFeedback}
      </Button>
    </form>
  );
}
