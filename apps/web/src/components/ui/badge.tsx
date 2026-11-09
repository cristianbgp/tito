import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ui-badge", {
  variants: {
    variant: {
      default:
        "tag border border-border bg-[var(--surface-raised)] text-muted-foreground py-1.25 px-2.25 rounded-[8px] text-[11px]",
      secondary:
        "tag border border-border bg-[var(--surface-raised)] text-muted-foreground py-1.25 px-2.25 rounded-[8px] text-[11px]",
      outline:
        "tag border border-border bg-[var(--surface-raised)] text-muted-foreground py-1.25 px-2.25 rounded-[8px] text-[11px]",
      destructive:
        "tag loss border border-border bg-[var(--surface-raised)] text-muted-foreground py-1.25 px-2.25 rounded-[8px] text-[11px]",
      ghost: "",
      link: "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground",
      unstyled: "",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
