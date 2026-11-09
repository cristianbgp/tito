import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { CaretDownIcon } from "../icons";
import { cn } from "../../lib/utils";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  children,
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "inline-flex items-center gap-[5px] border-0 bg-transparent px-0 py-1.5 text-left text-[11px] text-muted-foreground [&>svg]:-rotate-90 aria-expanded:[&>svg]:rotate-0",
        className,
      )}
      {...props}
    >
      <CaretDownIcon size={12} aria-hidden="true" />
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn("[&[hidden]]:hidden!", className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
