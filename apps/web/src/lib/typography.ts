import { formatGameTimesInText } from "../../../../shared/game-time";

// Display formatting only. Stored reviews, user notes and source data stay intact.
export function appText(value: string) {
  return value.replace(/\s*\u2014\s*/g, ", ");
}

/** Match prose may contain raw timestamps in older saved AI responses. */
export function matchText(value: string) {
  return appText(formatGameTimesInText(value));
}
