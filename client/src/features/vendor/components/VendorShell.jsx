import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import VendorNotificationBell from "./VendorNotificationBell.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import {
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  XIcon,
} from "./VendorIcons.jsx";
import {
  VENDOR_FOOTER_TAB,
  VENDOR_NAV,
  findNavEntry,
  getGroupIdForTab,
} from "../vendorNavigation.js";



/**
 * Per-section ambient wash.
 *
 * Each area of the dashboard tints the page with its own hue, cross-fading as
 * the user navigates so moving between sections feels like changing rooms.
 * RGB triplets (not class names) because the value is interpolated at runtime.
 */
const SECTION_RGB = {
  sky: "56 189 248",
  orange: "249 115 22",
  rose: "244 63 94",
  amber: "245 158 11",
  teal: "20 184 166",
  emerald: "16 185 129",
  violet: "139 92 246",
  cyan: "6 182 212",
  indigo: "99 102 241",
  fuchsia: "217 70 239",
  blue: "59 130 246",
  purple: "168 85 247",
};

/**
 * Per-section icon tints. Written out in full because Tailwind's scanner only
 * sees literal class names — interpolated ones are purged from the build.
 */
const TINTS = {
  sky:     { on: "text-sky-500",     box: "bg-sky-500/10" },
  orange:  { on: "text-orange-500",  box: "bg-orange-500/10" },
  rose:    { on: "text-rose-500",    box: "bg-rose-500/10" },
  amber:   { on: "text-amber-500",   box: "bg-amber-500/10" },
  teal:    { on: "text-teal-500",    box: "bg-teal-500/10" },
  emerald: { on: "text-emerald-500", box: "bg-emerald-500/10" },
  violet:  { on: "text-violet-500",  box: "bg-violet-500/10" },
  cyan:    { on: "text-cyan-500",    box: "bg-cyan-500/10" },
  indigo:  { on: "text-indigo-500",  box: "bg-indigo-500/10" },
  fuchsia: { on: "text-fuchsia-500", box: "bg-fuchsia-500/10" },
  blue:    { on: "text-blue-500",    box: "bg-blue-500/10" },
  purple:  { on: "text-purple-500",  box: "bg-purple-500/10" },
};

/** Numeric counts render as pills; string badges ("Expiring") render as tags. */
const Badge = ({ value, tone = "default" }) => {
  if (!value) return null;

  const isText = typeof value === "string";
  const tones = {
    default: "bg-accent-soft text-accent-text ring-1 ring-inset ring-accent/20",
    alert: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  };

  return (
    <span
      className={`ml-auto flex h-5 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
        tones[tone] || tones.default
      } ${isText ? "" : "min-w-[20px]"}`}
    >
      {isText ? value : value > 99 ? "99+" : value}
    </span>
  );
};

const badgeTone = (key, value) => {
  if (key === "subscription") return value === "Expired" ? "alert" : "warn";
  if (key === "lowStock") return "warn";
  if (key === "messages") return "alert";
  return "default";
};

/** A leaf navigation row. Used for both top-level links and submenu children. */
const NavLink = ({ item, active, depth = 0, badgeValue, badgeKey, onSelect }) => {
  const Icon = item.icon;
  const tint = TINTS[item.tint];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pr-2 text-left transition-colors duration-150 ${
        depth > 0 ? "pl-9" : "pl-2.5"
      } ${
        active
          ? "bg-accent-soft text-accent-text"
          : "text-body hover:bg-sunken hover:text-heading"
      }`}
    >
      {/* Left rail marker instead of a full orange block */}
      {active ? (
        <motion.span
          layoutId="vendor-nav-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
        />
      ) : null}

      {Icon ? (
        <span
          className={`flex flex-shrink-0 items-center justify-center rounded-md transition-all duration-200 group-hover:scale-110 ${
            depth > 0 ? "h-6 w-6" : "h-7 w-7"
          } ${tint ? tint.box : ""} ${
            tint ? tint.on : active ? "text-accent" : "text-muted group-hover:text-body"
          }`}
        >
          <Icon size={depth > 0 ? 14 : 17} />
        </span>
      ) : depth > 0 ? (
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            active ? "bg-accent" : "bg-faint group-hover:bg-muted"
          }`}
        />
      ) : null}

      <span
        className={`min-w-0 truncate text-[13px] tracking-tight ${
          active ? "font-semibold" : "font-medium"
        }`}
      >
        {item.label}
      </span>

      <Badge value={badgeValue} tone={badgeTone(badgeKey, badgeValue)} />
    </button>
  );
};

const NavGroup = ({ group, expanded, onToggle, activeTab, activeChildId, badges, onSelect }) => {
  const Icon = group.icon;
  const tint = TINTS[group.tint];

  // Roll child badges up to the collapsed header so nothing is hidden.
  const childBadgeTotal = (group.children || []).reduce((sum, child) => {
    const value = badges[child.badge];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
  const hasChildAlert = (group.children || []).some(
    (child) => typeof badges[child.badge] === "string" && badges[child.badge]
  );
  const containsActive = (group.children || []).some((child) => child.tab === activeTab);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`group flex w-full items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-2 text-left transition-colors duration-150 ${
          containsActive && !expanded
            ? "text-accent-text"
            : "text-body hover:bg-sunken hover:text-heading"
        }`}
      >
        {Icon ? (
          <span
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200 group-hover:scale-110 ${
              tint ? tint.box : ""
            } ${tint ? tint.on : containsActive ? "text-accent" : "text-muted group-hover:text-body"}`}
          >
            <Icon size={17} />
          </span>
        ) : null}

        <span
          className={`min-w-0 flex-1 truncate text-[13px] tracking-tight ${
            containsActive ? "font-semibold" : "font-medium"
          }`}
        >
          {group.label}
        </span>

        {!expanded && childBadgeTotal > 0 ? (
          <Badge value={childBadgeTotal} />
        ) : !expanded && hasChildAlert ? (
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
        ) : null}

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0 text-faint group-hover:text-muted"
        >
          <ChevronDownIcon size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-0.5">
              {group.children.map((child) => (
                <NavLink
                  key={child.id}
                  item={child}
                  depth={1}
                  active={activeChildId === child.id}
                  badgeValue={badges[child.badge]}
                  badgeKey={child.badge}
                  onSelect={() => onSelect(child)}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const RestaurantIdentity = ({ restaurant, onToggleStatus, updatingStatus }) => {
  const isOpen = Boolean(restaurant?.isActive);
  const name = restaurant?.name || "Your Restaurant";

  return (
    <div className="px-3 pb-4 pt-5">
      <div className="flex items-center gap-3">
        {restaurant?.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={name}
            className="h-10 w-10 flex-shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white">
            {name.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-heading">{name}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
            {restaurant?.category || "Restaurant"}
          </p>
        </div>
      </div>

      {/* Availability toggle — only offered when the profile supports it */}
      <button
        type="button"
        onClick={onToggleStatus}
        disabled={!onToggleStatus || updatingStatus || !restaurant}
        className={`mt-3 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
          isOpen
            ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
            : "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
        } disabled:cursor-not-allowed disabled:opacity-60`}
        title={onToggleStatus ? "Toggle whether you are accepting orders" : undefined}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          {isOpen ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          ) : null}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isOpen ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wider ${
            isOpen ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {updatingStatus ? "Updating..." : isOpen ? "Open for orders" : "Closed"}
        </span>
      </button>
    </div>
  );
};

const SidebarContent = ({
  activeTab,
  activeChildId,
  expandedGroups,
  toggleGroup,
  onSelect,
  onLogout,
  restaurant,
  badges,
  onToggleStatus,
  updatingStatus,
  onClose,
}) => (
  <div className="relative flex h-full flex-col">
    <span className="nb-glow -left-16 -top-16 h-48 w-48 opacity-60" />
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <RestaurantIdentity
          restaurant={restaurant}
          onToggleStatus={onToggleStatus}
          updatingStatus={updatingStatus}
        />
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="mr-2 mt-5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-body xl:hidden"
        >
          <XIcon size={16} />
        </button>
      ) : null}
    </div>

    <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
      {VENDOR_NAV.map((group) =>
        group.children ? (
          <NavGroup
            key={group.id}
            group={group}
            expanded={expandedGroups.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            activeTab={activeTab}
            activeChildId={activeChildId}
            badges={badges}
            onSelect={onSelect}
          />
        ) : (
          <NavLink
            key={group.id}
            item={group}
            active={activeTab === group.tab}
            badgeValue={badges[group.badge]}
            badgeKey={group.badge}
            onSelect={() => onSelect(group)}
          />
        )
      )}
    </nav>

    <div className="space-y-0.5 border-t border-line p-3">
      <button
        type="button"
        onClick={() => onSelect({ tab: VENDOR_FOOTER_TAB })}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
          activeTab === VENDOR_FOOTER_TAB
            ? "bg-accent-soft font-semibold text-accent-text"
            : "font-medium text-body hover:bg-sunken hover:text-heading"
        }`}
      >
        <SettingsIcon
          size={17}
          className={`flex-shrink-0 ${
            activeTab === VENDOR_FOOTER_TAB ? "text-accent" : "text-muted"
          }`}
        />
        <span className="truncate text-[13px] tracking-tight">Settings</span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-body transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
      >
        <LogOutIcon size={17} className="flex-shrink-0 text-muted group-hover:text-rose-500" />
        <span className="truncate text-[13px] tracking-tight">Log out</span>
      </button>
    </div>
  </div>
);

const VendorShell = ({
  activeTab,
  onTabChange,
  onLogout,
  restaurant,
  badges = {},
  orderFilter,
  onOrderFilterChange,
  onToggleStatus,
  updatingStatus,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Expanded groups persist for the session, so navigating within a section
  // never collapses it underneath the user.
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = getGroupIdForTab(activeTab);
    return initial ? [initial] : ["operations"];
  });

  const { child: activeChild, group: activeGroup } = useMemo(
    () => findNavEntry(activeTab, orderFilter),
    [activeTab, orderFilter]
  );

  const sectionRgb =
    SECTION_RGB[activeChild?.tint] || SECTION_RGB[activeGroup?.tint] || SECTION_RGB.orange;

  // Keep the owning group open when the tab changes from outside the sidebar
  // (quick actions, notification deep links).
  useEffect(() => {
    const groupId = getGroupIdForTab(activeTab);
    if (!groupId) return;
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
  }, [activeTab]);

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const handleSelect = useCallback(
    (item) => {
      if (item.orderFilter && onOrderFilterChange) {
        onOrderFilterChange(item.orderFilter);
      }
      onTabChange(item.tab);
      setMobileOpen(false);
    },
    [onOrderFilterChange, onTabChange]
  );

  const totalBadge =
    (badges.liveOrders || 0) + (badges.messages || 0) + (badges.lowStock || 0);

  const pageTitle =
    activeChild?.label ||
    (activeGroup && !activeGroup.children ? activeGroup.label : "") ||
    (activeTab === "restaurant" ? "Settings" : "Dashboard");

  const sidebar = (onClose) => (
    <SidebarContent
      activeTab={activeTab}
      activeChildId={activeChild?.id}
      expandedGroups={expandedGroups}
      toggleGroup={toggleGroup}
      onSelect={handleSelect}
      onLogout={onLogout}
      restaurant={restaurant}
      badges={badges}
      onToggleStatus={onToggleStatus}
      updatingStatus={updatingStatus}
      onClose={onClose}
    />
  );

  return (
    <div className="relative isolate min-h-screen font-sans text-body">
      {/* Section colour wash. Gradients can't be CSS-interpolated, so each
          section's layer fades in over the previous one. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={sectionRgb}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(75vmax 55vmax at 12% -10%, rgb(${sectionRgb} / var(--nb-section-alpha)), transparent 62%), radial-gradient(60vmax 48vmax at 92% 108%, rgb(${sectionRgb} / calc(var(--nb-section-alpha) * 0.7)), transparent 60%)`,
            }}
          />
        </AnimatePresence>
      </div>
      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-card/95 px-4 py-2.5 backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-card text-body transition-colors hover:bg-sunken"
        >
          <MenuIcon size={17} />
          {totalBadge > 0 ? (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-heading">{pageTitle}</p>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <p className="truncate text-[11px] font-medium text-muted">
              {restaurant?.name || "Vendor"}
            </p>
          </div>
        </div>

        <ThemeToggle />
        <VendorNotificationBell onNavigate={onTabChange} />
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-stone-950/50 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 38 }}
              className="fixed left-0 top-0 z-50 h-full w-[270px] max-w-[85vw] overflow-hidden border-r border-line bg-card shadow-2xl xl:hidden"
            >
              {sidebar(() => setMobileOpen(false))}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex max-w-[1600px]">
        {/* ── Desktop sidebar ────────────────────────────────────────────── */}
        <aside className="sticky top-0 z-20 hidden h-screen w-[248px] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-card/70 shadow-[1px_0_3px_rgba(0,0,0,0.02)] backdrop-blur-2xl xl:flex">
          {sidebar(null)}
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-8">
          {/* Minimal desktop header: title, status, notifications only */}
          <div className="mx-auto mb-6 hidden max-w-6xl items-center justify-between gap-4 xl:flex">
            <div className="min-w-0">
              {activeChild && activeGroup ? (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {activeGroup.label}
                </p>
              ) : null}
              <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-heading">
                {pageTitle}
              </h1>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              <span
                className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider sm:flex ${
                  restaurant?.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {restaurant?.isActive ? "Open" : "Closed"}
              </span>

              <ThemeToggle />
              <VendorNotificationBell onNavigate={onTabChange} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activeChild?.id || ""}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mx-auto max-w-6xl space-y-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default VendorShell;
