import type { ComponentProps } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
export const inputStyles =
  "w-full min-h-12 rounded-xl border border-border bg-[var(--input)] px-[15px] py-3 text-base text-foreground placeholder:text-[var(--faint)] placeholder:opacity-100 disabled:opacity-65";
export const checkboxStyles =
  "size-4 min-h-4 shrink-0 cursor-pointer rounded border border-border p-0 accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-65";
function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn("ui-input", inputStyles, className)}
      {...props}
    />
  );
}
export { Input };
