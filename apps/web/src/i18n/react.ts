import { useSyncExternalStore } from "react";
import { getLocale, subscribeLocale } from "./index";
/** Subscribe without remounting the page or resetting drafts and form input. */
export function useLocale() {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "en" as const);
}
