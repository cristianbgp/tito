import { useLocale } from "../../i18n/react";
import { SelectField } from "../ui/select-field";
import { useState } from "react";
import type { DraftHero, SavedHeroPool } from "../../api/generated/models";
import { libraryCopy as c } from "../../i18n/library";
import { AssetImage } from "../match/asset-image";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ChoiceSelect } from "../ui/choice-select";
type Entry = SavedHeroPool["entries"][number];
export function HeroPoolEditor({
  role,
  initialEntries,
  heroes,
  busy,
  onSave,
}: {
  role: SavedHeroPool["role"];
  initialEntries: Entry[];
  heroes: DraftHero[];
  busy: boolean;
  onSave: (entries: Entry[]) => Promise<void>;
}) {
  useLocale();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const dirty = JSON.stringify(entries) !== JSON.stringify(initialEntries);
  const available = heroes.filter(
    (hero) =>
      !entries.some((entry) => entry.heroId === hero.id) &&
      hero.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const update = (heroId: number, preference: Entry["preference"]) =>
    setEntries((rows) =>
      rows.map((row) => (row.heroId === heroId ? { ...row, preference } : row)),
    );
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void onSave(entries).catch(() => {});
      }}
    >
      <div className="grid gap-3">
        {entries.length ? (
          entries.map((entry) => {
            const hero = heroes.find((hero) => hero.id === entry.heroId);
            return (
              <div
                key={entry.heroId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
              >
                <AssetImage
                  src={hero?.image ?? null}
                  fallback={hero?.name.slice(0, 2) ?? "?"}
                  className="h-10 w-16 rounded-md object-cover"
                />
                <span className="min-w-28 flex-1 font-medium">
                  {hero?.name ?? entry.heroId}
                </span>
                <SelectField
                  className={"pool-preference-field flex-[0_1_200px] w-50"}
                >
                  <Label
                    className="sr-only"
                    htmlFor={`preference-${role}-${entry.heroId}`}
                  >
                    {c.preference} · {hero?.name ?? entry.heroId}
                  </Label>
                  <ChoiceSelect
                    id={`preference-${role}-${entry.heroId}`}
                    label={`${c.preference} · ${hero?.name ?? entry.heroId}`}
                    value={entry.preference}
                    onChange={(value) =>
                      update(entry.heroId, value as Entry["preference"])
                    }
                    disabled={busy}
                    items={Object.entries(c.preferences).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </SelectField>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    setEntries((rows) =>
                      rows.filter((row) => row.heroId !== entry.heroId),
                    )
                  }
                  aria-label={`${c.remove} ${hero?.name ?? entry.heroId}`}
                >
                  {c.remove}
                </Button>
              </div>
            );
          })
        ) : (
          <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
            {c.poolEmpty}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`pool-search-${role}`}>{c.addHero}</Label>
        <Input
          id={`pool-search-${role}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
          disabled={busy || entries.length >= 30}
        />
        <p className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
          {entries.length}/30 {entries.length >= 30 ? `· ${c.poolFull}` : ""}
        </p>
        {entries.length < 30 ? (
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {available.slice(0, 12).map((hero) => (
              <Button
                type="button"
                key={hero.id}
                variant="secondary"
                className="justify-start"
                disabled={busy}
                onClick={() => {
                  setEntries((rows) => [
                    ...rows,
                    { heroId: hero.id, preference: "learning" },
                  ]);
                  setSearch("");
                }}
              >
                <AssetImage
                  src={hero.image}
                  fallback={hero.name.slice(0, 2)}
                  className="h-7 w-11 rounded-md object-cover"
                />
                {hero.name}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? c.saving : c.savePool}
        </Button>
        {dirty ? (
          <span className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0">
            {c.unsaved}
          </span>
        ) : null}
      </div>
    </form>
  );
}
