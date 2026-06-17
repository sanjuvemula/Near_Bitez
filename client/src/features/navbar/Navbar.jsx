import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { appRoutes } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useCart } from "../../hooks/useCart.js";
import { api } from "../../services/api.js";

const MenuIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const MoreIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const CloseIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CartIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
);

const customerNav = [
  { to: appRoutes.customerHome, label: "Home" },
  { to: appRoutes.customerTiffin, label: "Tiffin" },
  { to: appRoutes.customerOrders, label: "Orders" },
  { to: appRoutes.customerFavorites, label: "Favorites" },
  { to: appRoutes.customerProfile, label: "Profile" },
];

const adminNav = [
  { to: "/admin", label: "Admin" },
  { to: appRoutes.customerHome, label: "Customer" },
  { to: appRoutes.vendorDashboard, label: "Vendor" },
];

const publicNav = [{ to: appRoutes.publicHome, label: "Home" }];

const NavLink = ({ to, active, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={[
      "rounded-full px-4 py-2 text-sm font-black transition no-underline",
      active
        ? "bg-orange-50 text-orange-700"
        : "text-stone-500 hover:bg-stone-50 hover:text-stone-950",
    ].join(" ")}
  >
    {children}
  </Link>
);

const MoreMenu = ({ user, cartCount, onLogout }) => {
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

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-stone-500 transition hover:bg-stone-50 hover:text-stone-950"
      >
        More
        <MoreIcon className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open ? (
          <Motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-[20px] border border-[#eee7dc] bg-white p-2 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.65)]"
          >
            {user ? (
              <>
                {user.role === "customer" || user.role === "admin" ? (
                  <>
                    <Link
                      to={appRoutes.customerSearch}
                      onClick={close}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                    >
                      Search
                    </Link>
                    <Link
                      to={appRoutes.customerCart}
                      onClick={close}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                    >
                      Cart
                      {cartCount > 0 ? (
                        <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[11px] text-white">
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      ) : null}
                    </Link>
                  </>
                ) : null}
                {user.role === "admin" ? (
                  <>
                    <Link
                      to="/admin"
                      onClick={close}
                      className="block rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                    >
                      Admin dashboard
                    </Link>
                    <Link
                      to={appRoutes.vendorDashboard}
                      onClick={close}
                      className="block rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                    >
                      Vendor dashboard
                    </Link>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                  className="w-full rounded-2xl px-3 py-2.5 text-left text-sm font-black text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to={appRoutes.customerLogin}
                  onClick={close}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                >
                  Customer login
                </Link>
                <Link
                  to={appRoutes.vendorLogin}
                  onClick={close}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-black text-stone-600 no-underline hover:bg-orange-50 hover:text-orange-700"
                >
                  Vendor login
                </Link>
              </>
            )}
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tiffinCount, setTiffinCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get("/tiffins")
      .then((response) => {
        if (mounted) setTiffinCount(response.count || response.data?.count || 0);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  const links =
    user?.role === "customer"
      ? customerNav
      : user?.role === "admin"
      ? adminNav
      : publicNav;
  const cartCount = cart?.totals?.totalItems || 0;
  const canUseCustomerUi = user?.role === "customer" || user?.role === "admin";

  const isActive = (path) =>
    path === appRoutes.publicHome
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    if (!window.confirm("Log out from NearBitez?")) return;
    await logout();
    navigate(appRoutes.customerLogin, { replace: true });
  };

  const tiffinTarget = canUseCustomerUi
    ? appRoutes.customerTiffin
    : appRoutes.customerLogin;

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 border-b transition duration-300",
          scrolled
            ? "border-[#eee7dc] bg-white/95 shadow-sm backdrop-blur-xl"
            : "border-white/70 bg-white/80 backdrop-blur-xl",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to={appRoutes.publicHome} className="flex min-w-0 items-center gap-2 no-underline sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-orange-600 text-base font-black text-white shadow-[0_16px_32px_-24px_rgba(234,88,12,0.9)]">
              N
            </span>
            <span className="block min-w-0">
              <span className="block truncate text-base font-black text-stone-950 sm:text-lg">
                Near<span className="text-orange-600">Bitez</span>
              </span>
              <span className="hidden text-[10px] font-black uppercase tracking-[0.14em] text-stone-400 sm:block">
                Food delivery
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} active={isActive(link.to)}>
                {link.label}
              </NavLink>
            ))}
            {user?.role !== "customer" && user?.role !== "admin" ? (
              <NavLink to={tiffinTarget} active={isActive(tiffinTarget)}>
                Tiffin
                {tiffinCount > 0 ? (
                  <span className="ml-2 rounded-full bg-orange-600 px-2 py-0.5 text-[11px] text-white">
                    {tiffinCount}
                  </span>
                ) : null}
              </NavLink>
            ) : null}
            <MoreMenu user={user} cartCount={cartCount} onLogout={handleLogout} />
          </nav>

          <div className="flex items-center gap-2">
            {canUseCustomerUi ? (
              <Link
                to={appRoutes.customerCart}
                className="relative hidden items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-black text-white no-underline transition hover:bg-orange-700 sm:inline-flex"
              >
                <CartIcon />
                Cart
                {cartCount > 0 ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                to={appRoutes.customerLogin}
                className="hidden rounded-full bg-orange-600 px-4 py-2 text-sm font-black text-white no-underline transition hover:bg-orange-700 sm:inline-flex"
              >
                Login
              </Link>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#eee7dc] bg-white text-stone-700 lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <Motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-orange-950/25 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <Motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 flex w-[310px] max-w-[86vw] flex-col bg-white p-5 shadow-2xl lg:hidden"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xl font-black text-stone-950">
                  Near<span className="text-orange-600">Bitez</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-700"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    active={isActive(link.to)}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
                {user?.role !== "customer" && user?.role !== "admin" ? (
                  <NavLink
                    to={tiffinTarget}
                    active={isActive(tiffinTarget)}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Tiffin
                  </NavLink>
                ) : null}
                {canUseCustomerUi ? (
                  <>
                    <NavLink
                      to={appRoutes.customerSearch}
                      active={isActive(appRoutes.customerSearch)}
                      onClick={() => setDrawerOpen(false)}
                    >
                      Search
                    </NavLink>
                    <NavLink
                      to={appRoutes.customerCart}
                      active={isActive(appRoutes.customerCart)}
                      onClick={() => setDrawerOpen(false)}
                    >
                      Cart
                    </NavLink>
                  </>
                ) : null}
              </nav>

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-[18px] px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              ) : (
                <div className="grid gap-2">
                  <Link
                    to={appRoutes.customerLogin}
                    className="rounded-[18px] bg-orange-600 px-4 py-3 text-center text-sm font-black text-white no-underline"
                  >
                    Customer login
                  </Link>
                  <Link
                    to={appRoutes.vendorLogin}
                    className="rounded-[18px] border border-[#eee7dc] px-4 py-3 text-center text-sm font-black text-stone-700 no-underline"
                  >
                    Vendor login
                  </Link>
                </div>
              )}
            </Motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
