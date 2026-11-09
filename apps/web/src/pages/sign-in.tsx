import { useLocale } from "../i18n/react";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useGetAppConfig } from "../api/generated/tito";
import { authClient } from "../lib/auth";
import { copy } from "../i18n";
import { PageHeading, RequestError } from "../components/shared";

export function SignInPage() {
  useLocale();
  const { data: session } = authClient.useSession();
  const { data: config, error: configError } = useGetAppConfig();
  const [params] = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();

  if (session) return <Navigate to="/account" replace />;

  async function steam() {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.steam.login({
        callbackURL: "/account",
        errorCallbackURL: "/signin",
      });
      if (result.error)
        throw new Error(result.error.message ?? copy.auth.failure);
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-layout grid grid-cols-[minmax(0,_1fr)_minmax(300px,_0.9fr)] items-start gap-8 max-[800px]:grid-cols-1 max-[800px]:gap-6">
      <div className="auth-story min-w-0 max-[800px]:[&_.page-heading]:mb-0">
        <PageHeading
          eyebrow={copy.auth.eyebrow}
          title={copy.auth.title}
          description={copy.auth.description}
        />
        <div
          className={
            'auth-art relative overflow-hidden max-w-120 [aspect-ratio:1.8] border border-border rounded-[24px] [background:#172029] [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&::after]:[content:""] [&::after]:absolute [&::after]:[inset:0] [&::after]:[background:linear-gradient(0deg,_rgb(0_0_0_/_0.85),_transparent)] [&_span]:absolute [&_span]:z-[1] [&_span]:bottom-5.75 [&_span]:left-6 [&_span]:right-6 [&_span]:text-[10px] [&_span]:tracking-[1.2px] [&_span]:text-[#fff] max-[800px]:hidden'
          }
          aria-hidden="true"
        >
          <img
            src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/terrorblade.png"
            alt=""
            width="256"
            height="144"
          />
          <span>{copy.tagline}</span>
        </div>
      </div>
      <Card render={<div />} className="auth-form min-w-0">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight">
          {copy.auth.steamHeading}
        </h2>
        <p className="mb-6 mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {copy.auth.steamHelp}
        </p>
        <Button
          className="w-full"
          disabled={pending || !config?.steamEnabled}
          onClick={() => void steam()}
        >
          {pending ? copy.auth.connecting : copy.auth.steam}
        </Button>
        {config && !config.steamEnabled ? (
          <Alert role="note" className="mt-4">
            {copy.auth.steamUnavailable}
          </Alert>
        ) : null}
        <p className="mb-0 mt-6 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
          {copy.auth.footnote}
        </p>
        <div id="signin-error">
          {error || configError ? (
            <RequestError error={error ?? configError} />
          ) : params.has("error") ? (
            <Alert variant="destructive">{copy.auth.failure}</Alert>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
