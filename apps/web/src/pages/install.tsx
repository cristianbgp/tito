import { serviceText } from "../i18n/service-messages";
import { useLocale } from "../i18n/react";
import { copy } from "../i18n";
import { useEffect, useState } from "react";
import { ToolPage, ToolPanel } from "../components/toolkit";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { companionCopy as c } from "../i18n/companion";
// Match the worker's public install list. An active worker does not rerun its
// install event when Cache Storage has been cleared, so Enable repairs it.
const offlineCache = "tito-public-v1";
const publicReferences = [
  "/offline.html",
  "/reference-catalog.json",
  "/offline-policy.js",
  "/manifest.webmanifest",
  "/brand/isotype-180.png",
  "/brand/isotype-512.png",
];
type InstallEvent = Event & { prompt: () => Promise<void> };
type InstallError =
  { key: "installUnsupported" | "offlineFailed" } | { cause: unknown };
export function InstallPage() {
  useLocale();
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState<"offlineReady" | "offlineRemoved" | null>(
      null,
    ),
    [error, setError] = useState<InstallError | null>(null);
  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  async function enable() {
    setBusy(true);
    setError(null);
    setStatus(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!("serviceWorker" in navigator)) {
        setError({ key: "installUnsupported" });
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", {
        type: "module",
      });
      const ready = await Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise<false>((resolve) => {
          timeout = setTimeout(() => resolve(false), 15000);
        }),
      ]);
      if (!ready || !registration.active) {
        setError({ key: "offlineFailed" });
        return;
      }
      const cache = await caches.open(offlineCache);
      await cache.addAll(publicReferences);
      setStatus("offlineReady");
    } catch (e) {
      setError({ cause: e });
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      for (const registration of await navigator.serviceWorker.getRegistrations())
        if (
          new URL(registration.scope).origin === location.origin &&
          [
            registration.active,
            registration.waiting,
            registration.installing,
          ].some(
            (worker) =>
              worker && new URL(worker.scriptURL).pathname === "/sw.js",
          )
        )
          await registration.unregister();
      if ("caches" in window)
        for (const key of await caches.keys())
          if (key.startsWith("tito-public-")) await caches.delete(key);
      setStatus("offlineRemoved");
    } catch (e) {
      setError({ cause: e });
    } finally {
      setBusy(false);
    }
  }
  return (
    <ToolPage
      backTo="/account"
      backLabel={copy.nav.account}
      title={c.installTitle}
      description={c.installDescription}
    >
      <div
        className={
          "tool-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-5 items-start min-w-0 max-[1000px]:grid-cols-[1fr]"
        }
      >
        <ToolPanel title={c.installApp}>
          <p>{c.installHelp}</p>
          {prompt ? (
            <Button
              onClick={() => void prompt.prompt().then(() => setPrompt(null))}
            >
              {c.installApp}
            </Button>
          ) : (
            <p className="muted text-muted-foreground text-[13px] leading-[1.8] m-0 wrap-anywhere">
              {c.installManual}
            </p>
          )}
        </ToolPanel>
        <ToolPanel title={c.offlineTitle}>
          <p>{c.offlineHelp}</p>
          <div className={"tool-actions flex flex-wrap gap-2.5 items-center"}>
            <Button onClick={() => void enable()} disabled={busy}>
              {c.enableOffline}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void disable()}
              disabled={busy}
            >
              {c.removeOffline}
            </Button>
            <a
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
              href="/offline.html"
            >
              {c.openOffline}
            </a>
          </div>
          {status ? <p role="status">{c[status]}</p> : null}
          {error ? (
            <Alert role="alert">
              {"key" in error
                ? c[error.key]
                : error.cause instanceof Error
                  ? serviceText(error.cause.message)
                  : c.offlineFailed}
            </Alert>
          ) : null}
        </ToolPanel>
      </div>
    </ToolPage>
  );
}
