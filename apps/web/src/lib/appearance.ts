export type Appearance = "light" | "dark" | "system";
export const appearanceKey = "tito:appearance";

export function parseAppearance(value: unknown): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveAppearance(preference: Appearance, systemDark: boolean) {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
export function readAppearance(storage?: Pick<Storage, "getItem">): Appearance {
  try {
    return parseAppearance(storage?.getItem(appearanceKey));
  } catch {
    return "system";
  }
}
