import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbProps,
  ...props
}: SliderPrimitive.Root.Props & {
  thumbProps?: Omit<SliderPrimitive.Thumb.Props, "index">;
}) {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [value ?? defaultValue ?? min];
  return (
    <SliderPrimitive.Root
      className={cn(
        "ui-slider w-full [&[data-disabled]]:opacity-[0.6] [&_input[type=range]]:min-h-0",
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex min-h-9 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--line)]"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full bg-primary"
          />
        </SliderPrimitive.Track>
        {values.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            {...thumbProps}
            className={cn(
              "size-3.5 rounded-full border border-[var(--surface-solid)] bg-primary focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-4",
              thumbProps?.className,
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
export { Slider };
