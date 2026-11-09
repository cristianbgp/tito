import { LanguageControl } from "./components/language";
import { useLocale } from "./i18n/react";
import { Alert } from "./components/ui/alert";
import { Button, buttonVariants } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { authClient } from "./lib/auth";
import { useGetAppConfig } from "./api/generated/tito";
import { copy } from "./i18n";
import { MatchPage } from "./pages/match";
import { SignInPage } from "./pages/sign-in";
import { InboxPage } from "./pages/inbox";
import { RequestError } from "./components/shared";
import { AppearanceControl } from "./components/appearance";
import { BrandLogo } from "./components/brand";
import { SidebarToggle, useSidebarPreference } from "./components/sidebar";
import {
  ArrowUpRightIcon,
  EnvelopeSimpleIcon,
  GridFourIcon,
  ChartLineIcon,
  WrenchIcon,
  MagnifyingGlassIcon,
  SignOutIcon,
  UserCircleIcon,
} from "./components/icons";

const AccountPage = lazy(() =>
  import("./pages/account").then((module) => ({ default: module.AccountPage })),
);
const MatchesPage = lazy(() =>
  import("./pages/matches").then((module) => ({ default: module.MatchesPage })),
);
const ProgressPage = lazy(() =>
  import("./pages/progress").then((module) => ({
    default: module.ProgressPage,
  })),
);
const ToolsPage = lazy(() =>
  import("./pages/tools").then((m) => ({ default: m.ToolsPage })),
);
const HeroPickerPage = lazy(() =>
  import("./pages/hero-picker").then((m) => ({ default: m.HeroPickerPage })),
);
const HeroLibraryPage = lazy(() =>
  import("./pages/hero-library").then((m) => ({ default: m.HeroLibraryPage })),
);
const PersonalHeroPage = lazy(() =>
  import("./pages/hero-library").then((m) => ({ default: m.PersonalHeroPage })),
);
const HeroPoolsPage = lazy(() =>
  import("./pages/hero-pools").then((m) => ({ default: m.HeroPoolsPage })),
);
const HeroEvidencePage = lazy(() =>
  import("./pages/hero-evidence").then((m) => ({
    default: m.HeroEvidencePage,
  })),
);
const PatchNotesPage = lazy(() =>
  import("./pages/patch-notes").then((m) => ({ default: m.PatchNotesPage })),
);
const CoachingPage = lazy(() =>
  import("./pages/coaching").then((m) => ({ default: m.CoachingPage })),
);
const UsagePage = lazy(() =>
  import("./pages/usage").then((m) => ({ default: m.UsagePage })),
);
const SessionReflectionPage = lazy(() =>
  import("./pages/session-reflection").then((m) => ({
    default: m.SessionReflectionPage,
  })),
);
const JournalPage = lazy(() =>
  import("./pages/journal").then((m) => ({ default: m.JournalPage })),
);
const DraftHistoryPage = lazy(() =>
  import("./pages/draft-history").then((m) => ({
    default: m.DraftHistoryPage,
  })),
);
const ComparePage = lazy(() =>
  import("./pages/compare").then((m) => ({ default: m.ComparePage })),
);
const LocalGamePage = lazy(() =>
  import("./pages/local-game").then((m) => ({ default: m.LocalGamePage })),
);
const InstallPage = lazy(() =>
  import("./pages/install").then((m) => ({ default: m.InstallPage })),
);

export function App() {
  useLocale();
  const { collapsed, toggle } = useSidebarPreference();
  const { data: session } = authClient.useSession();
  const { data: config } = useGetAppConfig();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<unknown>();
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    setError(undefined);
    try {
      const result = await authClient.signOut();
      if (result.error)
        throw new Error(result.error.message ?? copy.errors.generic);
      client.clear();
      navigate("/signin");
    } catch (error) {
      setError(error);
    } finally {
      setSigningOut(false);
    }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const player = String(
      new FormData(event.currentTarget).get("player") ?? "",
    ).trim();
    navigate(`/?player=${encodeURIComponent(player)}`);
  }
  return (
    <div
      className="app-shell grid grid-cols-[244px_minmax(0,_1fr)] gap-6 min-h-[100svh] py-2.5 pr-4.5 pl-2.5 max-[1250px]:grid-cols-[210px_minmax(0,_1fr)] max-[1250px]:gap-5 max-[800px]:block max-[800px]:py-2.5 max-[800px]:px-4.5 max-[580px]:pt-2.25 max-[580px]:px-3 max-[580px]:pb-[calc(20px_+_env(safe-area-inset-bottom))] min-[801px]:[&[data-sidebar=collapsed]]:grid-cols-[80px_minmax(0,_1fr)] min-[801px]:[&[data-sidebar=collapsed]_.sidebar]:px-2.5 min-[801px]:[&[data-sidebar=collapsed]_.sidebar]:rounded-[28px] min-[801px]:[&[data-sidebar=collapsed]_.brand]:[align-self:center] min-[801px]:[&[data-sidebar=collapsed]_.brand]:p-0 min-[801px]:[&[data-sidebar=collapsed]_.brand-logo]:gap-0 min-[801px]:[&[data-sidebar=collapsed]_.brand-logotype]:hidden min-[801px]:[&[data-sidebar=collapsed]_.sidebar-label]:hidden min-[801px]:[&[data-sidebar=collapsed]_.sidebar-detail]:hidden min-[801px]:[&[data-sidebar=collapsed]_.main-nav_a]:justify-center min-[801px]:[&[data-sidebar=collapsed]_.main-nav_a]:px-0 min-[801px]:[&[data-sidebar=collapsed]_.main-nav_a]:gap-0 min-[801px]:[&[data-sidebar=collapsed]_.utility-link]:justify-center min-[801px]:[&[data-sidebar=collapsed]_.utility-link]:px-0 min-[801px]:[&[data-sidebar=collapsed]_.utility-link]:gap-0 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-account]:flex-col min-[801px]:[&[data-sidebar=collapsed]_.sidebar-account]:gap-3 min-[801px]:[&[data-sidebar=collapsed]_.account-identity]:flex-[none] min-[801px]:[&[data-sidebar=collapsed]_.account-identity]:p-0 min-[801px]:[&[data-sidebar=collapsed]_.account-avatar]:w-9 min-[801px]:[&[data-sidebar=collapsed]_.account-avatar]:h-9 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest]:pt-3.5 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest]:px-0 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest]:pb-0 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest]:flex min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest]:justify-center min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest_.text-link]:inline-flex min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest_.text-link]:items-center min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest_.text-link]:justify-center min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest_.text-link]:w-11 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-guest_.text-link]:h-11 min-[801px]:[&[data-sidebar=collapsed]_.sidebar-signin-icon]:block"
      data-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <a
        className="skip-link fixed z-[20] left-5 -top-22.5 py-3.5 px-5 bg-[var(--surface-solid)] rounded-[12px] [&:focus]:top-3.75"
        href="#main-content"
      >
        {copy.shell.skip}
      </a>
      <aside
        className="sidebar sticky top-2.5 h-[calc(100svh_-_20px)] min-h-130 pt-8.5 px-3.5 pb-5.5 flex flex-col border border-border [border-top-color:var(--line-bright)] rounded-[34px] bg-[var(--glass)] [backdrop-filter:blur(28px)_saturate(135%)] [-webkit-backdrop-filter:blur(28px)_saturate(135%)] shadow-[var(--shadow)] max-[1250px]:px-2.5 max-[800px]:relative max-[800px]:top-0 max-[800px]:flex max-[800px]:flex-row max-[800px]:h-auto max-[800px]:min-h-0 max-[800px]:py-3 max-[800px]:px-3.5 max-[800px]:rounded-[24px] max-[800px]:gap-4 max-[800px]:items-center max-[580px]:p-2.5 max-[580px]:gap-2 [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--glass-solid)] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[-webkit-backdrop-filter:none]"
        id="app-sidebar"
      >
        <Link
          to="/"
          className="brand flex items-center w-[fit-content] flex-[none] py-0 px-3.5 max-[1250px]:px-3 max-[800px]:py-0 max-[800px]:px-1"
          aria-label={copy.brand}
        >
          <BrandLogo />
        </Link>
        <nav
          className="main-nav grid gap-2 mt-12.5 [&_a]:flex [&_a]:gap-3.5 [&_a]:items-center [&_a]:py-3.75 [&_a]:px-4 [&_a]:min-h-13 [&_a]:border [&_a]:border-transparent [&_a]:rounded-[17px] [&_a]:text-[15px] [&_a]:text-muted-foreground [&_a]:[transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [&_a.active]:text-foreground [&_a.active]:bg-[var(--selected)] [&_a.active]:[border-color:var(--line-bright)] [&_a.active]:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)] [@media(hover:_hover)]:[&_a:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&_a:hover]:text-foreground max-[1250px]:[&_a]:px-3 max-[1250px]:[&_a]:gap-2.5 max-[1250px]:[&_a]:text-[14px] max-[800px]:flex max-[800px]:gap-1.5 max-[800px]:my-0 max-[800px]:mr-0 max-[800px]:ml-auto max-[800px]:[&_a]:gap-2 max-[800px]:[&_a]:min-h-10.75 max-[800px]:[&_a]:py-2.5 max-[800px]:[&_a]:px-3 max-[800px]:[&_a]:rounded-[15px] max-[800px]:[&_a]:text-[13px] max-[800px]:[&_a_svg]:w-5 max-[800px]:[&_a_svg]:h-5 max-[580px]:[&_a]:p-2.5 max-[580px]:[&_a]:gap-1.5 max-[580px]:[&_a]:text-[12px] max-[580px]:[&_a_svg]:w-4.5 max-[580px]:[&_a_svg]:h-4.5 max-[380px]:[&_a]:px-2 max-[380px]:[&_a]:gap-1.25 max-[380px]:[&_a]:text-[11px] max-[380px]:[&_a_svg]:w-4 max-[380px]:[&_a_svg]:h-4 max-[580px]:[&_a:not(.active)_.sidebar-label]:hidden max-[380px]:[&_.sidebar-label]:hidden"
          aria-label={copy.shell.navigation}
        >
          <NavLink
            to="/"
            end
            aria-label={copy.nav.matches}
            title={copy.nav.matches}
          >
            <GridFourIcon size={23} aria-hidden="true" />
            <span className="sidebar-label">{copy.nav.matches}</span>
          </NavLink>
          <NavLink
            to="/progress"
            aria-label={copy.nav.progress}
            title={copy.nav.progress}
          >
            <ChartLineIcon size={23} aria-hidden="true" />
            <span className="sidebar-label">{copy.nav.progress}</span>
          </NavLink>
          <NavLink
            to="/account"
            aria-label={copy.nav.account}
            title={copy.nav.account}
          >
            <UserCircleIcon size={24} aria-hidden="true" />
            <span className="sidebar-label">{copy.nav.account}</span>
          </NavLink>
          <NavLink
            to="/tools"
            aria-label={copy.nav.tools}
            title={copy.nav.tools}
          >
            <WrenchIcon size={23} aria-hidden="true" />
            <span className="sidebar-label">{copy.nav.tools}</span>
          </NavLink>
        </nav>
        <div className={"sidebar-bottom mt-auto max-[800px]:hidden"}>
          {config?.localInboxEnabled ? (
            <Link
              to="/dev/inbox"
              className="utility-link flex items-center gap-2.25 py-4.5 px-2.5 text-muted-foreground text-[12px] [&_>_svg:last-child]:ml-auto [@media(hover:_hover)]:[&:hover]:text-foreground"
              aria-label={copy.nav.inbox}
              title={copy.nav.inbox}
            >
              <EnvelopeSimpleIcon size={19} aria-hidden="true" />
              <span className="sidebar-label">{copy.nav.inbox}</span>
              <ArrowUpRightIcon
                className="sidebar-detail"
                size={15}
                aria-hidden="true"
              />
            </Link>
          ) : null}
          {session ? (
            <div
              className={
                "sidebar-account [border-top:1px_solid_var(--line)] pt-5 relative flex items-center gap-1"
              }
            >
              <Link
                to="/account"
                className="account-identity flex items-center gap-2.5 py-0 min-w-0 flex-[1] px-0.5 [&_>_span:last-child]:min-w-0 [&_strong]:block [&_strong]:max-w-26.5 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[14px] [&_strong]:[font-weight:550] [&_small]:flex [&_small]:items-center [&_small]:gap-1.25 [&_small]:text-[10px] [&_small]:text-muted-foreground [&_small]:mt-1.5"
                aria-label={`${copy.shell.account}: ${session.user.name}`}
                title={session.user.name}
              >
                <span
                  className={
                    "account-avatar grid shrink-0 place-items-center w-11 h-11 overflow-hidden bg-[var(--surface-raised)] rounded-[50%] [border:1px_solid_var(--line-bright)] [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
                  }
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      width="44"
                      height="44"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCircleIcon size={36} aria-hidden="true" />
                  )}
                </span>
                <span className="sidebar-label">
                  <strong title={session.user.name}>{session.user.name}</strong>
                  <small>
                    {session.user.steamId ? (
                      <span
                        className={
                          "connection-dot w-1.75 h-1.75 rounded-[50%] bg-[var(--success)]"
                        }
                        aria-hidden="true"
                      />
                    ) : null}
                    {session.user.steamId
                      ? copy.shell.connected
                      : copy.shell.emailAccount}
                  </small>
                </span>
              </Link>
              <Button
                variant="unstyled"
                type="button"
                className={
                  "icon-button signout-button inline-grid place-items-center shrink-0 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground [position:static] right-0 -top-12.25 w-7.5"
                }
                title={copy.nav.signOut}
                aria-label={copy.nav.signOut}
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <SignOutIcon size={19} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="sidebar-guest [border-top:1px_solid_var(--line)] p-3 [&_p]:text-[12px] [&_p]:text-muted-foreground [&_p]:leading-[1.6]">
              <p className="sidebar-detail">{copy.shell.guest}</p>
              <Link
                to="/signin"
                className={
                  "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
                }
                aria-label={copy.nav.signIn}
                title={copy.nav.signIn}
              >
                <UserCircleIcon
                  className={"sidebar-signin-icon hidden"}
                  size={25}
                  aria-hidden="true"
                />
                <span className="sidebar-label">{copy.nav.signIn}</span>
                <ArrowUpRightIcon
                  className="sidebar-detail"
                  size={16}
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
        </div>
      </aside>
      <div className={"workspace min-w-0 pt-0 max-[800px]:pt-4.5"}>
        <header
          className={
            "topbar flex gap-4 items-center min-h-14 max-[1250px]:gap-3 max-[800px]:gap-2.5 max-[580px]:grid max-[580px]:grid-cols-[1fr_auto] max-[580px]:gap-3"
          }
        >
          <SidebarToggle collapsed={collapsed} onToggle={toggle} />
          <form
            className="toolbar-search flex gap-2.5 items-center flex-[1] min-w-0 h-14 py-1.25 px-3 bg-[var(--glass)] border border-border [border-top-color:var(--line-bright)] rounded-[30px] [backdrop-filter:blur(24px)_saturate(130%)] [-webkit-backdrop-filter:blur(24px)_saturate(130%)] shadow-[var(--shadow)] [&_input]:h-10.5 [&_input]:min-h-0 [&_input]:min-w-0 [&_input]:py-1.25 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:rounded-[0] [&_input]:shadow-[none] [&_input]:text-[15px] [&_input:focus]:[outline:0] [&:focus-within]:[outline:2px_solid_var(--accent)] [&:focus-within]:[outline-offset:3px] max-[800px]:min-h-12.5 max-[800px]:h-12.5 max-[580px]:col-[1_/_-1] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--glass-solid)] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[-webkit-backdrop-filter:none]"
            key={params.get("player") ?? ""}
            onSubmit={search}
          >
            <Button
              variant="unstyled"
              type="submit"
              className={
                "search-submit grid place-items-center w-8.75 h-10 shrink-0 bg-transparent text-foreground border-0 rounded-[50%]"
              }
              aria-label={copy.shell.search}
              title={copy.shell.search}
            >
              <MagnifyingGlassIcon size={23} aria-hidden="true" />
            </Button>
            <Label htmlFor="global-player-search" className="sr-only">
              {copy.home.id}
            </Label>
            <Input
              id="global-player-search"
              name="player"
              inputMode="numeric"
              autoComplete="off"
              placeholder={copy.home.id}
              defaultValue={params.get("player") ?? ""}
              pattern={String.raw`\s*[0-9]{1,17}\s*`}
              required
              aria-describedby="global-search-hint"
            />
            <span className="sr-only" id="global-search-hint">
              {copy.home.hint}
            </span>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <AppearanceControl />
            <LanguageControl compact />
          </div>
          <div
            className={
              "toolbar-account-actions hidden gap-2 items-center max-[800px]:flex max-[580px]:[justify-self:end]"
            }
          >
            <Link
              to={session ? "/account" : "/signin"}
              aria-label={session ? copy.shell.account : copy.nav.signIn}
              className={buttonVariants({
                variant: "unstyled",
                className:
                  "account-button flex items-center justify-center shrink-0 gap-3 min-h-14 py-3 px-5.5 rounded-[30px] border border-border [border-top-color:var(--line-bright)] bg-[var(--glass)] [backdrop-filter:blur(22px)] [-webkit-backdrop-filter:blur(22px)] shadow-[var(--shadow)] text-[14px] [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [&:active]:[transform:scale(0.98)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground max-[1250px]:px-4 max-[1250px]:gap-2.25 max-[1050px]:[&_span]:max-w-22.5 max-[800px]:min-h-12.5 max-[800px]:h-12.5 max-[800px]:px-3.5 max-[800px]:text-[12px] max-[580px]:[justify-self:end] max-[580px]:h-11 max-[580px]:min-h-11 max-[580px]:px-4.25 max-[580px]:[&_span]:max-w-none [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:bg-[var(--glass-solid)] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:_reduce),_(prefers-contrast:_more)]:[-webkit-backdrop-filter:none] [@media(prefers-reduced-motion:_reduce)]:[&:active]:[transform:none] max-[380px]:w-11 max-[380px]:p-2.5 max-[380px]:[&_span]:hidden",
              })}
            >
              <UserCircleIcon size={23} aria-hidden="true" />
              <span>{session ? copy.shell.account : copy.nav.signIn}</span>
            </Link>
            {session ? (
              <Button
                variant="unstyled"
                type="button"
                className={
                  "icon-button mobile-signout place-items-center shrink-0 w-9 h-9 border border-transparent rounded-[50%] bg-transparent text-muted-foreground [transition:background-color_140ms_var(--ease-ui),_border-color_140ms_var(--ease-ui),_color_140ms_var(--ease-ui),_transform_140ms_var(--ease-ui)] [@media(hover:_hover)]:[&:hover]:[background-color:var(--surface-raised)] [@media(hover:_hover)]:[&:hover]:text-foreground hidden max-[800px]:inline-grid"
                }
                title={copy.nav.signOut}
                aria-label={copy.nav.signOut}
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <SignOutIcon size={20} aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto min-w-0 max-w-[1540px] px-0 pt-8 pb-8 max-[800px]:pt-6"
        >
          {error ? <RequestError error={error} /> : null}
          <Suspense
            fallback={
              <div
                className="loading-state py-15 px-5 text-center text-muted-foreground text-[13px]"
                role="status"
              >
                {copy.shell.loading}
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<MatchesPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/hero-picker" element={<HeroPickerPage />} />
              <Route path="/tools/heroes" element={<HeroLibraryPage />} />
              <Route
                path="/tools/heroes/:heroId"
                element={<PersonalHeroPage />}
              />
              <Route path="/tools/pools" element={<HeroPoolsPage />} />
              <Route path="/tools/reference" element={<HeroEvidencePage />} />
              <Route path="/tools/patches" element={<PatchNotesPage />} />
              <Route path="/tools/coaching" element={<CoachingPage />} />
              <Route path="/tools/usage" element={<UsagePage />} />
              <Route
                path="/tools/session"
                element={<SessionReflectionPage />}
              />
              <Route path="/tools/journal" element={<JournalPage />} />
              <Route path="/tools/drafts" element={<DraftHistoryPage />} />
              <Route path="/tools/compare" element={<ComparePage />} />
              <Route path="/tools/local-game" element={<LocalGamePage />} />
              <Route path="/tools/install" element={<InstallPage />} />
              <Route path="/matches/:matchId" element={<MatchPage />} />
              <Route path="/dev/inbox" element={<InboxPage />} />
              <Route
                path="*"
                element={
                  <Alert role="note">
                    <Link to="/">
                      {copy.nav.home}
                      <ArrowUpRightIcon size={17} aria-hidden="true" />
                    </Link>
                  </Alert>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
