import { useLocale } from "../../i18n/react";
import { useState } from "react";
import { intelligenceCopy as t } from "../../i18n/intelligence";

/** Keep the item readable even if upstream metadata or its image is missing. */
export function ItemIdentity({
  name,
  image,
  itemId,
  itemKey,
}: {
  name?: string | null;
  image?: string | null;
  itemId?: number | null;
  itemKey?: string | null;
}) {
  useLocale();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceLabel = itemKey
    ?.replace(/^item_/, "")
    .replaceAll("_", " ")
    .trim();
  const label =
    name?.trim() ||
    (sourceLabel ? sourceLabel[0].toUpperCase() + sourceLabel.slice(1) : null);
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
      {image && image !== failedSource ? (
        <img
          src={image}
          alt=""
          width={32}
          height={24}
          loading="lazy"
          className="h-6 w-8 shrink-0 rounded object-contain"
          onError={() => setFailedSource(image)}
        />
      ) : null}
      <span>
        {label ?? t.unknownItem}
        {!label && itemId != null ? (
          <span className="ml-1.5 text-xs text-muted-foreground">
            {t.itemIdentifier(itemId)}
          </span>
        ) : null}
      </span>
    </span>
  );
}
