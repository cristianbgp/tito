import { useLocale } from "../i18n/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { SidebarSimpleIcon } from "./icons";
import { copy } from "../i18n";

const sidebarKey = "tito:sidebar";

function readCollapsed() {
  try {
    return window.localStorage.getItem(sidebarKey) === "collapsed";
  } catch {
    return false;
  }
}

export function useSidebarPreference() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = useCallback(() => setCollapsed((value) => !value), []);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        sidebarKey,
        collapsed ? "collapsed" : "expanded",
      );
    } catch {
      // The sidebar still works in this tab when storage is unavailable.
    }
  }, [collapsed]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "b" ||
        !window.matchMedia("(min-width: 801px)").matches
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]",
        )
      )
        return;
      event.preventDefault();
      toggle();
    }
    function synchronize(event: StorageEvent) {
      if (event.key === sidebarKey || event.key === null)
        setCollapsed(event.newValue === "collapsed");
    }
    window.addEventListener("keydown", keydown);
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("storage", synchronize);
    };
  }, [toggle]);
  return { collapsed, toggle };
}

export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  useLocale();
  const label = collapsed
    ? copy.shell.expandSidebar
    : copy.shell.collapseSidebar;
  return (
    <Button
      variant="unstyled"
      type="button"
      className={
        "icon-button sidebar-toggle place-items-center shrink-0 w-9 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground hidden min-[801px]:inline-grid min-[801px]:w-11 min-[801px]:h-11 min-[801px]:border-border min-[801px]:rounded-[14px] min-[801px]:bg-[var(--glass)]"
      }
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls="app-sidebar"
      aria-keyshortcuts="Meta+B Control+B"
      title={`${label} (${copy.shell.sidebarShortcut})`}
    >
      <SidebarSimpleIcon size={21} aria-hidden="true" />
    </Button>
  );
}
