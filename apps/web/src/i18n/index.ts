import { uiEnglish, uiSpanish } from "./ui";
import { formatGameTime } from "../../../../shared/game-time";
import { en } from "./en";
import { es } from "./es";
import * as enCoaching from "./en/coaching";
import * as esCoaching from "./es/coaching";
import { companionCopy as enCompanion } from "./en/companion";
import { companionCopy as esCompanion } from "./es/companion";
import { intelligenceCopy as enIntelligence } from "./en/intelligence";
import { intelligenceCopy as esIntelligence } from "./es/intelligence";
import { libraryCopy as enLibrary } from "./en/library";
import { libraryCopy as esLibrary } from "./es/library";
import { localGameCopy as enLocalGame } from "./en/local-game";
import { localGameCopy as esLocalGame } from "./es/local-game";
import type { TranslationOf, Locale } from "./types";
export type { Locale } from "./types";

const english = {
  copy: en,
  uiCopy: uiEnglish,
  ...enCoaching,
  companionCopy: enCompanion,
  intelligenceCopy: enIntelligence,
  libraryCopy: enLibrary,
  localGameCopy: enLocalGame,
};
const spanish = {
  copy: es,
  uiCopy: uiSpanish,
  ...esCoaching,
  companionCopy: esCompanion,
  intelligenceCopy: esIntelligence,
  libraryCopy: esLibrary,
  localGameCopy: esLocalGame,
} satisfies TranslationOf<typeof english>;
const catalogs: Record<Locale, TranslationOf<typeof english>> = {
  en: english,
  es: spanish,
};
export const localeKey = "tito:locale";
export const localeNames = { en: "English", es: "Español" };
export let locale: Locale = "en";
export let {
  copy,
  uiCopy,
  coachingCopy,
  usageCopy,
  sessionCopy,
  companionCopy,
  intelligenceCopy,
  libraryCopy,
  localGameCopy,
} = catalogs.en;
export let unavailable = copy.common.unavailable;
export const intlLocale = (value: Locale = locale) =>
  value === "es" ? "es-419" : "en";
const formatters = (value: Locale) => ({
  dateFormatter: new Intl.DateTimeFormat(intlLocale(value), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }),
  numberFormatter: new Intl.NumberFormat(intlLocale(value)),
  percentageFormatter: new Intl.NumberFormat(intlLocale(value), {
    style: "percent",
    maximumFractionDigits: 0,
  }),
  matchDateFormatter: new Intl.DateTimeFormat(intlLocale(value), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
  compactNumberFormatter: new Intl.NumberFormat(intlLocale(value), {
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  averageFormatter: new Intl.NumberFormat(intlLocale(value), {
    maximumFractionDigits: 1,
  }),
  changeFormatter: new Intl.NumberFormat(intlLocale(value), {
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  }),
  progressDateFormatter: new Intl.DateTimeFormat(intlLocale(value), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }),
  currencyFormatter: new Intl.NumberFormat(intlLocale(value), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }),
});
export let {
  dateFormatter,
  numberFormatter,
  percentageFormatter,
  matchDateFormatter,
  compactNumberFormatter,
  averageFormatter,
  changeFormatter,
  progressDateFormatter,
  currencyFormatter,
} = formatters("en");
const listeners = new Set<() => void>();
export const getLocale = () => locale;
export function parseLocale(value: unknown): Locale {
  return value === "es" ? "es" : "en";
}
export function setLocale(value: Locale, persist = true) {
  const next = parseLocale(value);
  locale = next;
  ({
    copy,
    uiCopy,
    coachingCopy,
    usageCopy,
    sessionCopy,
    companionCopy,
    intelligenceCopy,
    libraryCopy,
    localGameCopy,
  } = catalogs[next]);
  unavailable = copy.common.unavailable;
  ({
    dateFormatter,
    numberFormatter,
    percentageFormatter,
    matchDateFormatter,
    compactNumberFormatter,
    averageFormatter,
    changeFormatter,
    progressDateFormatter,
    currencyFormatter,
  } = formatters(next));
  if (typeof document !== "undefined") document.documentElement.lang = next;
  if (persist) {
    try {
      window.localStorage.setItem(localeKey, next);
    } catch {
      /* Switching still works when storage is blocked. */
    }
  }
  listeners.forEach((listener) => listener());
}
export function initializeLocale() {
  let saved: unknown;
  try {
    saved = window.localStorage.getItem(localeKey);
  } catch {
    /* English is the default. */
  }
  setLocale(parseLocale(saved), false);
}
function synchronize(event: StorageEvent) {
  if (event.key === localeKey || event.key === null)
    setLocale(parseLocale(event.newValue), false);
}
export function subscribeLocale(listener: () => void) {
  if (!listeners.size && typeof window !== "undefined")
    window.addEventListener("storage", synchronize);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== "undefined")
      window.removeEventListener("storage", synchronize);
  };
}
export function duration(seconds: number) {
  return formatGameTime(seconds);
}
