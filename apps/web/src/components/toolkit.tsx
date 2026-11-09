import { useLocale } from "../i18n/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { Link } from "react-router";
import { authClient } from "../lib/auth";
import { copy } from "../i18n";
import { PageHeading } from "./shared";
import { Card } from "./ui/card";
import { buttonVariants } from "./ui/button";
export function useToolIdentity() {
  const { data: session, isPending } = authClient.useSession();
  return {
    userId: session?.user.id,
    steamId: session?.user.steamId,
    loading: isPending,
    signedIn: Boolean(session),
    key: [session?.user.id ?? "guest", session?.user.steamId ?? "unlinked"],
  };
}
export function ToolPage({
  title,
  description,
  children,
  backTo = "/tools",
  backLabel = copy.tools.title,
  eyebrow = copy.tools.eyebrow,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  eyebrow?: string;
}) {
  useLocale();
  return (
    <section
      className={
        "tool-page grid min-w-0 gap-6 [&_>_.page-heading]:mb-0 [&_>_button]:justify-self-start [&_>_a]:justify-self-start"
      }
    >
      <Link
        className={
          "back-link inline-flex w-fit items-center gap-2 text-[13px] leading-5 text-muted-foreground"
        }
        to={backTo}
      >
        ← {backLabel}
      </Link>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      {children}
    </section>
  );
}
export function ToolPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  useLocale();
  return (
    <Card
      className={cn(
        "tool-panel grid min-w-0 content-start gap-4 p-6 [&_h2]:text-[22px] [&_h2]:tracking-[-0.035em] [&_h2]:leading-[1.25] [&_h3]:text-[17px] [&_h3]:leading-[1.4] [&_p]:leading-[1.6] [&_p]:wrap-anywhere [&_>_p]:m-0 [&_>_h3]:m-0 [&_>_button]:justify-self-start [&_>_a]:justify-self-start [&_:is(dl,_ul,_ol)]:min-w-0 [&_textarea]:w-full [&_textarea]:p-3 [&_textarea]:leading-[1.6] [&_textarea]:border [&_textarea]:border-border [&_textarea]:rounded-[12px] [&_textarea]:bg-[var(--input)] [&_textarea]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] [&_table]:text-left [&_:is(th,_td)]:px-3 [&_:is(th,_td)]:py-2.5 [&_:is(th,_td)]:border-b [&_:is(th,_td)]:border-border [&_:is(th,_td)]:align-top [&_th]:text-muted-foreground [&_th]:font-medium [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:text-[12px] [&_:is(input,_select,_button)]:max-w-full max-[580px]:p-5",
        className,
      )}
      render={<section aria-label={title} />}
    >
      <h2>{title}</h2>
      {children}
    </Card>
  );
}
export function ToolStats({ className, ...props }: ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "m-0 grid min-w-0 gap-x-6 [&_>_div]:grid [&_>_div]:grid-cols-[minmax(0,_1fr)_auto] [&_>_div]:items-baseline [&_>_div]:gap-4 [&_>_div]:border-t-0 [&_>_div]:border-b [&_>_div]:border-border [&_>_div]:py-3 [&_>_div]:px-0 [&_dt]:min-w-0 [&_dt]:text-muted-foreground [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:tabular-nums [&_dd]:wrap-anywhere",
        className,
      )}
      {...props}
    />
  );
}
export function PrivateTool({
  children,
  steam = false,
}: {
  children: ReactNode;
  steam?: boolean;
}) {
  useLocale();
  const identity = useToolIdentity();
  if (identity.loading)
    return (
      <p
        role="status"
        className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
      >
        {copy.shell.loading}
      </p>
    );
  if (!identity.signedIn)
    return (
      <ToolPanel title={copy.nav.signIn}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
          {copy.toolkit.signInHelp}
        </p>
        <Link className={buttonVariants()} to="/signin">
          {copy.nav.signIn}
        </Link>
      </ToolPanel>
    );
  if (steam && !identity.steamId)
    return (
      <ToolPanel title={copy.draft.connectHistory}>
        <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
          {copy.toolkit.steamHelp}
        </p>
        <Link className={buttonVariants()} to="/account">
          {copy.review.connect}
        </Link>
      </ToolPanel>
    );
  return children;
}
