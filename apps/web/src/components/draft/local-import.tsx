import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  getGetLocalGameStateQueryKey,
  useGetLocalGameState,
} from "../../api/generated/tito";
import type { LocalGameSnapshot } from "../../api/generated/models";
import { useToolIdentity } from "../toolkit";
import { Button } from "../ui/button";
import { RequestError } from "../shared";
import { localGameCopy as c } from "../../i18n/local-game";
export function importableLocalState(
  state: LocalGameSnapshot,
  now = Date.now(),
) {
  if (
    !state.supported ||
    !state.configured ||
    state.stale ||
    !state.receivedAt ||
    !state.expiresAt ||
    !["radiant", "dire"].includes(state.team ?? "")
  )
    return false;
  const received = Date.parse(state.receivedAt),
    expires = Date.parse(state.expiresAt);
  if (
    !Number.isFinite(received) ||
    now - received > 15000 ||
    received - now > 5000 ||
    !Number.isFinite(expires) ||
    expires <= now
  )
    return false;
  if (
    state.allies.length > 4 ||
    state.enemies.length > 5 ||
    state.bans.length > 30
  )
    return false;
  const all = [...state.allies, ...state.enemies, ...state.bans];
  return (
    all.length > 0 &&
    all.every((id) => Number.isSafeInteger(id) && id > 0 && id <= 10000) &&
    new Set(all).size === all.length &&
    (!state.ownHeroId || !state.allies.includes(state.ownHeroId))
  );
}
function ImportContent({
  onImport,
}: {
  onImport: (state: {
    allies: number[];
    enemies: number[];
    bans: number[];
  }) => void;
}) {
  useLocale();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const identity = useToolIdentity(),
    [error, setError] = useState<Error | null>(null),
    [imported, setImported] = useState(false);
  const query = useGetLocalGameState({
    query: {
      queryKey: [...getGetLocalGameStateQueryKey(), ...identity.key],
      enabled: identity.signedIn && !identity.loading,
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const data = query.data;
  const importPicks = async () => {
    setError(null);
    setImported(false);
    const fresh = await query.refetch();
    if (!active.current) return;
    if (fresh.error) {
      setError(new Error(c.importFailed));
      return;
    }
    if (!fresh.data || !importableLocalState(fresh.data)) {
      setError(new Error(c.importUnavailable));
      return;
    }
    onImport({
      allies: [...fresh.data.allies],
      enemies: [...fresh.data.enemies],
      bans: [...fresh.data.bans],
    });
    setImported(true);
  };
  return (
    <section
      aria-label={c.title}
      className="tool-panel p-7 min-w-0 grid gap-4 [&_h2]:text-[22px] [&_h2]:tracking-[-0.035em] [&_h2]:leading-[1.25] [&_h3]:text-[17px] [&_h3]:leading-[1.4] [&_p]:leading-[1.6] [&_p]:wrap-anywhere [&_>_.muted]:m-0 [&_>_.tool-grid]:mt-0 [&_>_.select-action-row]:mt-0 [&_>_.mt-4.flex]:mt-0 [&_:is(dl,_ul,_ol)]:min-w-0 [&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:gap-4 [&_dl_>_div]:py-2 [&_dl_>_div]:px-0 [&_dl_>_div]:[border-bottom:1px_solid_var(--line)] [&_dd]:tabular-nums [&_dd]:text-right [&_dt]:text-muted-foreground [&_textarea]:w-full [&_textarea]:p-3 [&_textarea]:leading-[1.6] [&_textarea]:border [&_textarea]:border-border [&_textarea]:rounded-[12px] [&_textarea]:bg-[var(--input)] [&_textarea]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] [&_table]:text-left [&_:is(th,_td)]:py-2.5 [&_:is(th,_td)]:px-3 [&_:is(th,_td)]:[border-bottom:1px_solid_var(--line)] [&_:is(th,_td)]:[vertical-align:top] [&_th]:text-muted-foreground [&_th]:font-medium [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:text-[12px] [&_:is(input,_select,_button)]:max-w-full max-[600px]:p-5"
    >
      <h3>{c.title}</h3>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {data && !data.supported ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {c.hosted}
        </p>
      ) : (
        <>
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {c.freshness}
          </p>
          {data?.partial ? (
            <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
              {c.partial}
            </p>
          ) : null}
          <Button
            variant="secondary"
            disabled={query.isFetching || !data?.supported || !data.configured}
            onClick={() => void importPicks()}
          >
            {query.isFetching ? c.checking : c.import}
          </Button>
          <Link
            className={
              "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
            }
            to="/tools/local-game"
          >
            {c.setupLink}
          </Link>
        </>
      )}
      {error ? <p role="alert">{serviceText(error.message)}</p> : null}
      {imported ? <p role="status">{c.imported}</p> : null}
    </section>
  );
}
export function LocalDraftImport({
  onImport,
}: {
  onImport: (state: {
    allies: number[];
    enemies: number[];
    bans: number[];
  }) => void;
}) {
  useLocale();
  const identity = useToolIdentity();
  return identity.signedIn ? (
    <ImportContent key={identity.key.join(":")} onImport={onImport} />
  ) : null;
}
