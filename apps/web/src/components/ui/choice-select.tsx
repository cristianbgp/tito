import { searchText } from "../../i18n/traits";
import { useLocale } from "../../i18n/react";
import { useId, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  selectTriggerStyles,
  selectValueStyles,
  selectPopupStyles,
} from "./select";
import { AssetImage } from "../match/asset-image";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "../icons";
import { copy } from "../../i18n";
import { cn } from "../../lib/utils";

export type ChoiceItem = {
  value: string;
  label: string;
  description?: string;
  image?: string | null;
  searchText?: string;
};
function ChoiceIdentity({ item }: { item: ChoiceItem }) {
  useLocale();
  return (
    <span
      className={"choice-identity flex min-w-0 items-center gap-2.5 text-left"}
    >
      {item.image ? (
        <AssetImage
          src={item.image}
          fallback={item.label.slice(0, 2)}
          className={
            "choice-portrait [&.asset-image]:flex-[0_0_40px] [&.asset-image]:w-10 [&.asset-image]:h-6.5 [&.asset-image]:overflow-hidden [&.asset-image]:rounded-[6px] [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
          }
        />
      ) : null}
      <span
        className={
          "choice-text grid min-w-0 gap-0.5 whitespace-normal wrap-break-word leading-[20px] [&_>_span]:font-medium [&_small]:text-muted-foreground [&_small]:text-[12px] [&_small]:leading-[18px] [&_small]:font-normal"
        }
      >
        <span>{item.label}</span>
        {item.description ? <small>{item.description}</small> : null}
      </span>
    </span>
  );
}
type Props = {
  id?: string;
  label: string;
  items: ChoiceItem[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
};
export function ChoiceSelect({ searchable, ...props }: Props) {
  useLocale();
  return searchable ? <SearchChoice {...props} /> : <ShortChoice {...props} />;
}
function ShortChoice({
  id,
  label,
  items,
  value,
  onChange,
  disabled,
  placeholder,
}: Props) {
  useLocale();
  const selected = items.find((item) => item.value === value);
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next != null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={label}>
        <SelectValue>
          {selected ? <ChoiceIdentity item={selected} /> : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <ChoiceIdentity item={item} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function SearchChoice({
  id,
  label,
  items,
  value,
  onChange,
  disabled,
  placeholder,
}: Props) {
  useLocale();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const selected = items.find((item) => item.value === value) ?? null;
  const needle = searchText(query);
  const matching = items.filter((item) =>
    searchText(
      `${item.label} ${item.description ?? ""} ${item.searchText ?? ""} ${item.value}`,
    ).includes(needle),
  );
  const visible = matching.slice(0, 60);
  return (
    <Combobox.Root<ChoiceItem>
      items={items}
      filteredItems={visible}
      value={selected}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
      onValueChange={(item) => {
        if (item) onChange(item.value);
      }}
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        aria-label={label}
        data-slot="select-trigger"
        data-entity="true"
        className={cn(selectTriggerStyles, "min-h-16")}
      >
        <span data-slot="select-value" className={selectValueStyles}>
          {selected ? <ChoiceIdentity item={selected} /> : placeholder}
        </span>
        <CaretDownIcon className="choice-caret" aria-hidden="true" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={6}
          align="start"
          className="isolate z-50"
        >
          <Combobox.Popup
            className={cn(
              selectPopupStyles,
              "flex max-h-[min(var(--available-height),420px)] flex-col overflow-hidden",
            )}
            data-slot="choice-search-content"
          >
            <div className="choice-search-input flex shrink-0 items-center gap-2.5 m-0.5 px-2.5 [border-bottom:1px_solid_var(--line)] text-muted-foreground [&:focus-within]:[outline:2px_solid_var(--accent)] [&:focus-within]:[outline-offset:-2px] [&:focus-within]:rounded-[8px] [&_input]:min-w-0 [&_input]:min-h-11 [&_input]:py-2.5 [&_input]:px-0 [&_input]:border-0 [&_input]:rounded-[0] [&_input]:bg-transparent [&_input]:text-foreground [&_input]:text-[16px] [&_input]:outline-none [&_input]:shadow-[none]">
              <MagnifyingGlassIcon aria-hidden="true" size={18} />
              <Combobox.Input
                id={inputId}
                aria-label={copy.common.searchOptions(label)}
                placeholder={copy.common.searchOptionsPlaceholder}
                autoComplete="off"
              />
            </div>
            <Combobox.Empty className="choice-empty m-0 py-2.5 px-3 text-muted-foreground text-[12px] leading-[1.5] [&:empty]:hidden">
              {copy.common.noOptions}
            </Combobox.Empty>
            <Combobox.List className="choice-results min-h-0 overflow-y-auto [overscroll-behavior:contain] py-0.75 px-0">
              {(item: ChoiceItem) => (
                <Combobox.Item
                  className="choice-result grid grid-cols-[minmax(0,_1fr)_16px] min-h-12 items-center gap-3 py-2.5 px-1.75 rounded-[10px] text-foreground text-[14px] cursor-default outline-none [&[data-highlighted]]:bg-[var(--selected-solid)]"
                  key={item.value}
                  value={item}
                >
                  <ChoiceIdentity item={item} />
                  <Combobox.ItemIndicator
                    className={"choice-check col-[2] text-foreground"}
                  >
                    <CheckIcon aria-hidden="true" size={16} />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
            {matching.length > 60 ? (
              <p className="choice-search-hint m-0 py-2.5 px-3 text-muted-foreground text-[12px] leading-[1.5] shrink-0 [border-top:1px_solid_var(--line)]">
                {copy.common.refineOptions(visible.length, matching.length)}
              </p>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
