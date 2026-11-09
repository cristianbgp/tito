import { useLocale } from "../i18n/react";
import { checkboxStyles } from "../components/ui/input";
import { SelectField } from "../components/ui/select-field";
import { copy } from "../i18n";
import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSavedMatchNotesQueryKey,
  getGetSavedHistoryQueryKey,
  getGetSavedMatchNoteQueryKey,
  getGetPersonalHeroesQueryKey,
  getGetSessionReflectionQueryKey,
  useGetSavedMatchNotes,
  useDeleteMatchNote,
} from "../api/generated/tito";
import type { GetSavedMatchNotes200 } from "../api/generated/models";
import {
  PrivateTool,
  ToolPage,
  ToolPanel,
  useToolIdentity,
} from "../components/toolkit";
import { RequestError } from "../components/shared";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { dateFormatter, duration } from "../i18n";
import { companionCopy as c } from "../i18n/companion";
import { libraryCopy as library } from "../i18n/library";
export function JournalPage() {
  useLocale();
  const identity = useToolIdentity();
  return (
    <ToolPage
      backTo="/"
      backLabel={copy.nav.matches}
      title={c.journalTitle}
      description={c.journalDescription}
    >
      <PrivateTool steam>
        <JournalContent key={identity.key.join(":")} />
      </PrivateTool>
    </ToolPage>
  );
}
function JournalContent() {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [...getGetSavedMatchNotesQueryKey(), ...identity.key];
  const query = useGetSavedMatchNotes({
    query: { queryKey, staleTime: 30000, retry: false },
  });
  const remove = useDeleteMatchNote({ mutation: { retry: false } });
  const [search, setSearch] = useState(""),
    [bookmarks, setBookmarks] = useState(false);
  const notes = query.data?.notes ?? [];
  const filtered = notes.filter(
    (note) =>
      (!bookmarks ||
        (note.bookmarkSeconds !== null &&
          note.bookmarkSeconds !== undefined)) &&
      `${note.matchId} ${note.text} ${note.tags.join(" ")}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const deleteNote = async (matchId: string) => {
    await remove.mutateAsync({ matchId });
    client.setQueryData<GetSavedMatchNotes200>(queryKey, (previous) => ({
      notes: (previous?.notes ?? []).filter((note) => note.matchId !== matchId),
    }));
    client.setQueryData(
      [...getGetSavedMatchNoteQueryKey(matchId), ...identity.key],
      { note: null },
    );
    void client.invalidateQueries({
      queryKey: getGetSavedHistoryQueryKey(),
      predicate: (query) =>
        query.queryKey.at(-2) === identity.key[0] &&
        query.queryKey.at(-1) === identity.key[1],
    });
    void client.invalidateQueries({ queryKey: getGetPersonalHeroesQueryKey() });
    void client.invalidateQueries({
      queryKey: getGetSessionReflectionQueryKey(),
    });
    void client.invalidateQueries({
      predicate: (q) =>
        String(q.queryKey[0]).startsWith("/api/library/heroes/"),
    });
  };
  return (
    <>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {remove.error ? <RequestError error={remove.error} /> : null}
      {query.isLoading ? (
        <p role="status">{library.loading}</p>
      ) : query.data ? (
        <>
          {notes.length ? (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <SelectField className="w-full max-w-sm flex-[1_1_220px]">
                  <Label htmlFor="journal-search">
                    {library.journalSearch}
                  </Label>
                  <Input
                    id="journal-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </SelectField>
                <Label className="mb-0 flex min-h-12 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bookmarks}
                    onChange={(e) => setBookmarks(e.target.checked)}
                    className={checkboxStyles}
                  />
                  {c.bookmarksOnly}
                </Label>
              </div>
              <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                {c.notesCount(notes.length)} · {library.annotationCap}
              </p>
              <div
                className={
                  "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
                }
              >
                {filtered.map((note) => (
                  <ToolPanel key={note.matchId} title={`#${note.matchId}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        className={
                          "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                        }
                        to={`/matches/${note.matchId}`}
                      >
                        {c.openMatch}
                      </Link>
                      <span className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                        {dateFormatter.format(new Date(note.updatedAt))}
                      </span>
                    </div>
                    <p className="m-0 whitespace-pre-wrap break-words">
                      {note.text || c.noText}
                    </p>
                    {note.tags.length ? (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      {note.actualRole ? (
                        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.role}: {library.roles[note.actualRole]}
                        </p>
                      ) : null}
                      {note.bookmarkSeconds !== null &&
                      note.bookmarkSeconds !== undefined ? (
                        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] m-0">
                          {c.moment}: {duration(note.bookmarkSeconds)}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        disabled={remove.isPending}
                        aria-label={library.deleteNoteLabel(note.matchId)}
                        onClick={() =>
                          void deleteNote(note.matchId).catch(() => {})
                        }
                      >
                        {remove.isPending &&
                        remove.variables?.matchId === note.matchId
                          ? c.deleting
                          : c.delete}
                      </Button>
                    </div>
                  </ToolPanel>
                ))}
              </div>
              {!filtered.length ? (
                <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
                  {library.noFilterNotes}
                </p>
              ) : null}
            </>
          ) : (
            <ToolPanel title={c.journalTitle}>
              <p>{c.journalEmpty}</p>
              <Link
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                to={`/?player=${identity.steamId}`}
              >
                {library.savedHistory}
              </Link>
            </ToolPanel>
          )}
        </>
      ) : null}
    </>
  );
}
