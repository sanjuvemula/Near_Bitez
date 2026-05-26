import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { appRoutes, getRestaurantRoute } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { formatCurrency } from "../../utils/formatters.js";

const RestaurantCard = ({ restaurant, compact = false, index = 0 }) => {
  const { user } = useAuth();
  const { isFavorite, isPending, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const rating = Number(restaurant.rating || 0);
  const distanceLabel = restaurant.distanceKm
    ? `${Number(restaurant.distanceKm).toFixed(1)} km`
    : "Nearby";

  const ratingBg =
    rating >= 4.5 ? "#48bb78" : rating >= 4.0 ? "#ed8936" : "#a0aec0";

  const isOpen = restaurant.isOpen !== false;

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !["customer", "admin"].includes(user.role)) {
      navigate(appRoutes.customerLogin, { state: { from: location } });
      return;
    }
    try {
      const next = await toggleFavorite(restaurant);
      toast.success(next ? "Added to favorites" : "Removed from favorites", {
        style: { borderRadius: "10px", fontWeight: 600, fontSize: "13px" },
      });
    } catch (err) {
      toast.error(err.message || "Unable to update");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link
        to={getRestaurantRoute(user, restaurant._id)}
        className="group block"
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid #efefef",
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
            e.currentTarget.style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* ── Image ── */}
          <div
            style={{
              position: "relative",
              height: compact ? 168 : 196,
              background: "linear-gradient(135deg, #fde8d8, #fcebd0)",
              overflow: "hidden",
            }}
          >
            {restaurant.imageUrl ? (
              <img
                src={restaurant.imageUrl}
                alt={restaurant.name}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.4s ease",
                  display: "block",
                }}
                className="group-hover:scale-105"
              />
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%",
              }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: "#f4b98f", userSelect: "none" }}>
                  {restaurant.name?.slice(0, 1)}
                </span>
              </div>
            )}

            {/* Subtle bottom gradient */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 40%, transparent 70%)",
            }} />

            {/* Closed overlay */}
            {!isOpen && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  background: "#fff",
                  color: "#e53e3e",
                  fontSize: 11, fontWeight: 800,
                  padding: "5px 14px", borderRadius: 100,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Closed
                </span>
              </div>
            )}

            {/* Category badge — top left */}
            {restaurant.category && (
              <span style={{
                position: "absolute", top: 10, left: 10,
                background: "rgba(0,0,0,0.48)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                fontSize: 10, fontWeight: 700,
                padding: "3px 10px", borderRadius: 100,
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                {restaurant.category}
              </span>
            )}

            {/* Favorite — top right */}
            <motion.button
              type="button"
              onClick={handleFavorite}
              disabled={isPending(restaurant._id)}
              whileTap={{ scale: 0.85 }}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 34, height: 34,
                borderRadius: "50%",
                background: "#fff",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                transition: "transform 0.15s",
              }}
              aria-label="Toggle favorite"
            >
              {isPending(restaurant._id) ? (
                <span style={{
                  width: 12, height: 12,
                  borderRadius: "50%",
                  border: "2px solid #e8380d",
                  borderTopColor: "transparent",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24"
                  fill={isFavorite(restaurant._id) ? "#e53e3e" : "none"}
                  stroke={isFavorite(restaurant._id) ? "#e53e3e" : "#aaa"}
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              )}
            </motion.button>

            {/* Restaurant name on image */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px 12px" }}>
              <h3 style={{
                fontSize: 16, fontWeight: 800,
                color: "#fff", lineHeight: 1.25,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}>
                {restaurant.name}
              </h3>
            </div>
          </div>

          {/* ── Card Body ── */}
          <div style={{ padding: "12px 14px 14px" }}>

            {/* Cuisine tags */}
            {(restaurant.cuisineType || []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {(restaurant.cuisineType || []).slice(0, 3).map((c) => (
                  <span key={c} style={{
                    fontSize: 10, fontWeight: 700,
                    color: "#888",
                    background: "#f5f5f5",
                    padding: "3px 8px", borderRadius: 100,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div style={{
              display: "flex", alignItems: "center",
              gap: 0,
              borderTop: "1px solid #f5f5f5",
              paddingTop: 10,
            }}>
              {/* Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 12 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: ratingBg,
                  color: "#fff",
                  fontSize: 11, fontWeight: 800,
                  padding: "3px 8px", borderRadius: 6,
                }}>
                  <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {rating.toFixed(1)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 14, background: "#efefef", marginRight: 12 }} />

              {/* Time */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 12 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                  {restaurant.deliveryTime || 30} min
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 14, background: "#efefef", marginRight: 12 }} />

              {/* Distance */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{distanceLabel}</span>
              </div>

              {/* Price — right */}
              <div style={{ marginLeft: "auto" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>
                  {restaurant.minimumItemPrice > 0
                    ? `from ${formatCurrency(restaurant.minimumItemPrice)}`
                    : restaurant.priceBand || ""}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 10,
            }}>
              <span style={{ fontSize: 11, color: "#bbb", fontWeight: 500 }}>
                {restaurant.isVegOnly ? "🥦 Pure Veg" : "Veg & Non-veg"}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: "#e8380d",
                display: "flex", alignItems: "center", gap: 3,
                transition: "gap 0.15s",
              }}
                className="group-hover:gap-2"
              >
                Order now
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .group:hover img { transform: scale(1.05); }
      `}</style>
    </motion.div>
  );
};

export default RestaurantCard;
