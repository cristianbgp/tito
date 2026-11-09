import { useLocale } from "../i18n/react";
import { copy, currencyFormatter as money } from "../i18n";
import {
  getGetPersonalAiUsageQueryKey,
  useGetPersonalAiUsage,
} from "../api/generated/tito";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  ToolStats,
  useToolIdentity,
} from "../components/toolkit";
import { Button } from "../components/ui/button";
import { RequestError } from "../components/shared";
import { usageCopy as c } from "../i18n/coaching";
function UsageContent() {
  useLocale();
  const identity = useToolIdentity();
  const query = useGetPersonalAiUsage({
      query: {
        queryKey: [...getGetPersonalAiUsageQueryKey(), ...identity.key],
        enabled: identity.signedIn && !identity.loading,
        staleTime: 15000,
        retry: false,
      },
    }),
    data = query.data;
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.error && data ? (
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
          {c.cached}
        </p>
      ) : null}
      {!data && query.isFetching ? <p role="status">{c.loading}</p> : null}
      {data ? (
        <>
          <p>{c.day(data.day)}</p>
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
            {c.resets(
              `${new Date(data.resetsAt).toISOString().slice(0, 10)} 00:00 UTC`,
            )}
          </p>
          {!data.enabled ? (
            <p className="notice m-0 py-4.5 px-5.25 text-[13px] leading-[1.8] border border-border rounded-[15px] bg-[var(--surface-raised)] text-muted-foreground [&.error]:[border-color:var(--danger)] [&.error]:bg-[var(--danger-tint)] [&.error]:text-foreground [&_p]:m-0 [&_.text-button]:mt-2 max-[580px]:p-4">
              {c.unavailable}
            </p>
          ) : null}
          <div
            className={
              "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
            }
          >
            {(["reviews", "drafts", "coaching"] as const).map((kind) => {
              const counter = data[kind];
              return (
                <ToolPanel key={kind} title={c[kind]}>
                  <p>
                    <strong>{c.remaining(counter.remaining)}</strong>
                  </p>
                  <p>{c.attempts(counter.attempts, counter.allowance)}</p>
                  <ToolStats>
                    <div>
                      <dt>{c.cost}</dt>
                      <dd>{money.format(counter.estimatedCostUsd)}</dd>
                    </div>
                  </ToolStats>
                </ToolPanel>
              );
            })}
          </div>
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
            {c.estimate}
          </p>
          <Button
            variant="secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {c.refresh}
          </Button>
        </>
      ) : null}
    </>
  );
}
export function UsagePage() {
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
        <UsageContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
