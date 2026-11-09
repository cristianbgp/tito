import { useLocale } from "../i18n/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  appearanceKey,
  parseAppearance,
  readAppearance,
  resolveAppearance,
  type Appearance,
} from "../lib/appearance";
import { copy } from "../i18n";
import { DesktopIcon, MoonIcon, SunIcon } from "./icons";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

const AppearanceContext = createContext<{
  preference: Appearance;
  choose: (value: Appearance) => void;
} | null>(null);
const storage = () => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

export function AppearanceProvider({ children }: { children: ReactNode }) {
  useLocale();
  const [preference, setPreference] = useState(() => readAppearance(storage()));
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const resolved = resolveAppearance(preference, systemDark);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document
      .querySelectorAll("meta[name=theme-color]")
      .forEach((meta) =>
        meta.setAttribute(
          "content",
          resolved === "dark" ? "#15171b" : "#f3f5fa",
        ),
      );
  }, [resolved]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = () => setSystemDark(media.matches);
    const synchronized = (event: StorageEvent) => {
      if (event.key === appearanceKey || event.key === null)
        setPreference(parseAppearance(event.newValue));
    };
    media.addEventListener("change", changed);
    window.addEventListener("storage", synchronized);
    return () => {
      media.removeEventListener("change", changed);
      window.removeEventListener("storage", synchronized);
    };
  }, []);
  function choose(value: Appearance) {
    setPreference(value);
    try {
      storage()?.setItem(appearanceKey, value);
    } catch {
      /* The current tab still supports switching when storage is blocked. */
    }
  }
  return (
    <AppearanceContext.Provider value={{ preference, choose }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function AppearanceControl() {
  useLocale();
  const context = useContext(AppearanceContext);
  if (!context) return null;
  const options = [
    { value: "light", label: copy.appearance.light, icon: SunIcon },
    { value: "dark", label: copy.appearance.dark, icon: MoonIcon },
    { value: "system", label: copy.appearance.system, icon: DesktopIcon },
  ] as const;
  return (
    <ToggleGroup
      className="appearance-control flex shrink-0 p-1 border border-border [border-top-color:var(--line-bright)] rounded-[26px] bg-[var(--glass)] [backdrop-filter:blur(22px)] [-webkit-backdrop-filter:blur(22px)] [&_button]:grid [&_button]:place-items-center [&_button]:w-8.5 [&_button]:h-9.5 [&_button]:rounded-[50%] [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-muted-foreground [&_button]:[transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [&_button[aria-pressed=true]]:bg-[var(--selected)] [&_button[aria-pressed=true]]:text-foreground [&_button[aria-pressed=true]]:shadow-[inset_0_1px_0_var(--line-bright)] [@media(hover:_hover)]:[&_button:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&_button:hover]:text-foreground max-[1050px]:[&_button]:w-7.5 max-[580px]:w-[max-content] max-[580px]:[&_button]:w-11 max-[580px]:[&_button]:h-10 [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--glass-solid)] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[-webkit-backdrop-filter:none]"
      aria-label={copy.appearance.label}
      value={[context.preference]}
      onValueChange={(values) => {
        const selected = options.find((option) => option.value === values[0]);
        if (selected) context.choose(selected.value);
      }}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          type="button"
          title={label}
          aria-label={label}
        >
          <Icon size={19} aria-hidden="true" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
