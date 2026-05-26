import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Loader from "../../components/Loader.jsx";
import { appRoutes } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useCart } from "../../hooks/useCart.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import CustomerChat from "../customer/CustomerChat.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VegBadge = ({ isVeg }) => (
  <span
    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black border"
    style={{
      background: isVeg ? "#f0fdf4" : "#fff7ed",
      borderColor: isVeg ? "#bbf7d0" : "#fed7aa",
      color: isVeg ? "#15803d" : "#c2410c",
    }}
  >
    <span
      className="h-2 w-2 rounded-full"
      style={{ background: isVeg ? "#16a34a" : "#ea580c" }}
    />
    {isVeg ? "VEG" : "NON-VEG"}
  </span>
);

const AvailBadge = ({ available }) => (
  <span
    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
    style={{
      background: available ? "#dcfce7" : "#fee2e2",
      color: available ? "#15803d" : "#dc2626",
    }}
  >
    {available ? "● Live" : "○ Unavailable"}
  </span>
);

// ─── Quantity Control ─────────────────────────────────────────────────────────
const QtyControl = ({ quantity, onAdd, onRemove, disabled, loading }) => (
  <div
    className="flex items-center rounded-full overflow-hidden"
    style={{ border: "2px solid #ea580c", background: "#fff7ed" }}
  >
    <button
      onClick={onRemove}
      disabled={loading}
      className="w-9 h-9 flex items-center justify-center text-orange-600 font-black text-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
    >
      −
    </button>
    <span className="min-w-[28px] text-center text-sm font-black text-orange-700">
      {loading ? (
        <span className="inline-block h-3 w-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      ) : quantity}
    </span>
    <button
      onClick={onAdd}
      disabled={disabled || loading}
      className="w-9 h-9 flex items-center justify-center text-white font-black text-lg transition-colors disabled:opacity-50"
      style={{ background: "#ea580c" }}
    >
      +
    </button>
  </div>
);

// ─── Menu Item Card ───────────────────────────────────────────────────────────
const MenuItemCard = ({ item, quantity, onAdd, onChange, pending }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-4 rounded-2xl bg-white p-4 transition-all"
    style={{
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      opacity: item.isAvailable ? 1 : 0.55,
    }}
  >
    {/* Info */}
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <VegBadge isVeg={item.isVeg} />
        <AvailBadge available={item.isAvailable} />
      </div>
      <h3 className="text-base font-black text-gray-900 leading-tight">{item.name}</h3>
      {item.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-lg font-black text-gray-900">{formatCurrency(item.price)}</span>
        {quantity > 0 ? (
          <QtyControl
            quantity={quantity}
            loading={pending}
            disabled={!item.isAvailable}
            onAdd={() => onChange(item, quantity + 1)}
            onRemove={() => onChange(item, quantity - 1)}
          />
        ) : (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => onAdd(item)}
            disabled={!item.isAvailable || pending}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black text-white disabled:opacity-40 transition-all"
            style={{ background: item.isAvailable ? "#ea580c" : "#d1d5db" }}
          >
            {pending ? (
              <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <>
                <span className="text-base leading-none">+</span>
                Add
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>

    {/* Image */}
    <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl font-black text-orange-200">
          {item.name[0]}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const RestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart, addItem, updateItemQuantity, removeItem } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const categoryRefs = useRef({});
  const headerRef = useRef(null);

  // ── Fetch menu (real-time every 5s) ───────────────────────────────────────
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await api.get(`/restaurants/${id}`);
        if (!active) return;
        setRestaurant(res.data);
        setLastUpdated(new Date());
        setError("");
      } catch (e) {
        if (active) setError(e.message || "Could not load menu");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [id]);

  // ── Grouped menu ──────────────────────────────────────────────────────────
  const groupedItems = useMemo(() => {
    const all = restaurant?.menu || [];
    const filtered = all.filter((item) => {
      if (vegOnly && !item.isVeg) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    const groups = new Map();
    for (const item of filtered) {
      const cat = item.category || "Other";
      groups.set(cat, [...(groups.get(cat) || []), item]);
    }
    return [...groups.entries()];
  }, [restaurant?.menu, vegOnly, searchTerm]);

  const categories = useMemo(() => groupedItems.map(([cat]) => cat), [groupedItems]);

  useEffect(() => {
    if (categories.length && !activeCategory) setActiveCategory(categories[0]);
  }, [categories]);

  const getQuantity = (menuItemId) =>
    cart?.items?.find((i) => i.menuItemId === menuItemId)?.quantity || 0;

  const restaurantCartActive =
    cart?.restaurant?._id && String(cart.restaurant._id) === String(restaurant?._id);

  const backRoute = location.pathname.startsWith("/app/")
    ? appRoutes.customerHome
    : appRoutes.publicHome;
  const canUseCustomerActions = ["customer", "admin"].includes(user?.role);

  // ── Scroll to category ────────────────────────────────────────────────────
  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // ── Add / change item ─────────────────────────────────────────────────────
  const handleAdd = async (item) => {
    if (!user || !canUseCustomerActions) {
      navigate(appRoutes.customerLogin, { state: { from: location } });
      return;
    }
    try {
      setUpdatingItemId(item._id);
      await addItem({ menuItemId: item._id, quantity: 1 });
      toast.success(`${item.name} added! 🛒`, { style: { borderRadius: "12px" } });
    } catch (e) {
      if (e.code === "CART_RESTAURANT_MISMATCH") {
        const ok = window.confirm("Replace cart with items from this restaurant?");
        if (ok) {
          await addItem({ menuItemId: item._id, quantity: 1, replaceCart: true });
          toast.success(`Cart switched to ${restaurant?.name}`);
        }
        return;
      }
      toast.error(e.message || "Could not add item");
    } finally {
      setUpdatingItemId("");
    }
  };

  const handleChange = async (item, nextQty) => {
    try {
      setUpdatingItemId(item._id);
      if (nextQty <= 0) await removeItem(item._id);
      else await updateItemQuantity(item._id, nextQty);
    } catch (e) {
      toast.error(e.message || "Could not update cart");
    } finally {
      setUpdatingItemId("");
    }
  };

  if (loading) return <Loader label="Loading menu..." />;
  if (error || !restaurant) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-600 text-sm font-semibold">
        {error || "Restaurant not found"}
      </div>
    );
  }

  const totalCartItems = cart?.totals?.totalItems || 0;
  const totalCartValue = cart?.totals?.grandTotal || 0;

  return (
    <div className="min-h-screen" style={{ background: "#fafaf8" }}>
      {/* Back */}
      <Link
        to={backRoute}
        className="inline-flex items-center gap-2 text-sm font-bold text-orange-500 mb-5 hover:text-orange-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* ── Restaurant Hero ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{ height: 260 }}
      >
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl font-black"
            style={{ background: "linear-gradient(135deg, #fff7ed, #fed7aa)" }}>
            {restaurant.name[0]}
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                  {restaurant.category}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: restaurant.isActive ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
                    color: "#fff",
                  }}
                >
                  {restaurant.isActive ? "● Open" : "○ Closed"}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white">{restaurant.name}</h1>
              <p className="text-white/70 text-sm mt-1 max-w-xl truncate">
                {restaurant.description || restaurant.address}
              </p>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-3">
              {[
                { icon: "⭐", val: Number(restaurant.rating || 0).toFixed(1) },
                { icon: "⏱️", val: `${restaurant.deliveryTime}m` },
                { icon: "🍽️", val: `${restaurant.availableItemCount || 0} live` },
              ].map((s) => (
                <div key={s.val} className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2 text-center border border-white/20">
                  <div className="text-base">{s.icon}</div>
                  <div className="text-xs font-black text-white mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Sticky nav: search + category tabs ──────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-30 rounded-2xl mb-5 py-3 px-4"
        style={{ background: "rgba(250,250,248,0.95)", backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        {/* Search + toggles */}
        <div className="flex gap-3 items-center mb-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm font-medium text-gray-800 outline-none border border-gray-200 focus:border-orange-400 bg-white"
            />
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black border transition-all"
            style={{
              background: vegOnly ? "#f0fdf4" : "#fff",
              borderColor: vegOnly ? "#86efac" : "#e5e7eb",
              color: vegOnly ? "#15803d" : "#6b7280",
            }}
          >
            <span className={`h-2.5 w-2.5 rounded-sm border-2 ${vegOnly ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
            Veg only
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-600">Live</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              className="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
              style={{
                background: activeCategory === cat ? "#ea580c" : "#fff",
                color: activeCategory === cat ? "#fff" : "#6b7280",
                boxShadow: activeCategory === cat ? "0 4px 12px rgba(234,88,12,0.3)" : "0 1px 4px rgba(0,0,0,0.07)",
                border: "1px solid transparent",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content grid ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Menu sections */}
        <div className="space-y-8">
          {groupedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-white"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="text-4xl mb-3">🍽️</div>
              <p className="text-lg font-black text-gray-900">No items found</p>
              <p className="text-sm text-gray-400 mt-1">Try removing filters</p>
            </div>
          ) : (
            groupedItems.map(([categoryName, items]) => (
              <div
                key={categoryName}
                ref={(el) => (categoryRefs.current[categoryName] = el)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-black text-gray-900">{categoryName}</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-bold text-gray-400">{items.length} items</span>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <MenuItemCard
                      key={item._id}
                      item={item}
                      quantity={getQuantity(item._id)}
                      pending={updatingItemId === item._id}
                      onAdd={handleAdd}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Sticky sidebar ──────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {/* Cart summary */}
          <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Your cart</p>
            {restaurantCartActive && totalCartItems > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{totalCartItems} items</p>
                    <p className="text-sm text-gray-400 font-medium">{formatCurrency(totalCartValue)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: "#fff7ed" }}>🛒</div>
                </div>
                <Link to={appRoutes.customerCart}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-2xl py-3.5 text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #ea580c, #c2410c)" }}
                  >
                    Go to checkout →
                  </motion.button>
                </Link>
              </>
            ) : cart?.restaurant?.name && !restaurantCartActive ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
                Cart has items from <b>{cart.restaurant.name}</b>. Adding here will replace it.
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="text-3xl mb-2">🛒</div>
                <p className="text-sm font-bold text-gray-400">Add items to get started</p>
              </div>
            )}
          </div>

          {/* Restaurant info */}
          <div className="rounded-2xl bg-white p-5 space-y-3" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Info</p>
            {[
              { label: "Delivery time", val: `${restaurant.deliveryTime} min` },
              { label: "Cuisines", val: (restaurant.cuisineType || []).join(", ") || restaurant.category },
              { label: "Price band", val: restaurant.priceBand || "Budget" },
              { label: "Menu synced", val: lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">{row.label}</span>
                <span className="font-black text-gray-800 text-right max-w-[160px]">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Chat button */}
          {user?.role === "customer" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setChatOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-black border-2 border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
              style={{ background: "#fff" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat with restaurant
            </motion.button>
          )}
        </aside>
      </div>

      {/* Chat widget */}
      <AnimatePresence>
        {chatOpen && user?.role === "customer" && (
          <CustomerChat
            restaurantId={restaurant._id}
            restaurantName={restaurant.name}
            onClose={() => setChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RestaurantMenu;
