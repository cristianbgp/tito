import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const toggleVariants = cva("ui-toggle", {
  variants: {
    variant: { default: "", outline: "ui-toggle-outline border border-border" },
    size: {
      default: "",
      sm: "button-sm min-h-9 py-2 px-3",
      lg: "button-lg min-h-12.5 py-3.5 px-5.5",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});
function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Toggle, toggleVariants };
