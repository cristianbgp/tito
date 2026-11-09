import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { useState, useRef } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSavedHeroPool,
  saveDraftSnapshot,
  getGetSavedDraftsQueryKey,
} from "../../api/generated/tito";
import type { LocalDraft } from "../../lib/hero-draft";
import { useToolIdentity } from "../toolkit";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { copy } from "../../i18n";
export function DraftLibraryActions({
  draft,
  onPool,
}: {
  draft: LocalDraft;
  onPool: (pool: number[]) => void;
}) {
  useLocale();
  const identity = useToolIdentity(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<
      "poolLoaded" | "noSavedPool" | "snapshotSaved" | null
    >(null),
    [error, setError] = useState<{ cause: unknown } | null>(null);
  const c = copy.draft;
  const current = useRef(draft);
  current.current = draft;
  async function run(action: "pool" | "save") {
    if (!draft.role || busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    const requestDraft = draft;
    try {
      if (action === "pool") {
        const pool = await getSavedHeroPool(draft.role);
        if (current.current !== requestDraft) return;
        const ids = pool.entries
          .filter((e) => e.preference === "favorite")
          .map((e) => e.heroId);
        if (ids.length) {
          onPool(ids);
          setMessage("poolLoaded");
        } else setMessage("noSavedPool");
      } else {
        await saveDraftSnapshot({ input: { ...draft, role: draft.role } });
        await client.invalidateQueries({
          queryKey: [...getGetSavedDraftsQueryKey(), ...identity.key],
        });
        setMessage("snapshotSaved");
      }
    } catch (e) {
      setError({ cause: e });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={
        "draft-preferences pt-4.5 mt-5 [border-top:1px_solid_var(--line)] [&_label]:flex [&_label]:items-center [&_label]:gap-2.5 [&_label]:text-[12px] [&_label]:min-h-7 [&_input]:w-4 [&_input]:h-4 [&_input]:[accent-color:var(--accent)] [&_p]:text-[10px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_p]:mt-2"
      }
    >
      <div className={"tool-actions flex flex-wrap gap-2.5 items-center"}>
        <Button
          variant="secondary"
          disabled={!draft.role || busy}
          onClick={() => void run("pool")}
        >
          {c.loadPool}
        </Button>
        <Button
          variant="secondary"
          disabled={!draft.role || busy}
          onClick={() => void run("save")}
        >
          {c.saveSnapshot}
        </Button>
        <Link
          className={
            "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
          }
          to="/tools/drafts"
        >
          {c.savedDrafts}
        </Link>
      </div>
      <p>{c.libraryHelp}</p>
      {message ? <p role="status">{c[message]}</p> : null}
      {error ? (
        <Alert role="alert">
          {error.cause instanceof Error
            ? serviceText(error.cause.message)
            : copy.errors.generic}
        </Alert>
      ) : null}
    </div>
  );
}
