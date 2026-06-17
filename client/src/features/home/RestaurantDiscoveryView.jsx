import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { appRoutes, getCustomerRestaurantRoute } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import RestaurantCard from "./RestaurantCard.jsx";
import { useRestaurantDiscovery } from "./useRestaurantDiscovery.js";
import { api } from "../../services/api.js";

// ─── Card Skeleton ─────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div style={{
    background: "#fff", borderRadius: 16, overflow: "hidden",
    border: "1px solid #f0ede8",
  }}>
    <div style={{
      height: 196,
      background: "linear-gradient(90deg,#f5f3f0 25%,#eceae6 50%,#f5f3f0 75%)",
      backgroundSize: "200% 100%",
      animation: "nb-shimmer 1.4s infinite",
    }} />
    <div style={{ padding: "12px 14px 14px" }}>
      <div style={{ height: 12, background: "#f0ede8", borderRadius: 100, width: "60%", marginBottom: 10 }} />
      <div style={{ height: 12, background: "#f0ede8", borderRadius: 100, width: "80%", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        {[48, 48, 64].map((w, i) => (
          <div key={i} style={{ height: 10, background: "#f0ede8", borderRadius: 100, width: w }} />
        ))}
      </div>
    </div>
    <style>{`@keyframes nb-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

// ─── Dish Recommendation Card ──────────────────────────────────────────────────
const DishRecommendationCard = ({ dish, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.07 }}
  >
    <Link to={getCustomerRestaurantRoute(dish.restaurantId)} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #f0ede8",
          borderRadius: 16, overflow: "hidden",
          transition: "all 0.2s ease", cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(232,56,13,0.12)";
          e.currentTarget.style.borderColor = "#f9c5b0";
          e.currentTarget.style.transform = "translateY(-3px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = "#f0ede8";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ height: 120, background: "#fff7ed", position: "relative", overflow: "hidden" }}>
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              🍽️
            </div>
          )}
          {/* Veg/Non-veg dot */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            width: 18, height: 18,
            border: `2px solid ${dish.isVeg ? "#16a34a" : "#dc2626"}`,
            borderRadius: 3, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dish.isVeg ? "#16a34a" : "#dc2626" }} />
          </div>
          {dish.reason && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.6)", color: "#fff",
              fontSize: 9, fontWeight: 700,
              padding: "3px 7px", borderRadius: 100,
              backdropFilter: "blur(4px)", whiteSpace: "nowrap",
            }}>
              {dish.reason}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dish.name}
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dish.restaurantName}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#e8380d" }}>₹{dish.price}</span>
            {dish.rating && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: dish.rating >= 4 ? "#16a34a" : "#d97706" }}>
                ⭐ {dish.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

// ─── AI Recommendations Section ────────────────────────────────────────────────
const RecommendationsSection = ({ userId }) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Recommended for you");

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const h = new Date().getHours();
    const timeSlot = h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snacks" : "dinner";

    Promise.all([api.get("/orders").catch(() => ({ data: [] }))])
      .then(([ordersRes]) => {
        const orders = ordersRes?.data ?? [];
        const delivered = orders.filter((o) => o.status === "DELIVERED");
        const itemFreq = {};
        delivered.forEach((order) => {
          (order.items || []).forEach((item) => {
            const key = item.name?.toLowerCase();
            if (key) itemFreq[key] = (itemFreq[key] || 0) + item.quantity;
          });
        });
        const topItems = Object.entries(itemFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);

        api.get("/restaurants").then((res) => {
          const restaurants = res?.data ?? [];
          const recommendations = [];
          restaurants.forEach((restaurant) => {
            if (!restaurant.isActive) return;
            (restaurant.menu || restaurant.menuItems || []).forEach((dish) => {
              if (!dish.isAvailable) return;
              const dishName = dish.name?.toLowerCase() || "";
              const isReordered = topItems.some((t) => dishName.includes(t) || t.includes(dishName));
              const isTimeMatch = dish.category?.toLowerCase().includes(timeSlot);
              const isPopular = (dish.rating || 0) >= 4.2;
              let reason = null, score = 0;
              if (isReordered)       { reason = "🔁 You love this"; score += 10; }
              else if (isTimeMatch)  { reason = `🕐 Perfect for ${timeSlot}`; score += 5; }
              else if (isPopular)    { reason = "⭐ Highly rated"; score += 3; }
              if (reason) {
                recommendations.push({
                  ...dish,
                  restaurantId: restaurant._id,
                  restaurantName: restaurant.name,
                  reason, score,
                });
              }
            });
          });
          const seen = new Set();
          const final = recommendations
            .sort((a, b) => b.score - a.score)
            .filter((d) => {
              const key = d.name?.toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key); return true;
            })
            .slice(0, 8);

          if (final.length > 0) {
            setDishes(final);
            setTitle(topItems.length > 0 ? "Recommended for you 🤖" : `Perfect for ${timeSlot} 🕐`);
          }
        }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || dishes.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>
            {title}
          </h2>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            Based on your order history &amp; time of day
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {dishes.map((dish, i) => (
          <DishRecommendationCard key={dish._id || i} dish={dish} index={i} />
        ))}
      </div>
    </motion.div>
  );
};

// ─── Location Banner ───────────────────────────────────────────────────────────
const LocationBanner = ({ location, status, error, onRequest, onClear }) => {
  if (status === "granted" && location) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#f0fff4", border: "1px solid #c6f6d5",
          borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13,
        }}
      >
        <span style={{ fontSize: 16 }}>📍</span>
        <span style={{ flex: 1, color: "#276749", fontWeight: 600 }}>
          Showing restaurants near <strong>{location.city}</strong>
          <span style={{ color: "#a0aec0", fontWeight: 400, marginLeft: 6 }}>· sorted by distance</span>
        </span>
        <button
          onClick={onClear}
          style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          Clear
        </button>
      </motion.div>
    );
  }

  if (status === "requesting") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#fffbeb", border: "1px solid #fef08a",
        borderRadius: 12, padding: "10px 14px", marginBottom: 16,
        fontSize: 13, color: "#92400e",
      }}>
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid #d97706", borderTopColor: "transparent",
          display: "inline-block", animation: "nb-spin 0.8s linear infinite",
        }} />
        Getting your location...
        <style>{`@keyframes nb-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#fff5f5", border: "1px solid #fed7d7",
        borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13,
      }}>
        <span>⚠️</span>
        <span style={{ flex: 1, color: "#c53030" }}>{error || "Location access denied"}</span>
      </div>
    );
  }

  // idle / unavailable → show prompt card
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#fff", border: "1px solid #f0ede8",
        borderRadius: 12, padding: "12px 16px", marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 20 }}>📍</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1c1c", margin: 0 }}>
          Find restaurants near you
        </p>
        <p style={{ fontSize: 12, color: "#b0a898", margin: 0 }}>
          Share your location to see nearby places &amp; real distances
        </p>
      </div>
      <button
        onClick={onRequest}
        style={{
          padding: "8px 16px", borderRadius: 10,
          background: "#e8380d", color: "#fff",
          border: "none", cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 700,
          boxShadow: "0 2px 10px rgba(232,56,13,0.25)",
          whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        Use my location
      </button>
    </motion.div>
  );
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",          label: "All",          emoji: "🍽️" },
  { id: "biryani",      label: "Biryani",      emoji: "🍛" },
  { id: "pizza",        label: "Pizza",        emoji: "🍕" },
  { id: "burger",       label: "Burger",       emoji: "🍔" },
  { id: "chinese",      label: "Chinese",      emoji: "🥢" },
  { id: "south indian", label: "South Indian", emoji: "🥘" },
  { id: "desserts",     label: "Desserts",     emoji: "🍰" },
  { id: "drinks",       label: "Drinks",       emoji: "🧃" },
  { id: "healthy",      label: "Healthy",      emoji: "🥗" },
];

const SORT_OPTIONS = [
  { value: "rating_desc",     label: "Top Rated" },
  { value: "popularity_desc", label: "Popular" },
  { value: "distance_asc",    label: "Nearest" },
  { value: "delivery_asc",    label: "Fastest" },
  { value: "price_asc",       label: "Cheapest" },
];

const DIET = [
  { id: "all",     label: "All" },
  { id: "veg",     label: "🥦 Veg" },
  { id: "non_veg", label: "🍗 Non-veg" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const PUBLIC_OPTIONS = [
  {
    title: "Order as customer",
    description: "Browse live restaurant menus, save favorites, and checkout faster.",
    to: appRoutes.customerRegister,
    action: "Create account",
  },
  {
    title: "Restaurant partner",
    description: "Open a vendor dashboard for menu, orders, promos, and payouts.",
    to: appRoutes.vendorRegister,
    action: "Start selling",
  },
  {
    title: "Daily tiffin plans",
    description: "Find home-style weekly and monthly meal options near you.",
    to: appRoutes.customerLogin,
    action: "Explore tiffins",
  },
  {
    title: "Rewards and games",
    description: "Play food games, collect NearCoins, and unlock offer codes.",
    to: appRoutes.customerLogin,
    action: "Unlock rewards",
  },
];

const PUBLIC_STEPS = [
  { label: "Find", text: "Search restaurants, cuisines, dishes, or tiffin plans around your area." },
  { label: "Choose", text: "Compare live menus, ratings, delivery time, prices, and dietary filters." },
  { label: "Track", text: "Sign in to checkout, track orders, chat with restaurants, and earn rewards." },
];

const PublicHomeExtras = ({ feed }) => {
  const highlights = feed.highlights || {};
  const metrics = [
    { value: highlights.activeRestaurantCount || 0, label: "restaurants live" },
    { value: highlights.availableDishCount || 0, label: "dishes available" },
    { value: highlights.averageDeliveryTime ? `${highlights.averageDeliveryTime} min` : "Fast", label: "average delivery" },
  ];

  return (
    <div className="nb-public-stack">
      <section className="nb-option-grid" aria-label="NearBitez options">
        {PUBLIC_OPTIONS.map((option) => (
          <Link key={option.title} to={option.to} className="nb-option-card">
            <span>{option.title}</span>
            <strong>{option.description}</strong>
            <small>{option.action}</small>
          </Link>
        ))}
      </section>

      <section className="nb-public-info">
        <div>
          <p>Why NearBitez</p>
          <h2>Everything you need before your first order.</h2>
          <span>
            Check real restaurant data, compare food options, then sign in only when you are ready to save,
            checkout, chat, or earn rewards.
          </span>
        </div>
        <div className="nb-public-metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="nb-step-grid" aria-label="How NearBitez works">
        {PUBLIC_STEPS.map((step, index) => (
          <div key={step.label} className="nb-step-card">
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{step.label}</strong>
            <span>{step.text}</span>
          </div>
        ))}
      </section>
    </div>
  );
};

const RestaurantDiscoveryView = ({ variant = "public" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location, status: locStatus, error: locError, requestLocation, clearLocation } = useUserLocation();
  const { feed, loading, error, loadDiscovery, filters, filteredRestaurants } = useRestaurantDiscovery();

  const isCustomer = variant === "customer";
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const searchRef = useRef(null);

  // Pass location to discovery hook when it changes
  useEffect(() => {
    if (location?.lat && filters?.setUserLocation) {
      filters.setUserLocation(location);
    }
  }, [location]);

  // Auto-sort by distance when location is granted
  useEffect(() => {
    if (locStatus === "granted" && location && filters?.setSortBy) {
      filters.setSortBy("distance_asc");
    }
  }, [locStatus, location]);

  const handleCategory = (id) => {
    setActiveCategory(id);
    filters.setSelectedCuisine(
      id === "all" ? "All" : id.charAt(0).toUpperCase() + id.slice(1)
    );
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .nb-cat-scroll::-webkit-scrollbar { display: none; }
        .nb-cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .nb-select-clean {
          background: transparent; border: none; outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #444; cursor: pointer;
        }
        .nb-public-stack { display: grid; gap: 18px; margin-bottom: 24px; }
        .nb-option-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
        .nb-option-card {
          display: flex; min-height: 150px; flex-direction: column; justify-content: space-between;
          border: 1px solid #f0ddd0; border-radius: 18px; padding: 18px;
          background: linear-gradient(135deg,#fff,#fff8f1); color: #251b16; text-decoration: none;
          box-shadow: 0 20px 46px -42px rgba(74,32,10,.55); transition: transform .18s ease, border-color .18s ease;
        }
        .nb-option-card:nth-child(2) { background: linear-gradient(135deg,#fff,#fff1f2); }
        .nb-option-card:nth-child(3) { background: linear-gradient(135deg,#fff,#f0fdf4); }
        .nb-option-card:nth-child(4) { background: linear-gradient(135deg,#251b16,#3b261b); color: #fff; border-color: #2f2119; }
        .nb-option-card:hover { transform: translateY(-3px); border-color: #fb923c; }
        .nb-option-card span { color: #ea580c; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
        .nb-option-card:nth-child(4) span { color: #fdba74; }
        .nb-option-card strong { display: block; margin-top: 12px; font-size: 18px; font-weight: 900; line-height: 1.25; }
        .nb-option-card small { margin-top: 18px; color: inherit; font-size: 12px; font-weight: 900; opacity: .76; }
        .nb-public-info {
          display: grid; gap: 18px; align-items: center; border: 1px solid #eadbd0;
          border-radius: 22px; padding: 22px; background: linear-gradient(135deg,#fffaf5,#ffffff);
        }
        .nb-public-info p { margin: 0 0 8px; color: #ea580c; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .14em; }
        .nb-public-info h2 { margin: 0; color: #211915; font-size: 28px; font-weight: 900; line-height: 1.1; }
        .nb-public-info div > span { display: block; margin-top: 10px; max-width: 680px; color: #7c6f64; font-size: 14px; font-weight: 650; line-height: 1.65; }
        .nb-public-metrics { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .nb-public-metrics div { border-radius: 16px; background: #fff; border: 1px solid #f0e4dc; padding: 14px; }
        .nb-public-metrics strong, .nb-public-metrics span { display: block; }
        .nb-public-metrics strong { color: #211915; font-size: 22px; font-weight: 900; }
        .nb-public-metrics span { margin-top: 4px; color: #9a8c84; font-size: 10px; font-weight: 900; text-transform: uppercase; }
        .nb-step-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
        .nb-step-card { border: 1px solid #eadbd0; border-radius: 18px; padding: 18px; background: #fff; }
        .nb-step-card small { color: #f97316; font-size: 11px; font-weight: 900; }
        .nb-step-card strong { display: block; margin-top: 9px; color: #211915; font-size: 18px; font-weight: 900; }
        .nb-step-card span { display: block; margin-top: 7px; color: #82766f; font-size: 13px; font-weight: 650; line-height: 1.55; }
        @media (min-width: 820px) {
          .nb-public-info { grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr); }
        }
        @media (max-width: 520px) {
          .nb-public-info { padding: 18px; }
          .nb-public-info h2 { font-size: 23px; }
          .nb-public-metrics { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Public Hero (only on public/landing page) ── */}
      {!isCustomer && (
        <div style={{
          background: "linear-gradient(135deg, #fff7ed 0%, #ecfeff 52%, #fdf2f8 100%)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: 18, padding: "36px 32px", marginBottom: 24,
          position: "relative", overflow: "hidden",
          boxShadow: "0 28px 80px -58px rgba(14,116,144,0.44)",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle at 15% 50%, rgba(251,146,60,0.24) 0%, transparent 55%), radial-gradient(circle at 85% 15%, rgba(14,165,233,0.18), transparent 35%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "relative", display: "flex",
            justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 20,
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#e8380d", marginBottom: 10 }}>
                NearBitez
              </p>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#1c1c1c", lineHeight: 1.2, letterSpacing: "-0.02em", margin: 0 }}>
                Real restaurants,<br />
                <span style={{ color: "#e8380d" }}>live menus.</span>
              </h1>
              <p style={{ fontSize: 13, color: "#7c6f64", marginTop: 10, fontWeight: 600 }}>
                {feed.highlights.activeRestaurantCount} restaurants · {feed.highlights.availableDishCount} dishes right now
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to={appRoutes.customerLogin}>
                <button style={{
                  padding: "9px 20px",
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid #fed7aa",
                  borderRadius: 100, color: "#9a3412",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", backdropFilter: "blur(8px)",
                }}>
                  Sign in
                </button>
              </Link>
              <Link to={appRoutes.vendorLogin}>
                <button style={{
                  padding: "9px 20px",
                  background: "linear-gradient(135deg,#f97316,#f43f5e)", border: "none",
                  borderRadius: 100, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 4px 16px rgba(232,56,13,0.35)",
                }}>
                  For vendors
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Page Header (replaces duplicate topbar greeting) ── */}
      {!isCustomer && <PublicHomeExtras feed={feed} />}

      {isCustomer && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 900, color: "#1c1c1c",
            letterSpacing: "-0.025em", margin: 0, lineHeight: 1.2,
          }}>
            What are you craving? 🍽️
          </h1>
          <p style={{ fontSize: 13, color: "#b0a898", fontWeight: 500, marginTop: 4 }}>
            {filteredRestaurants.length > 0
              ? `${filteredRestaurants.length} restaurants open near you`
              : "Discover restaurants around you"}
          </p>
        </div>
      )}

      {/* ── Location Banner ── */}
      <LocationBanner
        location={location}
        status={locStatus}
        error={locError}
        onRequest={requestLocation}
        onClear={clearLocation}
      />

      {/* ── Search Bar ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", pointerEvents: "none",
            display: "flex", alignItems: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c8c0b4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search restaurants, cuisines, dishes..."
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filters.search.trim()) {
                navigate(`/app/search?q=${encodeURIComponent(filters.search.trim())}`);
              }
            }}
            style={{
              width: "100%", padding: "13px 42px 13px 44px",
              borderRadius: 12, fontSize: 14, fontWeight: 500,
              color: "#1c1c1c", fontFamily: "inherit", outline: "none",
              background: "#fff",
              border: searchFocused ? "2px solid #e8380d" : "2px solid #f0ede8",
              boxShadow: searchFocused ? "0 0 0 4px rgba(232,56,13,0.07)" : "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          />
          {filters.search && (
            <button
              onClick={() => filters.setSearch("")}
              style={{
                position: "absolute", right: 14, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", color: "#c8c0b4", padding: 4,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div
        className="nb-cat-scroll"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 100,
                border: active ? "1.5px solid #e8380d" : "1.5px solid #f0ede8",
                background: active ? "#e8380d" : "#fff",
                color: active ? "#fff" : "#555",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", fontFamily: "inherit",
                transition: "all 0.15s ease",
                boxShadow: active ? "0 4px 12px rgba(232,56,13,0.25)" : "none",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15 }}>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Sort */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "#fff", border: "1.5px solid #f0ede8",
          borderRadius: 10, padding: "7px 12px",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c8c0b4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>
          </svg>
          <select
            className="nb-select-clean"
            value={filters.sortBy}
            onChange={(e) => filters.setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Diet filter */}
        <div style={{
          display: "flex", background: "#fff",
          border: "1.5px solid #f0ede8", borderRadius: 10, overflow: "hidden",
        }}>
          {DIET.map((o, i) => (
            <button
              key={o.id}
              onClick={() => filters.setDietaryPreference(o.id)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600,
                background: filters.dietaryPreference === o.id ? "#e8380d" : "transparent",
                color: filters.dietaryPreference === o.id ? "#fff" : "#888",
                border: "none",
                borderRight: i < DIET.length - 1 ? "1px solid #f0ede8" : "none",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Rating filter */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#fff", border: "1.5px solid #f0ede8",
          borderRadius: 10, padding: "7px 12px",
        }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="#f6ad55">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <select
            className="nb-select-clean"
            value={filters.minimumRating}
            onChange={(e) => filters.setMinimumRating(e.target.value)}
          >
            <option value="all">Any rating</option>
            <option value="4.5">4.5+</option>
            <option value="4.2">4.2+</option>
            <option value="4">4.0+</option>
          </select>
        </div>

        {/* Distance indicator */}
        {locStatus === "granted" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 12px",
            background: "#f0fff4", border: "1.5px solid #c6f6d5",
            borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#276749",
          }}>
            📍 By distance
          </div>
        )}

        {/* Active filters count + clear */}
        <AnimatePresence>
          {filters.activeFilterCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              onClick={() => { filters.resetFilters(); setActiveCategory("all"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px",
                background: "#fff3f0", border: "1.5px solid #fcddd4",
                borderRadius: 10, color: "#e8380d",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {filters.activeFilterCount} filter{filters.activeFilterCount > 1 ? "s" : ""}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Result count */}
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "#c8c0b4" }}>
          {loading ? "Loading..." : `${filteredRestaurants.length} places`}
        </span>
      </div>

      {/* ── AI Recommendations (customer only) ── */}
      {isCustomer && user?._id && (
        <RecommendationsSection userId={user._id} />
      )}

      {/* ── Error State ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fff5f5", border: "1px solid #fecaca",
            borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <p style={{ fontSize: 13, color: "#c53030", fontWeight: 500, flex: 1 }}>{error}</p>
          <button
            onClick={loadDiscovery}
            style={{
              fontSize: 13, fontWeight: 700, color: "#e8380d",
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* ── Restaurant Grid ── */}
      {loading ? (
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredRestaurants.length > 0 ? (
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filteredRestaurants.map((r, i) => (
            <RestaurantCard key={r._id} restaurant={r} index={i} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "80px 24px", textAlign: "center",
          }}
        >
          <span style={{ fontSize: 52, marginBottom: 16 }}>🍽️</span>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#1c1c1c", marginBottom: 6 }}>
            No restaurants found
          </p>
          <p style={{ fontSize: 13, color: "#b0a898", marginBottom: 24 }}>
            Try adjusting your search or filters
          </p>
          <button
            onClick={() => { filters.resetFilters(); setActiveCategory("all"); }}
            style={{
              padding: "11px 28px",
              background: "#e8380d", color: "#fff",
              border: "none", borderRadius: 100,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(232,56,13,0.3)",
            }}
          >
            Clear all filters
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default RestaurantDiscoveryView;
