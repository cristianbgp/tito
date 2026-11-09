import { useLocale } from "../../i18n/react";
import { SelectField } from "../ui/select-field";
import { useState } from "react";
import { ChoiceSelect } from "../ui/choice-select";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSavedMatchNoteQueryKey,
  getGetSavedHistoryQueryKey,
  getGetSavedMatchNotesQueryKey,
  getGetPersonalHeroesQueryKey,
  getGetSessionReflectionQueryKey,
  useGetSavedMatchNote,
  useSaveMatchNote,
  useDeleteMatchNote,
} from "../../api/generated/tito";
import type {
  SavedMatchNote,
  SaveMatchNoteBody,
} from "../../api/generated/models";
import { libraryCopy as c } from "../../i18n/library";
import { PrivateTool, ToolPanel, useToolIdentity } from "../toolkit";
import { RequestError } from "../shared";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
export function MatchNotebook({ matchId }: { matchId: string }) {
  useLocale();
  const identity = useToolIdentity();
  return (
    <PrivateTool steam>
      <NotebookContent
        key={`${identity.key.join(":")}:${matchId}`}
        matchId={matchId}
      />
    </PrivateTool>
  );
}
function NotebookContent({ matchId }: { matchId: string }) {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const queryKey = [...getGetSavedMatchNoteQueryKey(matchId), ...identity.key];
  const query = useGetSavedMatchNote(matchId, {
    query: { queryKey, retry: false, staleTime: 30000 },
  });
  const save = useSaveMatchNote({ mutation: { retry: false } }),
    remove = useDeleteMatchNote({ mutation: { retry: false } });
  const [status, setStatus] = useState<"noteSaved" | "noteDeleted" | null>(
    null,
  );
  const invalidate = () => {
    void client.invalidateQueries({
      queryKey: getGetSavedHistoryQueryKey(),
      predicate: (query) =>
        query.queryKey.at(-2) === identity.key[0] &&
        query.queryKey.at(-1) === identity.key[1],
    });
    void client.invalidateQueries({
      queryKey: getGetSavedMatchNotesQueryKey(),
    });
    void client.invalidateQueries({ queryKey: getGetPersonalHeroesQueryKey() });
    void client.invalidateQueries({
      queryKey: getGetSessionReflectionQueryKey(),
    });
    void client.invalidateQueries({
      predicate: (query) =>
        String(query.queryKey[0]).startsWith("/api/library/heroes/"),
    });
  };
  return (
    <ToolPanel title={c.notebookTitle}>
      <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
        {c.notebookHelp}
      </p>
      {query.error ? (
        <RequestError error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? (
        <p role="status">{c.loading}</p>
      ) : query.data ? (
        <NoteEditor
          key={`${query.data.note?.updatedAt ?? "empty"}:${query.data.note?.text ?? ""}`}
          matchId={matchId}
          note={query.data.note}
          busy={save.isPending || remove.isPending}
          onSave={async (data) => {
            setStatus(null);
            remove.reset();
            const note = await save.mutateAsync({ matchId, data });
            client.setQueryData(queryKey, { note });
            invalidate();
            setStatus("noteSaved");
          }}
          onDelete={async () => {
            setStatus(null);
            save.reset();
            await remove.mutateAsync({ matchId });
            client.setQueryData(queryKey, { note: null });
            invalidate();
            setStatus("noteDeleted");
          }}
        />
      ) : null}
      {save.error ? <RequestError error={save.error} /> : null}
      {remove.error ? <RequestError error={remove.error} /> : null}
      {status ? (
        <p
          role="status"
          className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
        >
          {c[status]}
        </p>
      ) : null}
    </ToolPanel>
  );
}
export function NoteEditor({
  matchId,
  note,
  busy,
  onSave,
  onDelete,
}: {
  matchId: string;
  note: SavedMatchNote | null;
  busy: boolean;
  onSave: (data: SaveMatchNoteBody) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  useLocale();
  const [text, setText] = useState(note?.text ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [role, setRole] = useState(note?.actualRole ?? "");
  const [bookmark, setBookmark] = useState(
    note?.bookmarkSeconds === null || note?.bookmarkSeconds === undefined
      ? ""
      : String(note.bookmarkSeconds),
  );
  const [validation, setValidation] = useState<
    "tagValidation" | "bookmarkValidation" | null
  >(null);
  const prefix = `note-${matchId}`;
  const submit = async () => {
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (
      tagList.length > 8 ||
      new Set(tagList).size !== tagList.length ||
      tagList.some((tag) => tag.length > 40)
    ) {
      setValidation("tagValidation");
      return;
    }
    if (
      bookmark !== "" &&
      (!/^\d+$/.test(bookmark) || Number(bookmark) > 86400)
    ) {
      setValidation("bookmarkValidation");
      return;
    }
    setValidation(null);
    await onSave({
      text,
      tags: tagList,
      actualRole:
        role === "" ? null : (role as SaveMatchNoteBody["actualRole"]),
      bookmarkSeconds: bookmark === "" ? null : Number(bookmark),
    });
  };
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit().catch(() => {});
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-text`}>{c.noteLabel}</Label>
        <textarea
          id={`${prefix}-text`}
          className="ui-input min-h-32 resize-y"
          rows={5}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <span className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {text.length}/4000
        </span>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-tags`}>{c.tags}</Label>
        <Input
          id={`${prefix}-tags`}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField>
          <Label htmlFor={`${prefix}-role`}>{c.actualRole}</Label>
          <ChoiceSelect
            id={`${prefix}-role`}
            label={c.actualRole}
            value={role}
            onChange={(value) => setRole(value as typeof role)}
            disabled={busy}
            items={[
              { value: "", label: c.roleUnknown },
              ...Object.entries(c.roles).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </SelectField>
        <SelectField>
          <Label htmlFor={`${prefix}-bookmark`}>{c.bookmark}</Label>
          <Input
            id={`${prefix}-bookmark`}
            type="number"
            min={0}
            max={86400}
            step={1}
            value={bookmark}
            onChange={(e) => setBookmark(e.target.value)}
            disabled={busy}
          />
          <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {c.bookmarkHint}
          </p>
        </SelectField>
      </div>
      {validation ? (
        <p role="alert" className="text-destructive">
          {c[validation]}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? c.saving : c.saveNote}
        </Button>
        {note ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void onDelete().catch(() => {})}
          >
            {c.deleteNote}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
