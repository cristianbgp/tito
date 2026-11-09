/** Catalogs must have the same keys, interpolation parameters and return types. */
export type TranslationOf<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends object
      ? { [K in keyof T]: TranslationOf<T[K]> }
      : T;
export type Locale = "en" | "es";
