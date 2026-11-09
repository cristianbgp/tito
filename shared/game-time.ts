/** Locale-independent game clock. Source values and evidence remain in seconds. */
export function formatGameTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "?";
  const total = Math.floor(Math.abs(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const clock = `${hours ? `${hours}:${String(minutes).padStart(2, "0")}` : minutes}:${String(total % 60).padStart(2, "0")}`;
  return `${seconds < 0 && total > 0 ? "−" : ""}${clock}`;
}

/** Only explicit integer-second units in match prose, never bare stats or IDs. */
export function formatGameTimesInText(value: string) {
  return value.replace(
    /https?:\/\/[^\s]+|www\.[^\s]+|(?<![\p{L}\p{N}_.,/:+−-])([−-]?(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+))\s*(?:seconds?|secs?|segundos?|segs?|s)(?![\p{L}\p{N}_/])/giu,
    (match, amount: string | undefined) => {
      if (amount === undefined) return match;
      const seconds = Number(amount.replaceAll(",", "").replace("−", "-"));
      return Number.isSafeInteger(seconds) ? formatGameTime(seconds) : match;
    },
  );
}
