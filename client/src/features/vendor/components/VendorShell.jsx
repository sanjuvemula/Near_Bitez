import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const TAB_DATA = {
  overview:     { label: "Dashboard",        icon: "⚡" },
  orders:       { label: "Live Orders",      icon: "📋" },
  menu:         { label: "Menu Editor",      icon: "🍱" },
  inventory:    { label: "Inventory & Stock",icon: "📦" },
  logistics:    { label: "Delivery Zones",   icon: "🛵" },
  wallet:       { label: "Wallet & Payouts", icon: "💳" },
  marketing:    { label: "Marketing",        icon: "📢" },
  messages:     { label: "Messages",         icon: "💬" },
  tiffin:       { label: "Tiffin Services",  icon: "🍱" },
  subscription: { label: "Subscriptions",    icon: "🗓️" },
  reviews:      { label: "Reviews",          icon: "⭐" },
  restaurant:   { label: "Store Profile",    icon: "🏪" },
  analytics:    { label: "Analytics",        icon: "📈" },
};

const SidebarContent = ({ activeTab, onTabChange, onLogout, restaurant, liveCount, unreadMessages, onClose }) => (
  <div className="flex h-full flex-col">
    {/* Brand / Restaurant header */}
    <div className="flex items-center gap-3 px-5 pb-6 pt-7">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-600 text-base font-black text-white shadow-[0_18px_32px_-24px_rgba(234,88,12,0.8)]">
        {(restaurant?.name || "N")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-stone-950">
          {restaurant?.name || "Vendor Panel"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            {restaurant?.isActive ? "Online" : "Offline"}
          </p>
        </div>
      </div>
      {/* Close button — only on mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-700 xl:hidden"
        >
          ✕
        </button>
      )}
    </div>

    {/* Nav items */}
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-2">
      {Object.entries(TAB_DATA).map(([id, data]) => {
        const isActive = activeTab === id;
        let badgeCount = 0;
        if (id === "orders") badgeCount = liveCount;
        if (id === "messages") badgeCount = unreadMessages;

        return (
          <button
            key={id}
            onClick={() => { onTabChange(id); onClose?.(); }}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
              isActive
                ? "bg-orange-600 text-white shadow-[0_18px_32px_-24px_rgba(234,88,12,0.85)]"
                : "text-stone-500 hover:bg-orange-50 hover:text-stone-950"
            }`}
          >
            <span className={`text-base flex-shrink-0 transition-transform duration-150 ${isActive ? "scale-110" : "opacity-75"}`}>
              {data.icon}
            </span>
            <span className={`text-sm tracking-tight ${isActive ? "font-bold text-white" : "font-medium"}`}>
              {data.label}
            </span>
            {badgeCount > 0 && (
              <span className={`ml-auto flex h-5 min-w-[20px] flex-shrink-0 px-1 items-center justify-center rounded-full text-[10px] font-black ${
                id === "messages" ? "bg-rose-500 text-white" : "bg-amber-400 text-stone-950"
              }`}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    {/* Logout */}
    <div className="border-t border-[#eee7dc] p-3">
      <button
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
      >
        <span className="text-sm">🚪</span>
        <span className="text-xs font-bold">Log out</span>
      </button>
    </div>
  </div>
);

const VendorShell = ({ activeTab, onTabChange, onLogout, overview, restaurant, chats = [], children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const liveCount = overview?.stats?.liveOrders || 0;
  const unreadMessages = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalBadge = liveCount + unreadMessages;

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,63,94,0.08),transparent_18%),linear-gradient(180deg,#fffaf5_0%,#f8f5f2_100%)] font-sans text-stone-700 selection:bg-orange-100">

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#eee7dc] bg-white/92 px-4 py-3 backdrop-blur xl:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#e7ddd0] bg-white text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="12.5" width="10" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
          {totalBadge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-black text-white">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-600 text-xs font-black text-white">
            {(restaurant?.name || "N")[0].toUpperCase()}
          </div>
          <p className="truncate text-sm font-bold text-stone-950">
            {restaurant?.name || "Vendor Panel"}
          </p>
          <span className={`ml-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${restaurant?.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
        </div>

        {/* Current tab label on mobile */}
        <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider text-stone-400">
          {TAB_DATA[activeTab]?.icon} {TAB_DATA[activeTab]?.label}
        </span>
      </header>

      {/* ── Mobile drawer backdrop ───────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed left-0 top-0 z-50 h-full w-[270px] overflow-hidden border-r border-[#eee7dc] bg-[linear-gradient(180deg,#ffffff,#fffaf5)] xl:hidden"
            >
              <SidebarContent
                activeTab={activeTab}
                onTabChange={onTabChange}
                onLogout={onLogout}
                restaurant={restaurant}
                liveCount={liveCount}
                unreadMessages={unreadMessages}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop layout ───────────────────────────────────────── */}
      <div className="relative mx-auto flex max-w-[1600px]">

        {/* Desktop sidebar — always visible on xl+ */}
        <aside className="sticky top-0 z-20 hidden h-screen w-[260px] flex-shrink-0 flex-col overflow-hidden border-r border-[#eee7dc] bg-[linear-gradient(180deg,#ffffff,#fffaf5)] xl:flex">
          <SidebarContent
            activeTab={activeTab}
            onTabChange={onTabChange}
            onLogout={onLogout}
            restaurant={restaurant}
            liveCount={liveCount}
            unreadMessages={unreadMessages}
          />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-10 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mx-auto max-w-6xl space-y-8"
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
