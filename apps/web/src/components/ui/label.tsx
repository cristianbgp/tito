import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const labelStyles = "mb-2.5 block text-[13px] text-foreground";
function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("ui-label", labelStyles, className)}
      {...props}
    />
  );
}
export { Label };
