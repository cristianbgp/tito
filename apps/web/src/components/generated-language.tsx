import { uiCopy, type Locale } from "../i18n";
import { useLocale } from "../i18n/react";
export function GeneratedLanguage({ locale = "en" }: { locale?: Locale }) {
  useLocale();
  return (
    <p className="my-2 text-xs leading-relaxed text-muted-foreground">
      {uiCopy.generatedLanguage(locale)}
    </p>
  );
}
