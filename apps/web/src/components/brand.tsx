/** Static brand art. Keep future AI activity separate from the navigation logo. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-orb block w-9 h-9 flex-[none] object-contain max-[580px]:w-7 max-[580px]:h-7 ${className}`.trim()}
      src="/brand/isotype-180.png"
      alt=""
      width="36"
      height="36"
      aria-hidden="true"
    />
  );
}

/** Decorative within a link or control that supplies its own accessible name. */
export function BrandLogo() {
  return (
    <span
      className={
        "brand-logo inline-flex items-center gap-2 max-[580px]:gap-1.5"
      }
      aria-hidden="true"
    >
      <BrandMark />
      <img
        className="brand-logotype block w-13 h-6.5 object-contain [:root[data-theme=dark]_&]:[filter:brightness(0)_invert(1)] max-[580px]:w-10.5 max-[580px]:h-5.25"
        src="/brand/logotype-ink.png"
        alt=""
        width="52"
        height="26"
      />
    </span>
  );
}
