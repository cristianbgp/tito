import type { ComponentProps } from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";
// Preserve semantic sections/asides with the shared shadcn card surface.
function Card({
  className,
  render,
  surface = "glass",
  ...props
}: useRender.ComponentProps<"div"> & { surface?: "glass" | "flat" }) {
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        className: cn(
          surface === "glass" &&
            "panel border border-border [border-top-color:var(--line-bright)] rounded-[22px] p-6 bg-[var(--surface)] shadow-[var(--shadow)] max-[580px]:p-5 max-[580px]:rounded-[20px] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--surface-solid)]",
          className,
        ),
      },
      props,
    ),
    state: { slot: "card" },
  });
}
function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "section-header flex items-center justify-between gap-3.5 mb-5 max-[580px]:[&_h2]:text-[19px]",
        className,
      )}
      {...props}
    />
  );
}
function CardTitle(props: ComponentProps<"h2">) {
  return <h2 data-slot="card-title" {...props} />;
}
function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere",
        className,
      )}
      {...props}
    />
  );
}
function CardContent(props: ComponentProps<"div">) {
  return <div data-slot="card-content" {...props} />;
}
function CardFooter(props: ComponentProps<"div">) {
  return <div data-slot="card-footer" {...props} />;
}
function CardAction(props: ComponentProps<"div">) {
  return <div data-slot="card-action" {...props} />;
}
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
};
