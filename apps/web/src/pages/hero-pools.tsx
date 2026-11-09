import { useLocale } from "../i18n/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSavedHeroPoolsQueryKey,
  useGetSavedHeroPools,
  useGetHeroDraftCatalog,
  useSaveHeroPool,
} from "../api/generated/tito";
import type {
  SavedHeroPool,
  GetSavedHeroPools200,
} from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { RequestError } from "../components/shared";
import { Button } from "../components/ui/button";
import { HeroPoolEditor } from "../components/library/pool-editor";
import { libraryCopy as c } from "../i18n/library";
export function HeroPoolsPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage title={c.poolsTitle} description={c.poolsDescription}>
      <PrivateTool>
        <HeroPoolsContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
function HeroPoolsContent() {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [...getGetSavedHeroPoolsQueryKey(), ...identity.key];
  const query = useGetSavedHeroPools({
    query: { queryKey, staleTime: 30000, refetchOnWindowFocus: false },
  });
  const catalog = useGetHeroDraftCatalog({ query: { staleTime: Infinity } });
  const save = useSaveHeroPool({ mutation: { retry: false } });
  const [role, setRole] = useState<SavedHeroPool["role"]>("5");
  const [saved, setSaved] = useState(false);
  const pool = query.data?.pools.find((pool) => pool.role === role);
  return (
    <>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
        {c.poolsHelp}
      </p>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {catalog.error ? (
        <RequestError
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : null}
      {query.isLoading || catalog.isLoading ? (
        <p role="status">{c.loading}</p>
      ) : pool && catalog.data ? (
        <>
          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            aria-label={c.rolePools}
          >
            {Object.entries(c.roles).map(([value, label]) => (
              <Button
                key={value}
                variant={role === value ? "default" : "secondary"}
                className="min-h-12 whitespace-normal"
                aria-pressed={role === value}
                disabled={save.isPending}
                onClick={() => {
                  setRole(value as SavedHeroPool["role"]);
                  setSaved(false);
                  save.reset();
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <ToolPanel title={c.roles[role]}>
            <HeroPoolEditor
              key={`${role}:${pool.updatedAt ?? "empty"}`}
              role={role}
              initialEntries={pool.entries}
              heroes={catalog.data.heroes}
              busy={save.isPending}
              onSave={async (entries) => {
                const value = await save.mutateAsync({
                  role,
                  data: { entries },
                });
                client.setQueryData<GetSavedHeroPools200>(
                  queryKey,
                  (previous) => ({
                    pools: (previous?.pools ?? []).map((p) =>
                      p.role === role ? value : p,
                    ),
                  }),
                );
                setSaved(true);
              }}
            />
            {save.error ? <RequestError error={save.error} /> : null}
            {saved ? (
              <p
                role="status"
                className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0"
              >
                {c.poolSaved}
              </p>
            ) : null}
          </ToolPanel>
        </>
      ) : null}
    </>
  );
}
