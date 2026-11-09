import { useLocale } from "../i18n/react";
import {
  useGetHeroDraftCatalog,
  useSuggestDraftHeroes,
} from "../api/generated/tito";
import { authClient } from "../lib/auth";
import { copy } from "../i18n";
import { RequestError } from "../components/shared";
import { ToolPage } from "../components/toolkit";
import { HeroPickerTool } from "../components/draft/hero-picker";
export function HeroPickerPage() {
  useLocale();
  const catalog = useGetHeroDraftCatalog({ query: { staleTime: 60000 } });
  const { data: session } = authClient.useSession();
  const suggest = useSuggestDraftHeroes({ mutation: { retry: false } });
  return (
    <ToolPage
      eyebrow={copy.draft.eyebrow}
      title={copy.draft.title}
      description={copy.draft.description}
    >
      {catalog.error ? (
        <RequestError
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : null}
      {catalog.isLoading ? (
        <p
          role="status"
          className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
        >
          {copy.draft.loading}
        </p>
      ) : catalog.data ? (
        <HeroPickerTool
          key={`${session?.user.id ?? "guest"}:${session?.user.steamId ?? "unlinked"}`}
          storageScope={`${session?.user.id ?? "guest"}:${session?.user.steamId ?? "unlinked"}`}
          heroes={catalog.data.heroes}
          retrievedAt={catalog.data.retrievedAt}
          enabled={catalog.data.enabled}
          signedIn={Boolean(session)}
          steamConnected={Boolean(session?.user.steamId)}
          onSuggest={(data) => suggest.mutateAsync({ data })}
        />
      ) : null}
    </ToolPage>
  );
}
