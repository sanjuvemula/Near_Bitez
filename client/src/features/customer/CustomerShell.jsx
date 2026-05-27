import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink as RouterNavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { appRoutes } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useCart } from "../../hooks/useCart.js";
import { useNotifications } from "../../context/NotificationContext.jsx";

const HomeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const TiffinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M5 7h14" />
    <path d="M6 7 7.4 20h9.2L18 7" />
    <path d="M8 7V4h8v3" />
    <path d="M8.5 12h7" />
    <path d="M9.5 16h5" />
  </svg>
);

const OrdersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M8 3h8l3 4v14H5V7l3-4Z" />
    <path d="M8 3v4h8V3" />
    <path d="M8 12h8" />
    <path d="M8 16h6" />
  </svg>
);

const HeartIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);

const ProfileIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M20 21a8 8 0 1 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MoreIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const CartIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
);

const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const BellIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const MenuIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const CloseIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const NAV_ITEMS = [
  { to: appRoutes.customerHome, label: "Home", end: true, icon: HomeIcon },
  { to: appRoutes.customerTiffin, label: "Tiffin", end: false, icon: TiffinIcon },
  { to: appRoutes.customerOrders, label: "Orders", end: false, icon: OrdersIcon },
  { to: appRoutes.customerFavorites, label: "Favorites", end: false, icon: HeartIcon },
  { to: appRoutes.customerProfile, label: "Profile", end: false, icon: ProfileIcon },
];

const NOTIF_ICONS = {
  ORDER_PLACED: "Order",
  ORDER_UPDATE: "Order",
  CHAT: "Chat",
  PROMO: "Offer",
  default: "Alert",
};

const navClass = ({ isActive }) =>
  [
    "group flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black transition",
    isActive
      ? "bg-orange-600 text-white shadow-[0_18px_42px_-28px_rgba(234,88,12,0.9)]"
      : "text-stone-500 hover:bg-orange-50 hover:text-orange-700",
  ].join(" ");

const iconClass = "h-5 w-5 shrink-0 stroke-[2.25]";

const MoreMenu = ({ cartCount = 0, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black transition",
          open
            ? "bg-orange-50 text-orange-700"
            : "text-stone-500 hover:bg-orange-50 hover:text-orange-700",
        ].join(" ")}
      >
        <MoreIcon className={iconClass} />
        <span>More</span>
      </button>
      <AnimatePresence>
        {open ? (
          <Motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-2 overflow-hidden rounded-[20px] border border-[#eee7dc] bg-white p-2 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.55)]"
          >
            <Link
              to={appRoutes.customerSearch}
              onClick={handleClick}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 transition hover:bg-orange-50 hover:text-orange-700"
            >
              <SearchIcon className={iconClass} />
              Search
            </Link>
            <Link
              to={appRoutes.customerCart}
              onClick={handleClick}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 transition hover:bg-orange-50 hover:text-orange-700"
            >
              <CartIcon className={iconClass} />
              Cart
              {cartCount > 0 ? (
                <span className="ml-auto rounded-full bg-orange-600 px-2 py-0.5 text-[11px] text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const NotificationPanel = ({ notifications, clearAll }) => (
  <Motion.div
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.98 }}
    className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[22px] border border-[#eee7dc] bg-white shadow-[0_30px_90px_-48px_rgba(15,23,42,0.65)]"
  >
    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
      <p className="text-sm font-black text-stone-950">Notifications</p>
      {notifications.length > 0 ? (
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full px-3 py-1 text-xs font-black text-orange-700 transition hover:bg-orange-50"
        >
          Clear all
        </button>
      ) : null}
    </div>
    <div className="max-h-[380px] overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-bold text-stone-400">No notifications yet</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex gap-3 border-b border-stone-50 px-4 py-3 last:border-0"
          >
            <span className="mt-0.5 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase text-orange-700">
              {NOTIF_ICONS[notification.type] || NOTIF_ICONS.default}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-stone-900">
                {notification.title}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">
                {notification.message}
              </p>
              <p className="mt-1 text-[11px] font-bold text-stone-400">
                {formatTimeAgo(notification.createdAt)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  </Motion.div>
);

const Sidebar = ({ user, cartCount, onLogout }) => {
  const avatarLetter = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-[#eee7dc] bg-white px-4 py-5 lg:flex">
      <Link to={appRoutes.customerHome} className="flex items-center gap-3 px-2 no-underline">
        <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-orange-600 text-lg font-black text-white shadow-[0_16px_32px_-24px_rgba(234,88,12,0.9)]">
          N
        </span>
        <span>
          <span className="block text-xl font-black text-stone-950">
            Near<span className="text-orange-600">Bites</span>
          </span>
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
            Customer
          </span>
        </span>
      </Link>

      <div className="mt-6 rounded-[20px] border border-[#eee7dc] bg-[#fafaf8] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-sm font-black text-white">
            {avatarLetter}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-stone-950">
              {user?.name || "Guest"}
            </span>
            <span className="block truncate text-xs font-bold text-stone-400">
              {user?.email || "Customer"}
            </span>
          </span>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClass}
            >
              <Icon className={iconClass} />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
        <MoreMenu cartCount={cartCount} />
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-5 rounded-[18px] px-4 py-3 text-left text-sm font-black text-stone-400 transition hover:bg-red-50 hover:text-red-600"
      >
        Sign out
      </button>
    </aside>
  );
};

const Drawer = ({ open, user, cartCount, onClose, onLogout }) => (
  <AnimatePresence>
    {open ? (
      <>
        <Motion.button
          type="button"
          aria-label="Close menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
        <Motion.aside
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[86vw] flex-col bg-white px-4 py-5 shadow-2xl lg:hidden"
        >
          <div className="mb-5 flex items-center justify-between">
            <Link to={appRoutes.customerHome} onClick={onClose} className="text-xl font-black text-stone-950 no-underline">
              Near<span className="text-orange-600">Bites</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600"
            >
              <CloseIcon className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>

          <div className="rounded-[20px] border border-[#eee7dc] bg-[#fafaf8] p-3">
            <p className="truncate text-sm font-black text-stone-950">
              {user?.name || "Guest"}
            </p>
            <p className="truncate text-xs font-bold text-stone-400">
              {user?.email || "Customer"}
            </p>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={navClass}
                >
                  <Icon className={iconClass} />
                  <span>{item.label}</span>
                </RouterNavLink>
              );
            })}
            <MoreMenu cartCount={cartCount} onNavigate={onClose} />
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-[18px] px-4 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
          >
            Sign out
          </button>
        </Motion.aside>
      </>
    ) : null}
  </AnimatePresence>
);

const BottomNav = ({ cartCount }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const moreActive =
    location.pathname.startsWith(appRoutes.customerCart) ||
    location.pathname.startsWith(appRoutes.customerSearch);

  const visibleItems = NAV_ITEMS;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eee7dc] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-6 gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-black transition",
                    isActive
                      ? "bg-orange-50 text-orange-700"
                      : "text-stone-400 hover:text-stone-700",
                  ].join(" ")
                }
              >
                <Icon className="h-5 w-5 stroke-[2.35]" />
                <span className="truncate">{item.label}</span>
              </RouterNavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className={[
              "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-black transition",
              moreOpen || moreActive
                ? "bg-orange-50 text-orange-700"
                : "text-stone-400 hover:text-stone-700",
            ].join(" ")}
          >
            <MoreIcon className="h-5 w-5 stroke-[2.35]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen ? (
          <Motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="fixed inset-x-3 bottom-[86px] z-50 overflow-hidden rounded-[24px] border border-[#eee7dc] bg-white p-2 shadow-[0_30px_90px_-52px_rgba(15,23,42,0.7)] lg:hidden"
          >
            <Link
              to={appRoutes.customerSearch}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black text-stone-700 no-underline hover:bg-orange-50"
            >
              <SearchIcon className={iconClass} />
              Search
            </Link>
            <Link
              to={appRoutes.customerCart}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black text-stone-700 no-underline hover:bg-orange-50"
            >
              <CartIcon className={iconClass} />
              Cart
              {cartCount > 0 ? (
                <span className="ml-auto rounded-full bg-orange-600 px-2 py-0.5 text-[11px] text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

const CustomerShell = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const bellRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDrawerOpen(false);
      setBellOpen(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    if (!bellOpen) return undefined;
    const handler = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const cartCount = cart?.totals?.totalItems || 0;

  const handleLogout = async () => {
    if (!window.confirm("Sign out of NearBites?")) return;
    await logout();
    navigate(appRoutes.customerLogin, { replace: true });
  };

  const handleBell = () => {
    setBellOpen((value) => !value);
    if (!bellOpen && unreadCount > 0) markAllRead();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(255,237,213,0.72),transparent_30%),radial-gradient(circle_at_95%_8%,rgba(254,202,202,0.42),transparent_26%),linear-gradient(180deg,#fff7ed_0%,#fffaf4_38%,#f8fafc_100%)] font-sans text-stone-950">
      <Sidebar user={user} cartCount={cartCount} onLogout={handleLogout} />
      <Drawer
        open={drawerOpen}
        user={user}
        cartCount={cartCount}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-white/78 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#eee7dc] bg-white text-stone-700 lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5 stroke-[2.4]" />
            </button>

            <Link to={appRoutes.customerHome} className="text-xl font-black text-stone-950 no-underline lg:hidden">
              Near<span className="text-orange-600">Bites</span>
            </Link>

            <p className="hidden flex-1 truncate text-sm font-bold text-stone-500 lg:block">
              {getGreeting()}, <span className="font-black text-stone-950">{user?.name?.split(" ")[0] || "there"}</span>
            </p>

            <div className="ml-auto flex items-center gap-2">
              <div ref={bellRef} className="relative">
                <button
                  type="button"
                  onClick={handleBell}
                  className="relative flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#eee7dc] bg-white text-stone-600 transition hover:border-orange-200 hover:text-orange-700"
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5 stroke-[2.3]" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                <AnimatePresence>
                  {bellOpen ? (
                    <NotificationPanel
                      notifications={notifications}
                      clearAll={clearAll}
                    />
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => navigate(appRoutes.customerCart)}
                className="hidden items-center gap-2 rounded-[18px] bg-orange-600 px-4 py-3 text-sm font-black text-white shadow-[0_18px_42px_-28px_rgba(234,88,12,0.9)] transition hover:bg-orange-700 sm:inline-flex"
              >
                <CartIcon className="h-4 w-4 stroke-[2.4]" />
                Cart
                {cartCount > 0 ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNav cartCount={cartCount} />
    </div>
  );
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTimeAgo(value) {
  if (!value) return "";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default CustomerShell;
