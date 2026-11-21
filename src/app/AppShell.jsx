import { Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";
import { m } from "motion/react";
import {
  Bell,
  ChevronRight,
  LayoutGrid,
  Lock,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useWorkspace } from "../hooks/workspace";
import { useAuth, displayNameOf } from "../hooks/auth";
import { useTheme } from "../hooks/theme";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { SpaceProvider, useSpace } from "./SpaceContext";
import { SpaceSwitcher } from "./SpaceSwitcher";
import { ErrorBoundary } from "./ErrorBoundary";
import { QuickAddProvider, useQuickAdd } from "../features/quickadd/QuickAdd";
import { useReminderCount } from "../features/reminders/useReminders";
import { Logo } from "../ui/Logo";
import { Avatar, Skeleton, SpaceIcon } from "../ui/Display";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { MODULES } from "../config/modules";

export function AppShell() {
  const ws = useWorkspace();
  const match = useMatch("/space/:spaceId/*");
  const routeSpace = match ? ws.byId(match.params.spaceId) : null;
  const current =
    routeSpace ||
    ws.byId(ws.lastSpaceId()) ||
    ws.personal ||
    ws.spaces[0] ||
    null;
  const { setAccent } = useTheme();

  useEffect(() => {
    if (current) setAccent(current.accent);
  }, [current, setAccent]);

  useEffect(() => {
    if (routeSpace) ws.rememberSpace(routeSpace.id);
  }, [routeSpace, ws]);

  if (ws.isLoading) return <ShellSkeleton />;
  if (ws.error && !ws.spaces.length) {
    return (
      <div className="full-center">
        <div className="crash" role="alert">
          <h2>We couldn't load your spaces</h2>
          <p>{ws.error.message}</p>
          <Button icon={RotateCcw} onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="shell shell-bare">
        <main id="main" className="main">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <SpaceProvider space={current}>
      <QuickAddProvider>
        <Shell />
      </QuickAddProvider>
    </SpaceProvider>
  );
}

function Shell() {
  const desktop = useIsDesktop();
  const location = useLocation();
  useEffect(() => {
    document.querySelector(".main")?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {desktop && <Sidebar />}
      <div className="shell-main">
        {desktop ? <Topbar /> : <MobileHeader />}
        <main id="main" className="main" tabIndex={-1}>
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {!desktop && <BottomNav />}
    </div>
  );
}

function usePageTitle() {
  const { pathname } = useLocation();
  const { title } = useSpace();
  if (pathname === "/settings") return "Account";
  if (pathname === "/spaces/new") return "New space";
  if (pathname.startsWith("/join")) return "Join a space";
  const seg = pathname.split("/")[3];
  if (!seg) return "Overview";
  if (seg === "settings") return "Space settings";
  return MODULES[seg] ? title(seg) : "Overview";
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  badge,
  layoutId = "nav-active",
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <m.span
              layoutId={layoutId}
              className="nav-pill"
              transition={{ type: "spring", stiffness: 520, damping: 40 }}
            />
          )}
          <Icon size={18} aria-hidden />
          <span className="nav-label">{label}</span>
          {badge ? <span className="nav-badge">{badge}</span> : null}
        </>
      )}
    </NavLink>
  );
}

function PrivacyBadge({ compact = false }) {
  const { space, members } = useSpace();
  if (space.isPersonal) {
    return (
      <span
        className="privacy-badge is-private"
        title="Only you can see this space"
      >
        <Lock size={12} /> {!compact && "Private"}
      </span>
    );
  }
  return (
    <span
      className="privacy-badge"
      title={`Shared with ${members.length} ${members.length === 1 ? "person" : "people"}`}
    >
      <UsersRound size={12} />{" "}
      {compact ? members.length || "" : `Shared · ${members.length || "…"}`}
    </span>
  );
}

function Sidebar() {
  const { space, modules, title, basePath, type } = useSpace();
  const reminders = useReminderCount();
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <Link to="/" aria-label="ManaLife home">
          <Logo size={32} />
        </Link>
      </div>
      <SpaceSwitcher current={space} />
      <nav className="nav">
        <NavItem to={basePath} end icon={LayoutGrid} label="Overview" />
        {modules.map((key) => (
          <NavItem
            key={key}
            to={`${basePath}/${key}`}
            icon={MODULES[key].icon}
            label={title(key)}
            badge={key === "reminders" ? reminders : 0}
          />
        ))}
      </nav>
      <div className="sidebar-foot">
        <NavItem
          to={`${basePath}/settings`}
          icon={Settings2}
          label={space.isPersonal ? "Customize My Space" : "Space settings"}
        />
        <div className="sidebar-privacy">
          {space.isPersonal ? <Lock size={14} /> : <UsersRound size={14} />}
          <span>{type.privacy}</span>
        </div>
        <AccountRow />
      </div>
    </aside>
  );
}

function AccountRow() {
  const { user, demo } = useAuth();
  const name = displayNameOf(user);
  return (
    <NavLink
      to="/settings"
      className={({ isActive }) => `account-row ${isActive ? "is-active" : ""}`}
    >
      <Avatar id={user.id} name={name} size={34} />
      <span className="account-text">
        <strong className="truncate">{name}</strong>
        <small className="truncate">{demo ? "Demo mode" : user.email}</small>
      </span>
      <ChevronRight size={15} />
    </NavLink>
  );
}

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = { system: "light", light: "dark", dark: "system" }[preference];
  const Icon = { system: Monitor, light: Sun, dark: Moon }[preference];
  return (
    <button
      type="button"
      className="icon-btn icon-btn-ghost"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${preference}. Switch to ${next}`}
      title={`Theme: ${preference}`}
    >
      <Icon size={18} />
    </button>
  );
}

function Topbar() {
  const { space, has, basePath } = useSpace();
  const { open } = useQuickAdd();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();
  const reminders = useReminderCount();
  return (
    <header className="topbar">
      <div className="crumbs">
        <SpaceIcon space={space} size={24} radius={7} />
        <span className="crumbs-space truncate">{space.name}</span>
        <ChevronRight size={14} className="crumbs-sep" />
        <strong className="truncate">{pageTitle}</strong>
        <PrivacyBadge />
      </div>
      <div className="topbar-actions">
        <button type="button" className="quick-btn" onClick={() => open()}>
          <Plus size={16} />
          <span>Quick add</span>
          <kbd className="kbd">
            {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}
          </kbd>
          <kbd className="kbd">K</kbd>
        </button>
        {has("reminders") && (
          <button
            type="button"
            className="icon-btn icon-btn-ghost"
            onClick={() => navigate(`${basePath}/reminders`)}
            aria-label={`Reminders${reminders ? `, ${reminders} need attention` : ""}`}
            title="Reminders"
          >
            <Bell size={18} />
            {reminders ? (
              <span className="icon-btn-badge">
                {reminders > 9 ? "9+" : reminders}
              </span>
            ) : null}
          </button>
        )}
        <ThemeToggle />
        <Link
          to="/settings"
          className="topbar-avatar"
          aria-label="Account settings"
        >
          <Avatar id={user.id} name={displayNameOf(user)} size={34} />
        </Link>
      </div>
    </header>
  );
}

function MobileHeader() {
  const { space } = useSpace();
  const { user } = useAuth();
  return (
    <header className="mheader">
      <SpaceSwitcher current={space} variant="pill" />
      <div className="spacer" />
      <PrivacyBadge compact />
      <Link
        to="/settings"
        aria-label="Account settings"
        className="mheader-avatar"
      >
        <Avatar id={user.id} name={displayNameOf(user)} size={34} />
      </Link>
    </header>
  );
}

function BottomNav() {
  const { modules, basePath, type, title } = useSpace();
  const { open } = useQuickAdd();
  const [more, setMore] = useState(false);
  const preferred = type.mobileNav.filter((k) => modules.includes(k));
  const picks = [
    ...preferred,
    ...modules.filter((k) => !preferred.includes(k) && k !== "reminders"),
  ].slice(0, 2);
  return (
    <>
      <nav className="bottomnav" aria-label="Primary">
        <NavItem
          to={basePath}
          end
          icon={LayoutGrid}
          label="Home"
          layoutId="bottom-active"
        />
        {picks[0] && (
          <NavItem
            to={`${basePath}/${picks[0]}`}
            icon={MODULES[picks[0]].icon}
            label={MODULES[picks[0]].short}
            layoutId="bottom-active"
          />
        )}
        <button
          type="button"
          className="bottomnav-add"
          onClick={() => open()}
          aria-label="Quick add"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
        {picks[1] && (
          <NavItem
            to={`${basePath}/${picks[1]}`}
            icon={MODULES[picks[1]].icon}
            label={MODULES[picks[1]].short}
            layoutId="bottom-active"
          />
        )}
        <button
          type="button"
          className="nav-item"
          onClick={() => setMore(true)}
          aria-haspopup="dialog"
        >
          <MoreHorizontal size={18} aria-hidden />
          <span className="nav-label">More</span>
        </button>
      </nav>
      <Sheet
        open={more}
        onClose={() => setMore(false)}
        title="Everything in this space"
        size="sm"
        initialFocus={false}
      >
        <div className="more-grid">
          {modules.map((key) => {
            const Icon = MODULES[key].icon;
            return (
              <Link
                key={key}
                to={`${basePath}/${key}`}
                className="more-tile"
                onClick={() => setMore(false)}
              >
                <span className="more-icon">
                  <Icon size={20} />
                </span>
                <span>{title(key)}</span>
              </Link>
            );
          })}
        </div>
        <div className="more-links">
          <Link
            to={`${basePath}/settings`}
            className="more-link"
            onClick={() => setMore(false)}
          >
            <Settings2 size={18} /> Space settings <ChevronRight size={16} />
          </Link>
          <Link
            to="/settings"
            className="more-link"
            onClick={() => setMore(false)}
          >
            <UserRound size={18} /> Account & appearance{" "}
            <ChevronRight size={16} />
          </Link>
        </div>
      </Sheet>
    </>
  );
}

function ShellSkeleton() {
  return (
    <div className="full-center" aria-busy="true" aria-label="Loading ManaLife">
      <m.div
        className="boot-mark"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Logo size={44} />
      </m.div>
      <div className="boot-bar">
        <span />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="stack" style={{ gap: 10, marginBottom: 24 }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={260} height={28} />
      </div>
      <div className="bento">
        {[8, 4, 4, 4, 4].map((span, i) => (
          <div
            key={i}
            className="card"
            style={{ gridColumn: `span ${span}`, height: 180 }}
          >
            <Skeleton width="40%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
