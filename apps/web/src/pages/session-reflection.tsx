import { serviceText } from "../i18n/service-messages";
import { useLocale } from "../i18n/react";
import { Label } from "../components/ui/label";
import { SelectField } from "../components/ui/select-field";
import { copy } from "../i18n";
import { useId, useState } from "react";
import { Link } from "react-router";
import {
  getGetSessionReflectionQueryKey,
  useGetSessionReflection,
} from "../api/generated/tito";
import type { GetSessionReflectionParams } from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  ToolStats,
  useToolIdentity,
} from "../components/toolkit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { RequestError } from "../components/shared";
import { unavailable, duration, numberFormatter } from "../i18n";
import { sessionCopy as c, coachingCopy } from "../i18n/coaching";
function SessionContent() {
  useLocale();
  const identity = useToolIdentity(),
    dayId = useId();
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [params, setParams] = useState<GetSessionReflectionParams>({
    mode: "latest",
  });
  const query = useGetSessionReflection(params, {
      query: {
        queryKey: [...getGetSessionReflectionQueryKey(params), ...identity.key],
        enabled:
          identity.signedIn && Boolean(identity.steamId) && !identity.loading,
        staleTime: 60000,
        retry: false,
      },
    }),
    data = query.data;
  return (
    <>
      <ToolPanel title={c.title}>
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
          {c.scope}
        </p>
        <Button
          variant={params.mode === "latest" ? "default" : "secondary"}
          aria-pressed={params.mode === "latest"}
          onClick={() => setParams({ mode: "latest" })}
        >
          {c.latest}
        </Button>
        <form
          className="flex min-w-0 flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (/^\d{4}-\d{2}-\d{2}$/.test(day))
              setParams({ mode: "day", day });
          }}
        >
          <SelectField className="w-full max-w-xs flex-[1_1_180px]">
            <Label htmlFor={dayId}>{c.day}</Label>
            <Input
              id={dayId}
              type="date"
              required
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </SelectField>
          <Button
            className="min-h-12"
            type="submit"
            variant="secondary"
            disabled={!day}
          >
            {c.viewDay}
          </Button>
        </form>
      </ToolPanel>
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
        <ToolPanel
          title={
            data.mode === "day" ? `${c.summary} · ${data.day} UTC` : c.summary
          }
        >
          {!data.games ? (
            <>
              <p>{c.empty}</p>
              <Link
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                to={`/?player=${identity.steamId}`}
              >
                {c.import}
              </Link>
            </>
          ) : (
            <>
              <p>{serviceText(data.summary)}</p>
              <p>
                {c.outcomes(
                  data.wins,
                  data.losses,
                  data.games - data.knownResults,
                )}
              </p>
              <ToolStats className="sm:grid-cols-2 sm:gap-x-5">
                {[
                  [c.games, data.games],
                  [c.duration, duration(data.durationSeconds)],
                  [c.kills, data.kills],
                  [c.deaths, data.deaths],
                  [c.assists, data.assists],
                  [c.reviewed, data.reviewedGames],
                  [c.noted, data.notedGames],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {typeof value === "number"
                        ? numberFormatter.format(value)
                        : (value ?? unavailable)}
                    </dd>
                  </div>
                ))}
              </ToolStats>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                {c.caveat}
              </p>
              <ul
                className="flex flex-wrap gap-x-4 gap-y-2"
                aria-label={c.matches}
              >
                {data.matchIds.map((id) => (
                  <li key={id}>
                    <Link
                      className={
                        "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                      }
                      to={`/matches/${id}`}
                    >
                      {coachingCopy.match(id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {c.refresh}
          </Button>
        </ToolPanel>
      ) : null}
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
        {c.optional}
      </p>
      <Link
        className={
          "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
        }
        to="/tools/coaching"
      >
        {c.coaching}
      </Link>
    </>
  );
}
export function SessionReflectionPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/progress"
      backLabel={copy.nav.progress}
      title={c.title}
      description={c.description}
    >
      <PrivateTool steam>
        <SessionContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
