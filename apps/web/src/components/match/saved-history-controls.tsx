import { useLocale } from "../../i18n/react";
import { useEffect, useState, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getGetPlayerProgressQueryKey,
  useSyncSavedHistory,
} from "../../api/generated/tito";
import type { SavedHistory } from "../../api/generated/models";
import { copy, dateFormatter } from "../../i18n";
import { Button } from "../ui/button";
import { RequestError } from "../shared";

export function SavedHistoryControls({
  history,
  scope,
  loading,
  onShowMore,
}: {
  history?: SavedHistory;
  scope: QueryKey;
  loading: boolean;
  onShowMore: () => void;
}) {
  useLocale();
  const client = useQueryClient();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const sync = useSyncSavedHistory({
    mutation: {
      retry: false,
      onSuccess: async (data) => {
        if (!active.current) return;
        // A focus/reconnect read may still contain the pre-sync snapshot.
        await client.cancelQueries({ queryKey: [...scope, 100], exact: true });
        if (!active.current) return;
        client.setQueryData([...scope, 100], data);
        void client.invalidateQueries({
          queryKey: getGetPlayerProgressQueryKey(),
        });
        void client.invalidateQueries({
          queryKey: scope,
          predicate: (query) => query.queryKey.at(-1) !== 100,
        });
      },
      onError: () => {
        if (active.current) void client.invalidateQueries({ queryKey: scope });
      },
    },
  });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!sync.isPending) return;
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, [sync.isPending]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!history?.nextSyncAt) return;
    const delay = Date.parse(history.nextSyncAt) - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(
      () => tick((value) => value + 1),
      delay + 100,
    );
    return () => window.clearTimeout(timer);
  }, [history?.nextSyncAt]);
  const waiting = Boolean(
    history?.nextSyncAt && Date.parse(history.nextSyncAt) > Date.now(),
  );
  const disabled = loading || sync.isPending || waiting || !history;
  const firstImport = !history?.lastSyncedAt;
  const capped = Boolean(history && history.total >= history.retentionLimit);
  return (
    <div className="saved-history-controls grid gap-3 p-4 mb-5 border border-border rounded-[18px] bg-[var(--surface-raised)] [&_p]:m-0">
      <div className={"saved-history-meta grid gap-1.5"}>
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {history?.lastSyncedAt
            ? copy.savedHistory.synced(
                dateFormatter.format(new Date(history.lastSyncedAt)),
              )
            : copy.savedHistory.intro}
        </p>
        {history ? (
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {copy.savedHistory.scope(
              history.matches.length,
              history.total,
              history.retentionLimit,
            )}
          </p>
        ) : null}
      </div>
      <div
        className={
          "saved-history-actions flex flex-wrap items-center gap-[8px_16px] [&_.text-button]:min-h-9"
        }
      >
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => sync.mutate({ data: { mode: "latest" } })}
        >
          {sync.isPending
            ? copy.savedHistory.syncing
            : firstImport
              ? copy.savedHistory.import
              : copy.savedHistory.sync}
        </Button>
        {!firstImport && history?.hasOlder ? (
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => sync.mutate({ data: { mode: "older" } })}
          >
            {copy.savedHistory.older}
          </Button>
        ) : null}
        {history && history.matches.length < history.total ? (
          <Button
            variant="ghost"
            disabled={loading || sync.isPending}
            onClick={onShowMore}
          >
            {copy.savedHistory.more}
          </Button>
        ) : null}
      </div>
      {sync.isPending && slow ? (
        <p
          role="status"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {copy.savedHistory.slowSync}
        </p>
      ) : null}
      {waiting && history?.nextSyncAt ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {copy.savedHistory.available(
            dateFormatter.format(new Date(history.nextSyncAt)),
          )}
        </p>
      ) : null}
      {capped ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {copy.savedHistory.capped(history!.retentionLimit)}
        </p>
      ) : null}
      {sync.error ? <RequestError error={sync.error} /> : null}
    </div>
  );
}
