import { useLocale } from "../i18n/react";
import { Alert } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useGetAppConfig } from "../api/generated/tito";
import { authClient } from "../lib/auth";
import { copy } from "../i18n";
import { PageHeading, RequestError } from "../components/shared";
import { CheckCircleIcon } from "../components/icons";

export function SignInPage() {
  useLocale();
  const { data: session } = authClient.useSession();
  const { data: config, error: configError } = useGetAppConfig();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();

  if (session) return <Navigate to="/account" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signIn.magicLink({
        email,
        name: email.split("@")[0],
        callbackURL: `${window.location.origin}/account`,
        errorCallbackURL: `${window.location.origin}/signin`,
      });
      if (result.error)
        throw new Error(result.error.message ?? copy.auth.failure);
      setSent(true);
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }

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
      <Card
        render={<div />}
        className="auth-form min-w-0 [&_form]:grid [&_form_.button]:mt-4.5"
      >
        {sent ? (
          <div role="status">
            <span
              className={
                "success-mark grid place-items-center w-12 h-12 text-[var(--success)] mb-4.5"
              }
              aria-hidden="true"
            >
              <CheckCircleIcon size={36} />
            </span>
            <h2>{copy.auth.sentTitle}</h2>
            <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
              {config?.localInboxEnabled ? copy.auth.localSent : copy.auth.sent}
            </p>
            {config?.localInboxEnabled ? (
              <Link
                to="/dev/inbox"
                className={buttonVariants({ variant: "default" })}
              >
                {copy.auth.inbox} ↗
              </Link>
            ) : null}
            <Button
              variant="unstyled"
              className="text-button block-button items-center gap-1.75 text-primary text-[12px] py-1.25 px-0 border-0 bg-transparent [@media(hover:_hover)]:[&:hover]:text-foreground block mt-6"
              onClick={() => setSent(false)}
            >
              {copy.auth.another}
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={(event) => void submit(event)}>
              <Label htmlFor="email">{copy.auth.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={copy.auth.placeholder}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={pending}
                aria-describedby={error ? "signin-error" : undefined}
              />
              <Button
                type="submit"
                className={"full-width w-full"}
                disabled={pending || !config}
              >
                {pending ? copy.auth.sending : copy.auth.send}
                <span aria-hidden="true">↗</span>
              </Button>
            </form>
            {config?.steamEnabled ? (
              <>
                <div
                  className={
                    'divider flex items-center gap-3 text-muted-foreground text-[12px] my-6 mx-0 [&::before]:[content:""] [&::before]:flex-[1] [&::before]:h-0.25 [&::before]:bg-[var(--line)] [&::after]:[content:""] [&::after]:flex-[1] [&::after]:h-0.25 [&::after]:bg-[var(--line)]'
                  }
                >
                  <span>{copy.auth.or}</span>
                </div>
                <Button
                  variant="secondary"
                  className={"full-width w-full"}
                  disabled={pending}
                  onClick={() => void steam()}
                >
                  {copy.auth.steam}
                </Button>
              </>
            ) : (
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                {copy.auth.steamUnavailable}
              </p>
            )}
            <p className="field-hint form-footnote text-muted-foreground text-[12px] leading-[1.7] mx-0 mb-0 pt-4.5 [border-top:1px_solid_var(--line)] mt-6">
              {copy.auth.footnote}
            </p>
          </>
        )}
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
