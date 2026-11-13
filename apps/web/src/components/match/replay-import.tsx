import { useEffect, useId, useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { Link } from "react-router";
import {
  cancelReplayImport,
  completeReplayImport,
  getGetMatchQueryKey,
  getGetPlayerProgressQueryKey,
  startReplayImport,
  uploadReplayChunk,
  useGetReplayImport,
  useGetReplayImportCapabilities,
} from "../../api/generated/tito";
import type { ReplayImportState } from "../../api/generated/models";
import { copy } from "../../i18n";
import { useLocale } from "../../i18n/react";
import { Button, buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RequestError } from "../shared";

export function ReplayImportControl({
  scope,
  accountId,
}: {
  scope: QueryKey;
  accountId: string;
}) {
  useLocale();
  const text = copy.replayImport,
    fileId = useId(),
    client = useQueryClient();
  const capabilities = useGetReplayImportCapabilities({
    query: {
      queryKey: ["replay-import-capabilities", ...scope],
      retry: false,
      staleTime: 0,
    },
  });
  const [file, setFile] = useState<File>();
  const [job, setJob] = useState<ReplayImportState>();
  const [cancelError, setCancelError] = useState<unknown>();
  const controller = useRef<AbortController | null>(null),
    mounted = useRef(true),
    completed = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const upload = useMutation({
    retry: false,
    mutationFn: async (selected: File) => {
      const limits = capabilities.data;
      if (
        !limits?.enabled ||
        !/\.dem$/i.test(selected.name) ||
        selected.size < 16 ||
        selected.size > limits.maxBytes
      )
        throw new Error(copy.replayImport.invalid);
      const abort = new AbortController();
      controller.current = abort;
      let current: ReplayImportState | undefined;
      try {
        current = await startReplayImport(
          { filename: selected.name, size: selected.size },
          { signal: abort.signal },
        );
        if (mounted.current) setJob(current);
        for (
          let offset = 0;
          offset < selected.size;
          offset += limits.chunkBytes
        ) {
          current = await uploadReplayChunk(
            current.id,
            selected.slice(offset, offset + limits.chunkBytes),
            { offset },
            { signal: abort.signal },
          );
          if (mounted.current) setJob(current);
        }
        current = await completeReplayImport(current.id, {
          signal: abort.signal,
        });
        if (mounted.current) setJob(current);
        return current;
      } catch (error) {
        if (current?.id && current.status === "uploading")
          void cancelReplayImport(current.id).catch(() => {});
        if (mounted.current && current)
          setJob({
            ...current,
            status: "failed",
            error: error instanceof Error ? error.message : copy.errors.generic,
          });
        throw error;
      }
    },
  });
  const active = job ?? capabilities.data?.activeImport ?? undefined;
  const progress = useGetReplayImport(active?.id ?? "", {
    query: {
      queryKey: ["replay-import", ...scope, active?.id],
      enabled:
        active?.status === "processing" || active?.status === "uploading",
      retry: false,
      refetchInterval: (query) =>
        query.state.data?.status === "complete" ||
        query.state.data?.status === "failed"
          ? false
          : 1500,
    },
  });
  const state =
    job &&
    (upload.isPending || job.status === "failed" || job.status === "complete")
      ? job
      : (progress.data ?? active);
  useEffect(() => {
    if (
      state?.status !== "complete" ||
      !state.matchId ||
      completed.current === state.id
    )
      return;
    completed.current = state.id;
    void (async () => {
      await client.cancelQueries({ queryKey: scope });
      if (!mounted.current) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: scope }),
        client.invalidateQueries({ queryKey: getGetPlayerProgressQueryKey() }),
        client.invalidateQueries({
          queryKey: getGetMatchQueryKey(state.matchId!),
        }),
      ]);
    })();
  }, [state?.id, state?.status, state?.matchId, client, scope]);
  const busy =
    upload.isPending ||
    state?.status === "uploading" ||
    state?.status === "processing";
  async function cancel() {
    setCancelError(undefined);
    controller.current?.abort();
    if (!state) return;
    try {
      const result = await cancelReplayImport(state.id);
      if (!mounted.current) return;
      setJob(result);
      client.setQueryData(["replay-import", ...scope, state.id], result);
    } catch (error) {
      if (mounted.current) setCancelError(error);
    }
  }
  return (
    <section
      className="grid min-w-0 gap-4 border-t border-border pt-4"
      aria-label={text.action}
    >
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">{text.title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {text.description}
        </p>
      </div>
      {capabilities.error ? (
        <RequestError
          error={capabilities.error}
          retry={() => void capabilities.refetch()}
        />
      ) : !capabilities.data ? (
        <p role="status" className="text-xs text-muted-foreground">
          {copy.shell.loading}
        </p>
      ) : !capabilities.data.enabled ? (
        <p className="text-xs text-muted-foreground">{text.unavailable}</p>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor={fileId}>{text.file}</Label>
            <Input
              id={fileId}
              type="file"
              accept=".dem"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0]);
                upload.reset();
              }}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {text.limits(
              Math.floor(capabilities.data.maxBytes / 1024 / 1024),
              capabilities.data.retentionLimit,
              capabilities.data.dailyLimit,
            )}
          </p>
          {busy ? (
            <div className="grid gap-2" role="status" aria-live="polite">
              <span className="text-sm">
                {state?.status === "processing"
                  ? text.processing
                  : text.uploading}{" "}
                {state?.status === "uploading"
                  ? `${Math.round((state.uploadedBytes / state.totalBytes) * 100)}%`
                  : ""}
              </span>
              <progress
                className="h-2 w-full accent-primary"
                aria-label={text.progress}
                max={100}
                value={
                  state?.status === "processing"
                    ? undefined
                    : state
                      ? (state.uploadedBytes / state.totalBytes) * 100
                      : 0
                }
              />
              {state?.status === "processing" ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {text.processingHelp}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={!file || busy}
              onClick={() => {
                setJob(undefined);
                setCancelError(undefined);
                upload.mutate(file!);
              }}
            >
              {text.submit}
            </Button>
            {busy ? (
              <Button size="sm" variant="ghost" onClick={() => void cancel()}>
                {text.cancel}
              </Button>
            ) : null}
            {state?.status === "complete" && state.matchId ? (
              <Link
                className={buttonVariants({ variant: "default", size: "sm" })}
                to={`/matches/${state.matchId}?player=${accountId}`}
              >
                {text.open}
              </Link>
            ) : null}
          </div>
          {state?.status === "complete" ? (
            <p role="status" className="text-xs text-[var(--success)]">
              {text.success}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {text.privacy}
          </p>
        </>
      )}
      {upload.error ? (
        <RequestError error={upload.error} />
      ) : state?.status === "failed" && state.error ? (
        <RequestError error={new Error(state.error)} />
      ) : null}
      {progress.error ? (
        <RequestError
          error={progress.error}
          retry={() => void progress.refetch()}
        />
      ) : null}
      {cancelError ? <RequestError error={cancelError} /> : null}
    </section>
  );
}
