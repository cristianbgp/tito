import { useLocale } from "../i18n/react";
import { copy } from "../i18n";
import { useEffect, useRef, useState } from "react";
import {
  getGetLocalGameStateQueryKey,
  useGetLocalGameState,
  setupLocalGameState,
} from "../api/generated/tito";
import type { LocalGameSetup } from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  ToolStats,
  useToolIdentity,
} from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import { dateFormatter } from "../i18n";
import { localGameCopy as c } from "../i18n/local-game";
export function downloadLocalConfiguration(setup: LocalGameSetup) {
  const url = URL.createObjectURL(
    new Blob([setup.configuration], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = setup.filename;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
function LocalGameContent() {
  useLocale();
  const identity = useToolIdentity(),
    request = useRef<AbortController | null>(null);
  // Configuration contains a token: keep it only in this component, outside query/mutation caches.
  const [setup, setSetup] = useState<LocalGameSetup | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const query = useGetLocalGameState({
      query: {
        queryKey: [...getGetLocalGameStateQueryKey(), ...identity.key],
        enabled: identity.signedIn && !identity.loading,
        staleTime: 0,
        gcTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
      },
    }),
    state = query.data;
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!setup) return;
    const timer = setTimeout(
      () => setSetup(null),
      Math.max(0, Date.parse(setup.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [setup]);
  useEffect(() => {
    if (query.data && !query.error && !query.data.configured) setSetup(null);
  }, [query.dataUpdatedAt, query.data, query.error]);
  const create = async () => {
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setSetup(null);
    try {
      const result = await setupLocalGameState(
        {},
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setSetup(result);
      await query.refetch();
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {!state && query.isFetching ? <p role="status">{c.checking}</p> : null}
      {state ? (
        !state.supported ? (
          <ToolPanel title={c.localOnly}>
            <p>{c.hosted}</p>
          </ToolPanel>
        ) : (
          <>
            <ToolPanel
              title={
                state.receivedAt
                  ? state.stale
                    ? c.stale
                    : c.connected
                  : c.waiting
              }
            >
              {!state.receivedAt ? (
                <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                  {c.noData}
                </p>
              ) : null}
              {state.receivedAt ? (
                <p>
                  {c.received}:{" "}
                  {dateFormatter.format(new Date(state.receivedAt))}
                </p>
              ) : null}
              {state.receivedAt ? (
                <p>
                  {c.counts(
                    state.allies.length,
                    state.enemies.length,
                    state.bans.length,
                  )}
                </p>
              ) : null}
              {state.partial ? (
                <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                  {c.partial}
                </p>
              ) : null}
              {state.expiresAt ? (
                <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                  {c.expires}: {dateFormatter.format(new Date(state.expiresAt))}
                </p>
              ) : null}
              <Button
                variant="secondary"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                {c.check}
              </Button>
            </ToolPanel>
            <ToolPanel title={c.setup}>
              <p>{c.setupHelp}</p>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                {c.tokenHelp}
              </p>
              {error ? <RequestError error={error} /> : null}
              <Button
                disabled={pending || query.isFetching || Boolean(query.error)}
                onClick={() => void create()}
              >
                {pending ? c.settingUp : c.setup}
              </Button>
              {pending ? <p role="status">{c.settingUp}</p> : null}
              {setup ? (
                <div className="grid min-w-0 gap-4">
                  <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                    {c.expires}:{" "}
                    {dateFormatter.format(new Date(setup.expiresAt))}
                  </p>
                  <ToolStats>
                    <div>
                      <dt>{c.receiver}</dt>
                      <dd>
                        <code className="wrap-anywhere">
                          {setup.receiverUrl}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt>{c.launchOption}</dt>
                      <dd>
                        <code className="wrap-anywhere">
                          {setup.launchOption}
                        </code>
                      </dd>
                    </div>
                  </ToolStats>
                  <Button
                    className="justify-self-start"
                    variant="secondary"
                    disabled={
                      Boolean(query.error) ||
                      !state.configured ||
                      Date.parse(setup.expiresAt) <= Date.now()
                    }
                    onClick={() => downloadLocalConfiguration(setup)}
                  >
                    {c.download}
                  </Button>
                  <details className="min-w-0 [&_summary]:cursor-pointer [&_summary]:text-sm [&_pre]:mt-3">
                    <summary>{c.inspect}</summary>
                    <pre style={{ overflowX: "auto" }}>
                      <code>{setup.configuration}</code>
                    </pre>
                  </details>
                </div>
              ) : null}
            </ToolPanel>
          </>
        )
      ) : null}
    </>
  );
}
export function LocalGamePage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/account"
      backLabel={copy.nav.account}
      title={c.title}
      description={c.description}
    >
      <PrivateTool>
        <LocalGameContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
