import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
// shadcn Base UI button, customized to Tito's glass variants.
const solidButtonStyles =
  "inline-flex items-center justify-center gap-3.5 min-h-11.5 py-3 px-4.75 border border-transparent rounded-[14px] text-[13px] font-semibold [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [&:active]:[transform:scale(0.98)] [@media(prefers-reduced-motion:_reduce)]:[&:active]:[transform:none]";
const rawButtonVariants = cva(
  "ui-button [&.destructive]:bg-[var(--danger-tint)] [&.destructive]:text-[var(--danger)] [&.destructive]:[border-color:var(--danger)]",
  {
    variants: {
      variant: {
        default: [
          solidButtonStyles,
          "button primary [background:linear-gradient(180deg,_var(--accent-start),_var(--accent-end))] text-[var(--accent-ink)] border-white/30 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.35),_0_5px_15px_rgb(67_29_16_/_0.07)] [@media(hover:_hover)]:[&:hover]:[filter:brightness(1.035)]",
        ],
        secondary: [
          solidButtonStyles,
          "button secondary bg-[var(--surface-raised)] text-foreground border-border",
        ],
        outline: [
          solidButtonStyles,
          "button secondary bg-[var(--surface-raised)] text-foreground border-border",
        ],
        ghost:
          "text-button inline-flex items-center gap-1.75 text-primary text-[12px] py-1.25 px-0 border-0 bg-transparent [@media(hover:_hover)]:[&:hover]:text-foreground",
        link: "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground",
        destructive: [solidButtonStyles, "button destructive"],
        unstyled: "",
      },
      size: {
        default: "",
        sm: "button-sm min-h-9 py-2 px-3",
        lg: "button-lg min-h-12.5 py-3.5 px-5.5",
        icon: "icon-button inline-grid place-items-center shrink-0 w-9 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function buttonVariants(
  options: NonNullable<Parameters<typeof rawButtonVariants>[0]> = {},
) {
  const marker =
    options.variant === "ghost"
      ? "text-button "
      : options.variant === "link"
        ? "text-link "
        : "";
  return marker + cn(rawButtonVariants(options));
}
function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof rawButtonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
export { Button, buttonVariants };
