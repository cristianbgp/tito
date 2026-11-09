import { serviceText } from "../../i18n/service-messages";
import { useLocale } from "../../i18n/react";
import { dateFormatter } from "../../i18n";
import { intelligenceCopy as t } from "../../i18n/intelligence";
type Source = {
  sourceUrl: string;
  fetchedAt: string | null;
  expiresAt?: string | null;
  status: "available" | "empty" | "unavailable";
};
export function EvidenceSource({ section }: { section: Source }) {
  useLocale();
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <a
        className={
          "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
        }
        href={section.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t.source} ↗
      </a>
      <span>
        {section.fetchedAt
          ? `${t.retrieved}: ${dateFormatter.format(new Date(section.fetchedAt))}`
          : t.unknownFreshness}
      </span>
      {section.expiresAt ? (
        <span>
          {t.expires}: {dateFormatter.format(new Date(section.expiresAt))}
        </span>
      ) : null}
    </div>
  );
}
export function SectionStatus({ status }: { status: Source["status"] }) {
  useLocale();
  return status === "available" ? null : (
    <p
      className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere"
      role="status"
    >
      {status === "empty" ? t.empty : t.unavailable}
    </p>
  );
}
export function EvidenceLimits({ items }: { items: string[] }) {
  useLocale();
  return (
    <details className="mt-5 text-sm text-muted-foreground">
      <summary className="cursor-pointer">{t.limits}</summary>
      <ul className="mt-3 space-y-2 pl-5 list-disc">
        {items.map((item) => (
          <li key={item}>{serviceText(item)}</li>
        ))}
      </ul>
    </details>
  );
}
