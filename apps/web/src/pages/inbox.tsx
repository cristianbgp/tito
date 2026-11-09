import { useLocale } from "../i18n/react";
import { Alert } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useState } from "react";
import { Link } from "react-router";
import { useGetAppConfig, useGetLocalEmails } from "../api/generated/tito";
import { copy, dateFormatter } from "../i18n";
import { EmptyState, PageHeading, RequestError } from "../components/shared";

export function InboxPage() {
  useLocale();
  const { data: config } = useGetAppConfig();
  const { data, error, isFetching, refetch } = useGetLocalEmails({
    query: {
      enabled: config?.localInboxEnabled === true,
      staleTime: 0,
      refetchInterval: 5000,
    },
  });
  const [selected, setSelected] = useState<string>();
  const message = data?.find((email) => email.id === selected);
  const actionUrl = message?.text.match(
    /https?:\/\/[^\s)]+magic-link\/verify[^\s)]+/,
  )?.[0];

  return (
    <section>
      <PageHeading
        eyebrow={copy.inbox.eyebrow}
        title={copy.inbox.title}
        description={copy.inbox.description}
      />
      {config && !config.localInboxEnabled ? (
        <Alert role="note">{copy.inbox.unavailable}</Alert>
      ) : (
        <>
          <div
            className={
              "section-header flex items-center justify-between gap-3.5 mb-5 max-[580px]:[&_h2]:text-[19px]"
            }
          >
            <Link
              to="/signin"
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
            >
              {copy.nav.signIn} ↗
            </Link>
            <Button
              variant="unstyled"
              className="text-button inline-flex items-center gap-1.75 text-primary text-[12px] py-1.25 px-0 border-0 bg-transparent [@media(hover:_hover)]:[&:hover]:text-foreground"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {copy.inbox.refresh} ↻
            </Button>
          </div>
          {error ? (
            <RequestError error={error} retry={() => void refetch()} />
          ) : null}
          {message ? (
            <Card
              render={<div />}
              className={
                "email-detail min-w-0 [&_h2]:mt-6 [&_h2]:wrap-anywhere [&_iframe]:w-full [&_iframe]:h-137.5 [&_iframe]:border-0 [&_iframe]:rounded-[16px] [&_iframe]:mt-6 [&_iframe]:[background:white]"
              }
            >
              <Button
                variant="unstyled"
                className="text-button inline-flex items-center gap-1.75 text-primary text-[12px] py-1.25 px-0 border-0 bg-transparent [@media(hover:_hover)]:[&:hover]:text-foreground"
                onClick={() => setSelected(undefined)}
              >
                ← {copy.inbox.back}
              </Button>
              <h2>{message.subject}</h2>
              <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
                {copy.inbox.to}: {message.to}
              </p>
              {actionUrl ? (
                <a
                  href={actionUrl}
                  className={buttonVariants({ variant: "default" })}
                >
                  {copy.inbox.open} ↗
                </a>
              ) : null}
              <iframe
                title={copy.inbox.preview}
                srcDoc={message.html}
                sandbox=""
                referrerPolicy="no-referrer"
              />
            </Card>
          ) : data?.length === 0 ? (
            <EmptyState title={copy.inbox.emptyTitle}>
              {copy.inbox.emptyText}
            </EmptyState>
          ) : (
            <div className="inbox-list min-w-0 [border-top:1px_solid_var(--line)]">
              {data?.map((email) => (
                <Button
                  variant="unstyled"
                  className="email-row flex min-w-0 gap-5 items-center w-full py-5.25 px-3.5 border-0 [border-bottom:1px_solid_var(--line)] bg-transparent text-foreground text-left [&_strong]:block [&_strong]:wrap-anywhere [&_strong]:text-[14px] [&_strong]:[font-weight:550] [&_small]:block [&_small]:text-muted-foreground [&_small]:mt-1.5 [&_small]:text-[12px] [&_small]:wrap-anywhere [&_time]:shrink-0 [&_time]:text-muted-foreground [&_time]:text-[11px] [&_time]:whitespace-nowrap [@media(hover:_hover)]:[&:hover]:bg-[var(--surface-raised)] max-[580px]:gap-3 max-[580px]:[&_time]:max-w-22.5 max-[580px]:[&_time]:whitespace-normal"
                  key={email.id}
                  onClick={() => setSelected(email.id)}
                >
                  <span className="min-w-0 flex-1">
                    <strong>{email.subject}</strong>
                    <small>{email.to}</small>
                  </span>
                  <time dateTime={email.createdAt}>
                    {dateFormatter.format(new Date(email.createdAt))}
                  </time>
                  <span className="shrink-0" aria-hidden="true">
                    ↗
                  </span>
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
