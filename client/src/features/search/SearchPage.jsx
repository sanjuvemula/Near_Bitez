import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCustomerRestaurantRoute } from "../../app/routes.jsx";
import { api } from "../../services/api.js";
import { useCart } from "../../hooks/useCart.js";
import { formatCurrency } from "../../utils/formatters.js";
import { toast } from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div
    style={{
      display: "flex",
      gap: 12,
      padding: "14px 16px",
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #f0ede8",
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 10,
        background:
          "linear-gradient(90deg,#f5f3f0 25%,#eceae6 50%,#f5f3f0 75%)",
        backgroundSize: "200% 100%",
        animation: "nb-shimmer 1.4s infinite",
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1 }}>
      <div
        style={{
          height: 13,
          background: "#f0ede8",
          borderRadius: 100,
          width: "55%",
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 10,
          background: "#f0ede8",
          borderRadius: 100,
          width: "75%",
        }}
      />
    </div>
    <style>{`@keyframes nb-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

// ─── Restaurant Result Row ────────────────────────────────────────────────────
const RestaurantRow = ({ restaurant, index }) => {
  const rating = Number(restaurant.rating || 0);
  const ratingBg =
    rating >= 4.5 ? "#16a34a" : rating >= 4 ? "#d97706" : "#9ca3af";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link
        to={getCustomerRestaurantRoute(restaurant._id)}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 16px",
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #f0ede8",
            alignItems: "center",
            transition: "all 0.18s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              "0 4px 18px rgba(232,56,13,0.1)";
            e.currentTarget.style.borderColor = "#fcd4c4";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = "#f0ede8";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Image */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              overflow: "hidden",
              background: "linear-gradient(135deg, #fde8d8, #fcebd0)",
              flexShrink: 0,
            }}
          >
            {restaurant.imageUrl ? (
              <img
                src={restaurant.imageUrl}
                alt={restaurant.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#f4b98f",
                }}
              >
                {restaurant.name?.[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#1c1c1c",
                marginBottom: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {restaurant.name}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#b0a898",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {(restaurant.cuisineType || []).join(", ") ||
                restaurant.category}
            </p>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                background: ratingBg,
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              ⭐ {rating.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, color: "#b0a898", fontWeight: 600 }}>
              {restaurant.deliveryTime || 30} min
            </span>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d4cfc8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
};

// ─── Dish Result Row ──────────────────────────────────────────────────────────
const DishRow = ({ dish, index, onAdd, loadingId }) => {
  const isPending = loadingId === dish._id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link
        to={getCustomerRestaurantRoute(dish.restaurant._id)}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 16px",
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #f0ede8",
            alignItems: "center",
            transition: "all 0.18s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              "0 4px 18px rgba(232,56,13,0.1)";
            e.currentTarget.style.borderColor = "#fcd4c4";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = "#f0ede8";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Veg dot */}
          <div
            style={{
              width: 16,
              height: 16,
              border: `2px solid ${dish.isVeg ? "#16a34a" : "#dc2626"}`,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: dish.isVeg ? "#16a34a" : "#dc2626",
              }}
            />
          </div>

          {/* Dish image */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff7ed",
              flexShrink: 0,
            }}
          >
            {dish.imageUrl ? (
              <img
                src={dish.imageUrl}
                alt={dish.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 20,
                }}
              >
                🍽️
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#1c1c1c",
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {dish.name}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#b0a898",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {dish.restaurant.name} · {dish.category}
            </p>
          </div>

          {/* Price + add */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 900, color: "#e8380d" }}
            >
              {formatCurrency(dish.price)}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd(dish);
              }}
              disabled={isPending}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: isPending ? "#f3f4f6" : "#ea580c",
                color: "#fff",
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {isPending ? (
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: "2px solid #ea580c",
                    borderTopColor: "transparent",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                "+"
              )}
            </button>
          </div>
        </div>
      </Link>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, label, count }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      marginTop: 4,
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    <h2
      style={{
        fontSize: 15,
        fontWeight: 800,
        color: "#1c1c1c",
        margin: 0,
        letterSpacing: "-0.01em",
      }}
    >
      {label}
    </h2>
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#b0a898",
        background: "#f5f3f0",
        padding: "2px 8px",
        borderRadius: 100,
      }}
    >
      {count}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const debouncedQuery = useDebounce(query, 350);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [loadingDishId, setLoadingDishId] = useState("");
  const navigate = useNavigate();
  const { addItem } = useCart();
  const inputRef = useRef(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync URL with query
  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery }, { replace: true });
    }
  }, [debouncedQuery]);

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    api
      .get(
        `/search?q=${encodeURIComponent(debouncedQuery)}&type=${activeTab}`
      )
      .then((r) => setResults(r.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery, activeTab]);

  const handleAddDish = useCallback(
    async (dish) => {
      setLoadingDishId(dish._id);
      try {
        await addItem({ menuItemId: dish._id, quantity: 1 });
        toast.success(`${dish.name} added! 🛒`, {
          style: { borderRadius: "12px" },
        });
      } catch (err) {
        if (err.code === "CART_RESTAURANT_MISMATCH") {
          const ok = window.confirm(
            "Your cart has items from another restaurant. Replace?"
          );
          if (ok) {
            await addItem({ menuItemId: dish._id, quantity: 1, replaceCart: true });
            toast.success("Cart updated!");
          }
        } else {
          toast.error(err.message || "Could not add item");
        }
      } finally {
        setLoadingDishId("");
      }
    },
    [addItem]
  );

  const tabs = [
    { id: "all", label: "All" },
    { id: "restaurants", label: "Restaurants" },
    { id: "dishes", label: "Dishes" },
  ];

  const hasResults =
    results &&
    (results.restaurants?.length > 0 || results.dishes?.length > 0);

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#b0a898",
            marginBottom: 4,
          }}
        >
          Search
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#1c1c1c",
            margin: 0,
            letterSpacing: "-0.025em",
          }}
        >
          Find anything 🔍
        </h1>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c8c0b4"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Restaurants, dishes, cuisines..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "15px 48px 15px 48px",
            background: "#fff",
            border: "2px solid #f0ede8",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 500,
            color: "#1c1c1c",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#e8380d";
            e.target.style.boxShadow = "0 0 0 4px rgba(232,56,13,0.07)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#f0ede8";
            e.target.style.boxShadow = "none";
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#c8c0b4",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      {query.length >= 2 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            background: "#fff",
            border: "1.5px solid #f0ede8",
            borderRadius: 14,
            padding: 5,
            width: "fit-content",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "7px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                fontFamily: "inherit",
                transition: "all 0.15s",
                background:
                  activeTab === tab.id ? "#ea580c" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#888",
                boxShadow:
                  activeTab === tab.id
                    ? "0 2px 10px rgba(234,88,12,0.28)"
                    : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Empty query */}
      {!query && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "60px 24px" }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🍽️</div>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1c1c1c",
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }}
          >
            Search NearBitez
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#b0a898",
              lineHeight: 1.6,
              maxWidth: 300,
              margin: "0 auto",
            }}
          >
            Find restaurants, specific dishes, or cuisines across the entire
            platform
          </p>

          {/* Quick searches */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            {[
              "Biryani",
              "Pizza",
              "Burger",
              "Chinese",
              "South Indian",
              "Desserts",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                style={{
                  padding: "8px 16px",
                  background: "#fff",
                  border: "1.5px solid #f0ede8",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#555",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#e8380d";
                  e.currentTarget.style.color = "#e8380d";
                  e.currentTarget.style.background = "#fff3f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#f0ede8";
                  e.currentTarget.style.color = "#555";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* No results */}
      {!loading && query.length >= 2 && results && !hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "60px 24px" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1c1c1c",
              marginBottom: 8,
            }}
          >
            No results for "{query}"
          </p>
          <p style={{ fontSize: 13, color: "#b0a898" }}>
            Try different keywords or browse all restaurants
          </p>
          <button
            onClick={() => navigate("/app")}
            style={{
              marginTop: 20,
              padding: "10px 24px",
              background: "#ea580c",
              color: "#fff",
              border: "none",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Browse all restaurants
          </button>
        </motion.div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Total count */}
          <p style={{ fontSize: 13, color: "#b0a898", fontWeight: 600 }}>
            {results.total} result{results.total !== 1 ? "s" : ""} for "
            {results.query}"
          </p>

          {/* Restaurants section */}
          {(activeTab === "all" || activeTab === "restaurants") &&
            results.restaurants?.length > 0 && (
              <div>
                <SectionHeader
                  icon="🏪"
                  label="Restaurants"
                  count={results.restaurants.length}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.restaurants.map((r, i) => (
                    <RestaurantRow key={r._id} restaurant={r} index={i} />
                  ))}
                </div>
              </div>
            )}

          {/* Dishes section */}
          {(activeTab === "all" || activeTab === "dishes") &&
            results.dishes?.length > 0 && (
              <div>
                <SectionHeader
                  icon="🍽️"
                  label="Dishes"
                  count={results.dishes.length}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.dishes.map((d, i) => (
                    <DishRow
                      key={d._id}
                      dish={d}
                      index={i}
                      onAdd={handleAddDish}
                      loadingId={loadingDishId}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;