import { LanguageControl } from "../components/language";
import { useLocale } from "../i18n/react";
import { Alert } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { authClient } from "../lib/auth";
import {
  getGetPlayerProfileQueryKey,
  useGetAppConfig,
  useGetPlayerProfile,
} from "../api/generated/tito";
import { unavailable, copy } from "../i18n";
import { PageHeading, RequestError } from "../components/shared";
import { PlayerPreferences } from "../components/player-preferences";

export function AccountPage() {
  useLocale();
  const [params] = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const { data: config } = useGetAppConfig();
  const profile = useGetPlayerProfile({
    query: {
      queryKey: [...getGetPlayerProfileQueryKey(), session?.user.id],
      enabled: Boolean(session),
    },
  });
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);

  async function connectSteam() {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.steam.link({
        callbackURL: "/account",
        errorCallbackURL: "/account",
      });
      if (result.error)
        throw new Error(result.error.message ?? copy.errors.generic);
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-180">
      <PageHeading
        eyebrow={copy.account.eyebrow}
        title={copy.account.title}
        description={copy.account.description}
      />
      <div className="grid min-w-0 gap-6 [&_>_.notice]:m-0">
        {isPending ? (
          <p role="status">{copy.account.loading}</p>
        ) : !session ? (
          <Card render={<div />} className="grid justify-items-start gap-5">
            <h2>{copy.account.signInRequired}</h2>
            <Link
              to="/signin"
              className={buttonVariants({ variant: "default" })}
            >
              {copy.nav.signIn} ↗
            </Link>
          </Card>
        ) : (
          <Card render={<div />} className="account-details min-w-0">
            <h2>{session.user.name}</h2>
            <dl className="my-6 [&_>_div]:grid [&_>_div]:grid-cols-[150px_minmax(0,_1fr)] [&_>_div]:gap-4.5 [&_>_div]:border-t [&_>_div]:border-border [&_>_div]:py-4.5 [&_>_div]:text-[13px] max-[580px]:[&_>_div]:grid-cols-1 max-[580px]:[&_>_div]:gap-2">
              <div>
                <dt>{copy.account.email}</dt>
                <dd>
                  {session.user.email.endsWith("@steam.invalid")
                    ? unavailable
                    : session.user.email}
                </dd>
              </div>
              <div>
                <dt>{copy.account.steam}</dt>
                <dd>{session.user.steamId ?? copy.account.notLinked}</dd>
              </div>
            </dl>
            {!session.user.steamId ? (
              config?.steamEnabled ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void connectSteam()}
                >
                  {copy.auth.steamLink} ↗
                </Button>
              ) : (
                <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
                  {copy.auth.steamUnavailable}
                </p>
              )
            ) : (
              <Link
                to={`/?player=${session.user.steamId}`}
                className={buttonVariants({ variant: "default" })}
              >
                {copy.home.search} ↗
              </Link>
            )}
          </Card>
        )}
        {session ? (
          profile.isLoading ? (
            <p
              role="status"
              className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere"
            >
              {copy.profile.loading}
            </p>
          ) : profile.error ? (
            <RequestError
              error={profile.error}
              retry={() => void profile.refetch()}
            />
          ) : profile.data ? (
            <PlayerPreferences
              key={session.user.id}
              userId={session.user.id}
              profile={profile.data}
            />
          ) : null
        ) : null}
        {error ? (
          <RequestError error={error} />
        ) : params.has("error") ? (
          <Alert variant="destructive">{copy.account.steamError}</Alert>
        ) : null}
        <Card
          className="account-utilities min-w-0 grid gap-3 [&_h2]:text-[22px] [&_h2]:tracking-[-0.03em]"
          render={<section aria-label={copy.context.settings} />}
        >
          <h2>{copy.context.settings}</h2>
          <LanguageControl />
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
            {copy.context.settingsHelp}
          </p>
          <nav
            className="context-links flex flex-wrap gap-[12px_24px] items-center mt-1 text-[14px]"
            aria-label={copy.context.settings}
          >
            <Link
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
              to="/tools/install"
            >
              {copy.context.install}
            </Link>
            {session ? (
              <>
                <Link
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  to="/tools/usage"
                >
                  {copy.context.usage}
                </Link>
                <Link
                  className={
                    "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                  }
                  to="/tools/local-game"
                >
                  {copy.context.localGame}
                </Link>
              </>
            ) : null}
          </nav>
        </Card>
      </div>
    </section>
  );
}
