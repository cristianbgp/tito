import { emailCopy as en } from "./en";
import { emailCopy as es } from "./es";
import type { Locale } from "./locale";

export function emailCopyFor(locale: Locale = "en") {
  return locale === "es" ? es : en;
}
