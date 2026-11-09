import { useId } from "react";
import { setLocale, localeNames, uiCopy, type Locale } from "../i18n";
import { useLocale } from "../i18n/react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];
export function LanguageControl({ compact = false }: { compact?: boolean }) {
  const locale = useLocale(),
    id = useId();
  return (
    <div className={compact ? "shrink-0" : "grid min-w-0 max-w-72 gap-2"}>
      {!compact ? (
        <Label htmlFor={id} className="m-0 text-xs text-muted-foreground">
          {uiCopy.language}
        </Label>
      ) : null}
      <Select
        items={languages}
        value={locale}
        onValueChange={(value) => {
          if (value === "en" || value === "es") setLocale(value as Locale);
        }}
      >
        <SelectTrigger
          id={id}
          aria-label="Language / Idioma"
          title="Language / Idioma"
          className={
            compact
              ? "h-12 min-h-12 w-auto min-w-16 gap-1.5 rounded-full bg-[var(--glass)] px-2.5 py-2 text-xs max-[580px]:w-11 max-[580px]:min-w-11 max-[580px]:px-2 max-[580px]:text-center max-[580px]:text-xs max-[580px]:[&>svg]:hidden"
              : ""
          }
        >
          <SelectValue>
            {compact ? locale.toUpperCase() : localeNames[locale]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {languages.map(({ value, label }) => (
            <SelectItem key={value} value={value} lang={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {uiCopy.languageHelp}
        </p>
      ) : null}
    </div>
  );
}
