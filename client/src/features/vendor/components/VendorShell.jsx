import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import VendorNotificationBell from "./VendorNotificationBell.jsx";
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

/** Numeric counts render as pills; string badges ("Expiring") render as tags. */
const Badge = ({ value, tone = "default" }) => {
  if (!value) return null;

  const isText = typeof value === "string";
  const tones = {
    default: "bg-orange-100 text-orange-700",
    alert: "bg-rose-100 text-rose-700",
    warn: "bg-amber-100 text-amber-700",
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

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pr-2 text-left transition-colors duration-150 ${
        depth > 0 ? "pl-9" : "pl-2.5"
      } ${
        active
          ? "bg-orange-50 text-orange-700"
          : "text-stone-600 hover:bg-stone-100/70 hover:text-stone-900"
      }`}
    >
      {/* Left rail marker instead of a full orange block */}
      {active ? (
        <motion.span
          layoutId="vendor-nav-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-600"
        />
      ) : null}

      {Icon ? (
        <Icon
          size={depth > 0 ? 15 : 18}
          className={`flex-shrink-0 ${active ? "text-orange-600" : "text-stone-400 group-hover:text-stone-600"}`}
        />
      ) : depth > 0 ? (
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            active ? "bg-orange-500" : "bg-stone-300 group-hover:bg-stone-400"
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
            ? "text-orange-700"
            : "text-stone-600 hover:bg-stone-100/70 hover:text-stone-900"
        }`}
      >
        {Icon ? (
          <Icon
            size={18}
            className={`flex-shrink-0 ${
              containsActive ? "text-orange-600" : "text-stone-400 group-hover:text-stone-600"
            }`}
          />
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
          className="flex-shrink-0 text-stone-300 group-hover:text-stone-500"
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
            className="h-10 w-10 flex-shrink-0 rounded-xl border border-[#eee7dc] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white">
            {name.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-stone-900">{name}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-stone-400">
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
            ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            : "border-rose-200 bg-rose-50 hover:bg-rose-100"
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
            isOpen ? "text-emerald-700" : "text-rose-700"
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
  <div className="flex h-full flex-col">
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
          className="mr-2 mt-5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 xl:hidden"
        >
          <XIcon size={16} />
        </button>
      ) : null}
    </div>

    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
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

    <div className="space-y-0.5 border-t border-[#f0ebe3] p-3">
      <button
        type="button"
        onClick={() => onSelect({ tab: VENDOR_FOOTER_TAB })}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
          activeTab === VENDOR_FOOTER_TAB
            ? "bg-orange-50 font-semibold text-orange-700"
            : "font-medium text-stone-600 hover:bg-stone-100/70 hover:text-stone-900"
        }`}
      >
        <SettingsIcon
          size={17}
          className={`flex-shrink-0 ${
            activeTab === VENDOR_FOOTER_TAB ? "text-orange-600" : "text-stone-400"
          }`}
        />
        <span className="truncate text-[13px] tracking-tight">Settings</span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOutIcon size={17} className="flex-shrink-0 text-stone-400 group-hover:text-rose-500" />
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
    <div className="relative min-h-screen bg-[#fdfbf8] font-sans text-stone-700 selection:bg-orange-100">
      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#f0ebe3] bg-white/95 px-4 py-2.5 backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#eee7dc] bg-white text-stone-600 transition-colors hover:bg-stone-50"
        >
          <MenuIcon size={17} />
          {totalBadge > 0 ? (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500" />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{pageTitle}</p>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <p className="truncate text-[11px] font-medium text-stone-400">
              {restaurant?.name || "Vendor"}
            </p>
          </div>
        </div>

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
              className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 38 }}
              className="fixed left-0 top-0 z-50 h-full w-[270px] max-w-[85vw] overflow-hidden border-r border-[#f0ebe3] bg-white xl:hidden"
            >
              {sidebar(() => setMobileOpen(false))}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative mx-auto flex max-w-[1600px]">
        {/* ── Desktop sidebar ────────────────────────────────────────────── */}
        <aside className="sticky top-0 z-20 hidden h-screen w-[248px] flex-shrink-0 flex-col overflow-hidden border-r border-[#f0ebe3] bg-white xl:flex">
          {sidebar(null)}
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-8">
          {/* Minimal desktop header: title, status, notifications only */}
          <div className="mx-auto mb-6 hidden max-w-6xl items-center justify-between gap-4 xl:flex">
            <div className="min-w-0">
              {activeChild && activeGroup ? (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  {activeGroup.label}
                </p>
              ) : null}
              <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-stone-900">
                {pageTitle}
              </h1>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              <span
                className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider sm:flex ${
                  restaurant?.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {restaurant?.isActive ? "Open" : "Closed"}
              </span>

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
