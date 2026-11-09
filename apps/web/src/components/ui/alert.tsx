import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const alertVariants = cva(
  "notice my-5 mx-0 py-4.5 px-5.25 text-[13px] leading-[1.8] border border-border rounded-[15px] bg-[var(--surface-raised)] text-muted-foreground [&.error]:[border-color:var(--danger)] [&.error]:bg-[var(--danger-tint)] [&.error]:text-foreground [&_p]:m-0 [&_.text-button]:mt-2 max-[580px]:p-4",
  {
    variants: { variant: { default: "", destructive: "error" } },
    defaultVariants: { variant: "default" },
  },
);
function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
}
function AlertTitle(props: ComponentProps<"h2">) {
  return <h2 data-slot="alert-title" {...props} />;
}
function AlertDescription(props: ComponentProps<"div">) {
  return <div data-slot="alert-description" {...props} />;
}
function AlertAction(props: ComponentProps<"div">) {
  return <div data-slot="alert-action" {...props} />;
}
export { Alert, AlertTitle, AlertDescription, AlertAction };
