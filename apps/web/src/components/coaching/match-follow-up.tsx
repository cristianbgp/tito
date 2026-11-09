import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { labelStyles } from "../ui/label";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMatchFollowUpQueryKey,
  useGetMatchFollowUp,
  useGenerateMatchFollowUp,
} from "../../api/generated/tito";
import type { GenerateMatchFollowUpBody } from "../../api/generated/models";
import { PrivateTool, ToolPanel, useToolIdentity } from "../toolkit";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { RequestError } from "../shared";
import { SavedCoachingAnswer } from "./evidence";
import { coachingCopy as c } from "../../i18n/coaching";
function FollowUpContent({ matchId }: { matchId: string }) {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient(),
    inputId = useId(),
    hintId = useId();
  const [question, setQuestion] = useState("");
  const queryKey = [...getGetMatchFollowUpQueryKey(matchId), ...identity.key];
  const query = useGetMatchFollowUp(matchId, {
    query: {
      queryKey,
      enabled:
        identity.signedIn && Boolean(identity.steamId) && !identity.loading,
      staleTime: 60000,
      retry: false,
    },
  });
  const mutation = useGenerateMatchFollowUp({
    mutation: {
      retry: false,
      onSuccess: (data) => client.setQueryData(queryKey, data),
    },
  });
  const data = query.data,
    disabled = !data?.enabled || mutation.isPending;
  if (
    !data?.answer &&
    !query.error &&
    (query.isPending || data?.enabled === false)
  )
    return null;
  return (
    <ToolPanel title={c.followUp}>
      <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
        {c.followUpDescription}
      </p>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.error && data ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {c.cached}
        </p>
      ) : null}
      {data ? (
        !data.enabled ? (
          <p className="notice my-5 mx-0 py-4.5 px-5.25 text-[13px] leading-[1.8] border border-border rounded-[15px] bg-[var(--surface-raised)] text-muted-foreground [&.error]:[border-color:var(--danger)] [&.error]:bg-[var(--danger-tint)] [&.error]:text-foreground [&_p]:m-0 [&_.text-button]:mt-2 max-[580px]:p-4">
            {c.notConfigured}
          </p>
        ) : null
      ) : null}
      {data?.answer ? (
        <SavedCoachingAnswer answer={data.answer} />
      ) : (
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
          {c.noAnswer}
        </p>
      )}
      <div className="button-row">
        {data?.questions.map((q) => (
          <Button
            key={q.id}
            variant="secondary"
            disabled={disabled}
            onClick={() =>
              mutation.mutate({
                matchId,
                data: {
                  questionId: q.id as GenerateMatchFollowUpBody["questionId"],
                },
              })
            }
          >
            {serviceText(q.label)}
          </Button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && question.trim())
            mutation.mutate({ matchId, data: { question: question.trim() } });
        }}
      >
        <label htmlFor={inputId} className={labelStyles}>
          {c.question}
        </label>
        <Input
          id={inputId}
          value={question}
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
          aria-describedby={hintId}
          disabled={disabled}
        />
        <p
          className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
          id={hintId}
        >
          {c.questionHint}{" "}
          {data?.privacyNotice ? serviceText(data.privacyNotice) : c.privacy}
        </p>
        <Button type="submit" disabled={disabled || !question.trim()}>
          {mutation.isPending ? c.asking : c.ask}
        </Button>
      </form>
      {mutation.isPending ? <p role="status">{c.asking}</p> : null}
      {mutation.error ? <RequestError error={mutation.error} /> : null}
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {c.limits}
      </p>
    </ToolPanel>
  );
}
export function MatchFollowUp({ matchId }: { matchId: string }) {
  useLocale();
  const identity = useToolIdentity();
  return (
    <PrivateTool steam>
      <FollowUpContent
        key={`${identity.key.join(":")}:${matchId}`}
        matchId={matchId}
      />
    </PrivateTool>
  );
}
