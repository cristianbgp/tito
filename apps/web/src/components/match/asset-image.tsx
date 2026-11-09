import { useState } from "react";

export function AssetImage({
  src,
  fallback,
  className = "",
}: {
  src: string | null;
  fallback: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span
      className={`asset-image inline-grid place-items-center overflow-hidden shrink-0 bg-[var(--surface-raised)] text-muted-foreground [font:11px_var(--font-mono)] rounded-[5px] [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover ${className}`}
      aria-hidden="true"
    >
      {src && src !== failedSource ? (
        <img
          src={src}
          alt=""
          width="64"
          height="36"
          loading="lazy"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </span>
  );
}
