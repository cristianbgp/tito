import { serviceText } from "../i18n/service-messages";
import { useLocale } from "../i18n/react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { useEffect, type ReactNode } from "react";
import { copy, uiCopy, getLocale } from "../i18n";
import { ArrowClockwiseIcon, MagnifyingGlassIcon } from "./icons";

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  const locale = useLocale();
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Tito`;
    const metadata = {
      description: description || uiCopy.siteDescription,
      "og:title": document.title,
      "og:description": description || uiCopy.siteDescription,
      "og:locale": getLocale() === "es" ? "es_ES" : "en_US",
      "twitter:title": document.title,
      "twitter:description": description || uiCopy.siteDescription,
    };
    for (const [key, value] of Object.entries(metadata)) {
      const attribute = key.startsWith("og:") ? "property" : "name";
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.append(meta);
      }
      meta.content = value;
    }
    return () => {
      document.title = previous;
    };
  }, [title, description, locale]);
  return (
    <header className="page-heading mb-6 min-w-0">
      <p className="eyebrow text-muted-foreground text-[11px] tracking-[1.1px] mt-0 mx-0 mb-3">
        {eyebrow}
      </p>
      <h1>{title}</h1>
      {description ? (
        <p className="description text-[17px] text-muted-foreground leading-[1.55] max-w-162.5 mt-3 mx-0 mb-0 max-[800px]:text-[16px] max-[580px]:text-[15px]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  useLocale();
  return (
    <div className="empty-state text-center py-14.5 px-6 [&_h2]:text-[18px] [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:max-w-95 [&_p]:mt-2.5 [&_p]:mx-auto [&_p]:mb-0 [&_p]:leading-[1.8]">
      <span
        className="empty-mark grid place-items-center w-13 h-13 border border-border text-muted-foreground rounded-[16px] bg-[var(--surface-raised)] mt-0 mx-auto mb-5"
        aria-hidden="true"
      >
        <MagnifyingGlassIcon size={25} />
      </span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function RequestError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  useLocale();
  const message = error instanceof Error ? error.message : copy.errors.generic;
  return (
    <Alert variant="destructive">
      <p>{serviceText(message)}</p>
      {retry ? (
        <Button
          variant="unstyled"
          className="text-button inline-flex items-center gap-1.75 text-primary text-[12px] py-1.25 px-0 border-0 bg-transparent [@media(hover:_hover)]:[&:hover]:text-foreground"
          onClick={retry}
        >
          {copy.home.retry} <ArrowClockwiseIcon size={16} aria-hidden="true" />
        </Button>
      ) : null}
    </Alert>
  );
}
