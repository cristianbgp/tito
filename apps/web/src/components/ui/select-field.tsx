import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function SelectField({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "select-field grid min-w-0 content-start gap-2 [&_>_label]:m-0 [&_>_label]:text-muted-foreground [&_>_label]:text-[12px] [&_>_label]:leading-[20px] [&_>_label]:font-medium [&_>_[data-slot=input]]:min-w-0 [&_>_[data-slot=input]]:min-h-12 [&_>_[data-slot=input]]:py-2.75 [&_>_[data-slot=input]]:px-3 [&_>_[data-slot=input]]:text-[14px] [&_>_[data-slot=input]]:leading-[1.4] max-[580px]:[&_>_[data-slot=input]]:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
