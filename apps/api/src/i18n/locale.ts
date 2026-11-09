export type Locale = "en" | "es";

/** Negotiate only supported ranges. Header values never become model instructions. */
export function requestLocale(header: string | null | undefined): Locale {
  if (!header || header.length > 4096) return "en";
  const matches = header.split(",").flatMap((range, index) => {
    const match =
      /^(en|es)(?:-[a-z0-9]{1,8})*(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i.exec(
        range.trim(),
      );
    if (!match) return [];
    const quality = match[2] === undefined ? 1 : Number(match[2]);
    return quality > 0
      ? [{ locale: match[1]!.toLowerCase() as Locale, quality, index }]
      : [];
  });
  matches.sort((a, b) => b.quality - a.quality || a.index - b.index);
  return matches[0]?.locale ?? "en";
}

export function generationLanguage(locale: Locale = "en") {
  const language =
    locale === "es"
      ? "Write all user-facing prose in Spanish. Keep JSON field names, enum values, evidence IDs, hero names and numbers unchanged. Use a decimal point and no digit grouping when quoting supplied numbers, even in Spanish prose."
      : "Write all user-facing prose in English. Keep JSON field names, enum values, evidence IDs, hero names and numbers unchanged. Use a decimal point and no digit grouping when quoting supplied numbers, even in Spanish prose.";
  return `${language} The exception is elapsed match times and durations: always write m:ss below one hour and h:mm:ss from one hour onward (1600 seconds = 26:40; 3750 seconds = 1:02:30). Never write raw seconds such as 1600s in user-facing prose. Use supplied displayTime or displayValue for time facts when present. Raw second fields and evidence IDs stay unchanged.`;
}
