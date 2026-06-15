import { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import { appRoutes, getCustomerRestaurantRoute } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import { useRestaurantDiscovery } from "./useRestaurantDiscovery.js";

const CATEGORY_ICONS = {
  All: "&#127869;",
  Pizza: "&#127829;",
  Burger: "&#127828;",
  Biryani: "&#127835;",
  Healthy: "&#129367;",
  Chinese: "&#129379;",
  "South Indian": "&#129374;",
  Desserts: "&#127856;",
};

const DEFAULT_CATEGORIES = Object.keys(CATEGORY_ICONS);

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};

const Icon = ({ children, className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const SearchIcon = (props) => <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>;
const PinIcon = (props) => <Icon {...props}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
const ArrowIcon = (props) => <Icon {...props}><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></Icon>;
const ClockIcon = (props) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const CoinIcon = (props) => <Icon {...props}><ellipse cx="12" cy="6" rx="6" ry="3" /><path d="M6 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6" /><path d="M6 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6" /></Icon>;
const MealIcon = (props) => <Icon {...props}><path d="M5 7h14M6 7l1.2 14h9.6L18 7M9 7V4h6v3M9 12h6M10 16h4" /></Icon>;
const GameIcon = (props) => <Icon {...props}><path d="M8.5 6h7a6.5 6.5 0 0 1 6.2 8.4l-1.1 3.3a2.4 2.4 0 0 1-4.1.8L14.8 17H9.2l-1.7 1.5a2.4 2.4 0 0 1-4.1-.8l-1.1-3.3A6.5 6.5 0 0 1 8.5 6Z" /><path d="M7 11v4M5 13h4M16 12h.01M19 14h.01" /></Icon>;
const HeartIcon = ({ filled = false, className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);
const StarIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" />
  </svg>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getCuisineLine = (restaurant) =>
  (restaurant.cuisineType || []).slice(0, 3).join(", ") || restaurant.category || "Restaurant";

const getDistanceLabel = (restaurant) =>
  restaurant.distanceKm ? `${Number(restaurant.distanceKm).toFixed(1)} km` : "Nearby";

const buildCategories = (feed) => {
  const values = [...DEFAULT_CATEGORIES, ...(feed.categories || []).map((item) => item.name)].filter(Boolean);
  return [...new Set(values)].slice(0, 10);
};

const SearchBar = ({ value, onChange, onSubmit }) => (
  <form className="clean-search" onSubmit={onSubmit}>
    <SearchIcon className="h-5 w-5 shrink-0" />
    <input
      type="search"
      value={value}
      onChange={onChange}
      placeholder="Search restaurants, dishes or cuisines"
      aria-label="Search restaurants and dishes"
    />
    <button type="submit">Search</button>
  </form>
);

const Hero = ({
  firstName,
  restaurant,
  highlights,
  search,
  onSearchChange,
  onSearchSubmit,
  location,
  locationStatus,
  locationError,
  requestLocation,
  clearLocation,
}) => (
  <Motion.section {...fadeUp} className="clean-hero">
    <div className="clean-hero-copy">
      <p>{getGreeting()}, {firstName}</p>
      <h1>What would you like to eat today?</h1>
      <span>Discover real nearby restaurants with live menus and quick delivery.</span>
      <SearchBar value={search} onChange={onSearchChange} onSubmit={onSearchSubmit} />
      <button
        type="button"
        className="clean-location"
        onClick={locationStatus === "granted" ? clearLocation : requestLocation}
      >
        <PinIcon className="h-4 w-4" />
        <span>
          {locationStatus === "requesting"
            ? "Finding your location..."
            : locationStatus === "granted"
              ? location?.city || "Current location"
              : "Use current location"}
        </span>
        <ArrowIcon className="ml-auto h-4 w-4" />
      </button>
      {locationError ? <small className="clean-location-error">{locationError}</small> : null}
    </div>

    <div className="clean-hero-visual">
      {restaurant?.imageUrl ? (
        <img src={restaurant.imageUrl} alt={restaurant.name} />
      ) : (
        <div className="clean-hero-placeholder">{restaurant?.name?.charAt(0) || "N"}</div>
      )}
      <div className="clean-hero-overlay" />
      <div className="clean-featured">
        <small>Featured nearby</small>
        <strong>{restaurant?.name || "Local restaurants"}</strong>
        <span>{restaurant ? getCuisineLine(restaurant) : "Fresh menus near you"}</span>
        {restaurant?._id ? <Link to={getCustomerRestaurantRoute(restaurant._id)}>View menu <ArrowIcon className="h-4 w-4" /></Link> : null}
      </div>
      <div className="clean-live-stats">
        <div><strong>{highlights.activeRestaurantCount || 0}</strong><span>Restaurants</span></div>
        <div><strong>{highlights.availableDishCount || 0}</strong><span>Live dishes</span></div>
        <div><strong>{highlights.averageDeliveryTime || 30}m</strong><span>Avg delivery</span></div>
      </div>
    </div>
  </Motion.section>
);

const InfoCard = ({ icon, eyebrow, title, description, action, onClick, accent = false }) => (
  <Motion.button {...fadeUp} whileHover={{ y: -3 }} type="button" className={`clean-info-card ${accent ? "accent" : ""}`} onClick={onClick}>
    <span className="clean-info-icon">{icon}</span>
    <span className="clean-info-copy">
      <small>{eyebrow}</small>
      <strong>{title}</strong>
      <span>{description}</span>
    </span>
    <span className="clean-info-action">{action}<ArrowIcon className="h-4 w-4" /></span>
  </Motion.button>
);

const SectionHeading = ({ eyebrow, title, action }) => (
  <div className="clean-section-heading">
    <div><p>{eyebrow}</p><h2>{title}</h2></div>
    {action}
  </div>
);

const RestaurantCard = ({ restaurant, favorite, pending, onFavorite }) => (
  <Motion.article {...fadeUp} whileHover={{ y: -4 }} className="clean-restaurant-card">
    <div className="clean-restaurant-image">
      <Link to={getCustomerRestaurantRoute(restaurant._id)}>
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} loading="lazy" />
        ) : (
          <span>{restaurant.name?.charAt(0) || "N"}</span>
        )}
      </Link>
      <button
        type="button"
        className={`clean-favorite ${favorite ? "active" : ""}`}
        disabled={pending}
        onClick={() => onFavorite(restaurant)}
        aria-label={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
      >
        <HeartIcon filled={favorite} className="h-5 w-5" />
      </button>
      <span className="clean-rating"><StarIcon className="h-3.5 w-3.5" />{Number(restaurant.rating || 0).toFixed(1)}</span>
    </div>
    <Link to={getCustomerRestaurantRoute(restaurant._id)} className="clean-restaurant-copy">
      <div><h3>{restaurant.name}</h3><ArrowIcon className="h-4 w-4" /></div>
      <p>{getCuisineLine(restaurant)}</p>
      <span className="clean-meta">
        <span><ClockIcon className="h-4 w-4" />{restaurant.deliveryTime || 30} min</span>
        <span><PinIcon className="h-4 w-4" />{getDistanceLabel(restaurant)}</span>
      </span>
      <span className="clean-price">
        {restaurant.minimumItemPrice > 0 ? `Starts at ${formatCurrency(restaurant.minimumItemPrice)}` : "Live menu available"}
      </span>
    </Link>
  </Motion.article>
);

const DishCard = ({ dish }) => {
  const restaurant = dish.restaurant;
  if (!restaurant?._id) return null;
  return (
    <Motion.article {...fadeUp} whileHover={{ y: -3 }} className="clean-dish">
      <Link to={getCustomerRestaurantRoute(restaurant._id)}>
        <div>
          {dish.imageUrl ? <img src={dish.imageUrl} alt={dish.name} loading="lazy" /> : <span>{dish.name?.charAt(0) || "D"}</span>}
        </div>
        <strong>{dish.name}</strong>
        <small>{restaurant.name}</small>
        <p>{formatCurrency(dish.price)}</p>
      </Link>
    </Motion.article>
  );
};

const DecisionLab = ({ restaurants, dishes, onOpenRestaurant }) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [previewChoice, setPreviewChoice] = useState(null);
  const [randomRestaurant, setRandomRestaurant] = useState(restaurants[0] || null);
  const [randomizing, setRandomizing] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const randomIntervalRef = useRef(null);
  const randomTimeoutRef = useRef(null);

  const choices = useMemo(() => {
    const dishChoices = dishes.map((dish) => ({
      id: `dish-${dish._id}`,
      type: "Dish",
      name: dish.name,
      restaurant: dish.restaurant,
      imageUrl: dish.imageUrl,
      detail: dish.restaurant?.name,
    }));
    const restaurantChoices = restaurants.map((restaurant) => ({
      id: `restaurant-${restaurant._id}`,
      type: "Restaurant",
      name: restaurant.name,
      restaurant,
      imageUrl: restaurant.imageUrl,
      detail: getCuisineLine(restaurant),
    }));
    return [...dishChoices, ...restaurantChoices].slice(0, 12);
  }, [dishes, restaurants]);

  useEffect(() => {
    const randomRestaurantStillVisible = restaurants.some((restaurant) => restaurant._id === randomRestaurant?._id);
    if ((!randomRestaurant || !randomRestaurantStillVisible) && restaurants.length > 0) {
      setRandomRestaurant(restaurants[0]);
    }
  }, [randomRestaurant, restaurants]);

  useEffect(() => () => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(randomIntervalRef.current);
    window.clearTimeout(randomTimeoutRef.current);
  }, []);

  const spinWheel = () => {
    if (spinning || choices.length === 0) return;
    const result = choices[Math.floor(Math.random() * choices.length)];
    setSpinning(true);
    setWheelResult(null);
    setPreviewChoice(choices[Math.floor(Math.random() * choices.length)]);
    setRotation((current) => current + 1800 + Math.floor(Math.random() * 360));

    let previewIndex = Math.floor(Math.random() * choices.length);
    intervalRef.current = window.setInterval(() => {
      previewIndex = (previewIndex + 1) % choices.length;
      setPreviewChoice(choices[previewIndex]);
    }, 140);

    timeoutRef.current = window.setTimeout(() => {
      window.clearInterval(intervalRef.current);
      setPreviewChoice(result);
      setWheelResult(result);
      setSpinning(false);
    }, 2500);
  };

  const generateRestaurant = () => {
    if (restaurants.length === 0 || randomizing) return;
    const pool = randomRestaurant && restaurants.length > 1
      ? restaurants.filter((restaurant) => restaurant._id !== randomRestaurant._id)
      : restaurants;
    const result = pool[Math.floor(Math.random() * pool.length)];
    setRandomizing(true);

    let index = Math.floor(Math.random() * restaurants.length);
    randomIntervalRef.current = window.setInterval(() => {
      index = (index + 1) % restaurants.length;
      setRandomRestaurant(restaurants[index]);
    }, 130);

    randomTimeoutRef.current = window.setTimeout(() => {
      window.clearInterval(randomIntervalRef.current);
      setRandomRestaurant(result);
      setRandomizing(false);
    }, 1450);
  };

  return (
    <Motion.section {...fadeUp} className="clean-decision">
      <div className="clean-wheel-panel">
        <div className="clean-decision-copy">
          <p>Food decision wheel</p>
          <h2>Let the wheel choose your next bite.</h2>
          <span>It picks from real dishes and restaurants available near you right now.</span>
          <button type="button" onClick={spinWheel} disabled={spinning || choices.length === 0}>
            {spinning ? "Choosing..." : "Spin the wheel"}
          </button>
        </div>
        <div className="clean-wheel-wrap">
          <span className="clean-wheel-pointer" />
          <Motion.div
            className="clean-wheel"
            animate={{ rotate: rotation }}
            transition={{ duration: 2.5, ease: [0.12, 0.76, 0.16, 1] }}
          >
            <div className="clean-wheel-labels">
              {choices.slice(0, 8).map((choice, index) => (
                <span
                  key={choice.id}
                  className="clean-wheel-label"
                  style={{ transform: `rotate(${index * 45}deg) translateY(-68px) rotate(${-index * 45}deg)` }}
                >
                  {choice.name}
                </span>
              ))}
            </div>
            <span>SPIN</span>
          </Motion.div>
          <div className={`clean-choice-reel ${spinning ? "spinning" : ""}`}>
            <small>{previewChoice?.type || "Live choices"}</small>
            <strong>{previewChoice?.name || `${choices.length} real options loaded`}</strong>
          </div>
        </div>
        <div className={`clean-wheel-result ${wheelResult || spinning ? "visible" : ""}`}>
          <div>
            {(spinning ? previewChoice : wheelResult)?.imageUrl ? <img src={(spinning ? previewChoice : wheelResult).imageUrl} alt="" /> : <span>{(spinning ? previewChoice : wheelResult)?.name?.charAt(0) || "?"}</span>}
          </div>
          <small>{spinning ? "Checking live options..." : wheelResult?.type || "Your result"}</small>
          <strong>{(spinning ? previewChoice : wheelResult)?.name || "Spin to choose"}</strong>
          <p>{(spinning ? previewChoice : wheelResult)?.detail || "A nearby option will appear here."}</p>
          {!spinning && wheelResult?.restaurant?._id ? (
            <button type="button" onClick={() => onOpenRestaurant(wheelResult.restaurant)}>Open menu <ArrowIcon className="h-4 w-4" /></button>
          ) : null}
        </div>
      </div>

      <div className="clean-random-panel">
        <div className="clean-random-heading">
          <p>Random restaurant generator</p>
          <h2>Surprise me</h2>
          <span>One tap gives you a restaurant worth trying.</span>
        </div>
        <div className="clean-random-result">
          <div className="clean-random-image">
            {randomRestaurant?.imageUrl ? (
              <img src={randomRestaurant.imageUrl} alt={randomRestaurant.name} />
            ) : (
              <span>{randomRestaurant?.name?.charAt(0) || "N"}</span>
            )}
          </div>
          <div className="clean-random-copy">
            <small>Today's random pick</small>
            <strong>{randomRestaurant?.name || "Waiting for restaurants"}</strong>
            <p>{randomRestaurant ? getCuisineLine(randomRestaurant) : "Try again when restaurants are available."}</p>
            {randomRestaurant ? (
              <div>
                <span><StarIcon className="h-4 w-4" />{Number(randomRestaurant.rating || 0).toFixed(1)}</span>
                <span><ClockIcon className="h-4 w-4" />{randomRestaurant.deliveryTime || 30} min</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="clean-random-actions">
          <button type="button" onClick={generateRestaurant} disabled={randomizing}>{randomizing ? "Finding..." : "Pick another"}</button>
          {randomRestaurant?._id && !randomizing ? <button type="button" onClick={() => onOpenRestaurant(randomRestaurant)}>Open menu <ArrowIcon className="h-4 w-4" /></button> : null}
        </div>
      </div>
    </Motion.section>
  );
};

const RestaurantSkeleton = () => (
  <div className="clean-restaurant-grid">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="clean-restaurant-card p-3">
        <Skeleton className="h-52 rounded-[18px]" />
        <Skeleton className="mt-4 h-5 w-2/3" />
        <Skeleton className="mt-3 h-3 w-full" />
      </div>
    ))}
  </div>
);

const CustomerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite, isPending } = useFavorites();
  const { location, status: locationStatus, error: locationError, requestLocation, clearLocation } = useUserLocation();
  const { feed, loading, error, loadDiscovery, filters, filteredRestaurants } = useRestaurantDiscovery();
  const [activeCategory, setActiveCategory] = useState("All");
  const [tiffins, setTiffins] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.get("/tiffins"), api.get("/promos/active"), api.get("/orders/loyalty")])
      .then(([tiffinResult, promoResult, loyaltyResult]) => {
        if (!mounted) return;
        if (tiffinResult.status === "fulfilled") {
          const payload = tiffinResult.value?.data;
          setTiffins(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
        }
        if (promoResult.status === "fulfilled") setPromos(Array.isArray(promoResult.value?.data) ? promoResult.value.data : []);
        if (loyaltyResult.status === "fulfilled") setLoyalty(loyaltyResult.value?.data || null);
      });
    return () => { mounted = false; };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const categories = useMemo(() => buildCategories(feed), [feed]);
  const restaurants = useMemo(() => {
    const source = activeCategory === "All" && !filters.search.trim()
      ? (feed.featuredRestaurants?.length ? feed.featuredRestaurants : filteredRestaurants)
      : filteredRestaurants;
    return source.slice(0, 6);
  }, [activeCategory, feed.featuredRestaurants, filteredRestaurants, filters.search]);
  const heroRestaurant = restaurants.find((restaurant) => restaurant.imageUrl) || restaurants[0];
  const popularDishes = useMemo(() => (feed.popularDishes || []).filter((dish) => dish.restaurant?._id).slice(0, 5), [feed.popularDishes]);
  const tiffinMinPrice = useMemo(() => {
    const prices = tiffins.map((item) => Number(item.price || 0)).filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [tiffins]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = filters.search.trim();
    navigate(query ? `${appRoutes.customerSearch}?q=${encodeURIComponent(query)}` : appRoutes.customerSearch);
  };
  const handleCategory = (label) => {
    setActiveCategory(label);
    filters.setSelectedCuisine(label);
  };
  const handleFavorite = async (restaurant) => {
    try {
      await toggleFavorite(restaurant);
    } catch {
      // Favorites remain non-blocking on this screen.
    }
  };
  const promo = promos[0];
  const promoTitle = promo
    ? promo.discountType === "PERCENTAGE" ? `${promo.value}% off today` : `${formatCurrency(promo.value)} off today`
    : "Offers near you";

  return (
    <div className="clean-home">
      <style>{`
        .clean-home{--ink:#211915;--muted:#82766f;--orange:#ec4d16;--line:#eadbd0;width:100%;max-width:1260px;min-width:0;margin:0 auto;overflow-x:clip;color:var(--ink)}.clean-home *{min-width:0}.clean-home section{min-width:0}
        .clean-stack{display:grid;min-width:0;gap:34px}.clean-stack>*{min-width:0}.clean-hero{display:grid;min-width:0;overflow:hidden;border:1px solid #eadfd8;border-radius:28px;background:linear-gradient(135deg,#fff 0%,#fffaf5 100%);box-shadow:0 22px 55px -45px rgba(53,30,18,.55)}.clean-hero-copy{display:flex;min-width:0;flex-direction:column;justify-content:center;padding:28px}.clean-hero-copy>p{margin:0 0 9px;color:var(--orange);font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.clean-hero-copy h1{max-width:540px;margin:0;font-size:clamp(36px,5vw,60px);font-weight:900;line-height:1.02;letter-spacing:-.06em}.clean-hero-copy>span{max-width:500px;margin-top:16px;color:var(--muted);font-size:16px;font-weight:650;line-height:1.65}
        .clean-search{display:flex;align-items:center;gap:11px;margin-top:25px;padding:8px 8px 8px 16px;border:1px solid #ded3cc;border-radius:17px;background:#fff;color:#9d9189;box-shadow:0 14px 30px -25px rgba(49,27,15,.5)}.clean-search input{min-width:0;flex:1;border:0;outline:0;color:var(--ink);font-size:15px;font-weight:700}.clean-search input::placeholder{color:#a79c95}.clean-search button{height:44px;padding:0 20px;border:0;border-radius:12px;background:var(--orange);color:#fff;font-size:14px;font-weight:900;cursor:pointer}.clean-location{display:flex;align-items:center;gap:8px;margin-top:15px;border:0;background:transparent;color:#6d615a;font-size:13px;font-weight:850;cursor:pointer}.clean-location svg:first-child{color:var(--orange)}.clean-location-error{margin-top:7px;color:#c2413a;font-size:11px;font-weight:700}
        .clean-hero-visual{position:relative;min-height:300px;overflow:hidden;background:#ead9ca}.clean-hero-visual>img{width:100%;height:100%;object-fit:cover}.clean-hero-placeholder{display:grid;height:100%;min-height:300px;place-items:center;background:linear-gradient(145deg,#f0c5a5,#c96b39);color:#fff;font-size:90px;font-weight:900}.clean-hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(24,13,8,.84),transparent 72%)}.clean-featured{position:absolute;right:22px;bottom:88px;left:22px;color:#fff}.clean-featured small,.clean-featured strong,.clean-featured span{display:block}.clean-featured small{color:#ffcbaa;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.clean-featured strong{margin-top:5px;font-size:28px;font-weight:900}.clean-featured span{margin-top:4px;color:#e1d3ca;font-size:13px;font-weight:700}.clean-featured a{display:inline-flex;align-items:center;gap:6px;margin-top:13px;color:#fff;font-size:12px;font-weight:900;text-decoration:none}.clean-live-stats{position:absolute;right:14px;bottom:14px;left:14px;display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border-radius:14px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px)}.clean-live-stats div{padding:11px;border-right:1px solid #e8ddd5}.clean-live-stats div:last-child{border:0}.clean-live-stats strong,.clean-live-stats span{display:block}.clean-live-stats strong{font-size:15px;font-weight:900}.clean-live-stats span{margin-top:2px;color:#8c7f77;font-size:9px;font-weight:800;text-transform:uppercase}
        .clean-info-grid{display:grid;min-width:0;gap:14px}.clean-info-card{display:flex;min-width:0;align-items:center;gap:15px;overflow:hidden;border:1px solid var(--line);border-radius:20px;padding:19px;background:linear-gradient(135deg,#fff,#fffaf6);text-align:left;cursor:pointer;box-shadow:0 18px 40px -37px rgba(52,29,16,.5)}.clean-info-card:nth-child(2){background:linear-gradient(135deg,#fff,#f5fbf5)}.clean-info-card.accent{background:linear-gradient(135deg,#30221b,#1f1713);color:#fff;border-color:#241a15}.clean-info-icon{display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:15px;background:#fff0e7;color:var(--orange)}.clean-info-card.accent .clean-info-icon{background:rgba(255,255,255,.1);color:#ffae79}.clean-info-copy{min-width:0;flex:1}.clean-info-copy small,.clean-info-copy strong,.clean-info-copy span{display:block}.clean-info-copy small{color:var(--orange);font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.clean-info-card.accent small{color:#ffae79}.clean-info-copy strong{overflow:hidden;margin-top:4px;font-size:17px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.clean-info-copy span{overflow:hidden;margin-top:4px;color:#958880;font-size:12px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.clean-info-card.accent .clean-info-copy span{color:#bdb0a8}.clean-info-action{display:flex;align-items:center;gap:4px;flex:none;color:#c64113;font-size:12px;font-weight:900}.clean-info-card.accent .clean-info-action{color:#fff}
        .clean-section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:20px}.clean-section-heading p{margin:0 0 5px;color:var(--orange);font-size:11px;font-weight:900;letter-spacing:.17em;text-transform:uppercase}.clean-section-heading h2{margin:0;font-size:30px;font-weight:900;letter-spacing:-.045em}.clean-section-heading>a{color:#bd4014;font-size:13px;font-weight:900;text-decoration:none}
        .clean-cuisine-section,.clean-popular-section{min-width:0;border:1px solid rgba(234,219,208,.8);border-radius:24px;padding:22px}.clean-cuisine-section{background:linear-gradient(135deg,rgba(255,246,238,.9),rgba(255,251,247,.72))}.clean-popular-section{background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(255,247,239,.68))}
        .clean-categories{display:flex;width:100%;max-width:100%;gap:10px;overflow-x:auto;overscroll-behavior-inline:contain;padding:2px 2px 7px;scrollbar-width:none}.clean-categories::-webkit-scrollbar{display:none}.clean-categories button{display:flex;align-items:center;gap:8px;flex:none;border:1px solid var(--line);border-radius:999px;padding:12px 17px;background:#fff;color:#5f544e;font-size:13px;font-weight:900;cursor:pointer}.clean-categories button span{font-size:18px}.clean-categories button.active{border-color:#251b16;background:#251b16;color:#fff}
        .clean-decision{display:grid;min-width:0;gap:16px}.clean-wheel-panel,.clean-random-panel{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:25px;background:#fff}.clean-wheel-panel{display:grid;gap:20px;align-items:center;padding:25px;background:linear-gradient(135deg,#fffaf5 0%,#fff2e8 100%)}.clean-decision-copy p,.clean-random-heading p{margin:0;color:var(--orange);font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.clean-decision-copy h2,.clean-random-heading h2{margin:7px 0 0;font-size:28px;font-weight:900;letter-spacing:-.045em;line-height:1.08}.clean-decision-copy>span,.clean-random-heading>span{display:block;margin-top:8px;color:#85776f;font-size:13px;font-weight:700;line-height:1.55}.clean-decision-copy button{margin-top:17px;border:0;border-radius:13px;padding:12px 18px;background:#241a15;color:#fff;font-size:13px;font-weight:900;cursor:pointer}.clean-decision-copy button:disabled{opacity:.55}.clean-wheel-wrap{position:relative;width:210px;height:250px;margin:auto}.clean-wheel{position:relative;display:grid;width:210px;height:210px;place-items:center;border:9px solid #fff;border-radius:50%;background:conic-gradient(#f4511e 0 12.5%,#ffb74d 12.5% 25%,#4e342e 25% 37.5%,#ff8a65 37.5% 50%,#fdd835 50% 62.5%,#8d6e63 62.5% 75%,#ff7043 75% 87.5%,#ffca28 87.5% 100%);box-shadow:0 18px 35px -22px rgba(73,32,13,.65)}.clean-wheel:before{content:"";position:absolute;z-index:2;width:64px;height:64px;border:7px solid #fff;border-radius:50%;background:#241a15}.clean-wheel>span{position:relative;z-index:3;color:#fff;font-size:11px;font-weight:900;letter-spacing:.12em}.clean-wheel-labels{position:absolute;inset:0}.clean-wheel-label{position:absolute;z-index:1;top:50%;left:50%;width:64px;margin-top:-8px;margin-left:-32px;overflow:hidden;color:#fff;font-size:7px;font-weight:900;line-height:1;text-align:center;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.35);white-space:nowrap}.clean-wheel-pointer{position:absolute;z-index:4;top:-5px;left:50%;width:0;height:0;transform:translateX(-50%);border-right:11px solid transparent;border-left:11px solid transparent;border-top:0;border-bottom:22px solid #241a15}.clean-choice-reel{position:absolute;right:0;bottom:0;left:0;overflow:hidden;border:1px solid #ead4c5;border-radius:13px;padding:7px 10px;background:#fff;text-align:center;box-shadow:0 12px 25px -22px rgba(62,28,11,.7)}.clean-choice-reel small,.clean-choice-reel strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clean-choice-reel small{color:var(--orange);font-size:7px;font-weight:900;text-transform:uppercase}.clean-choice-reel strong{margin-top:2px;font-size:11px;font-weight:900}.clean-choice-reel.spinning{animation:choicePulse .28s ease-in-out infinite alternate}@keyframes choicePulse{to{transform:scale(1.025);border-color:#f29a70}}.clean-wheel-result{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:4px 13px;min-height:106px;border:1px solid #eadfd8;border-radius:18px;padding:13px;background:#fff;opacity:.75}.clean-wheel-result.visible{opacity:1}.clean-wheel-result>div{grid-row:span 4;width:68px;height:68px;overflow:hidden;border-radius:14px;background:#f2d5c0}.clean-wheel-result img{width:100%;height:100%;object-fit:cover}.clean-wheel-result>div>span{display:grid;height:100%;place-items:center;color:#cf6633;font-size:28px;font-weight:900}.clean-wheel-result small{color:var(--orange);font-size:9px;font-weight:900;text-transform:uppercase}.clean-wheel-result strong{overflow:hidden;font-size:15px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.clean-wheel-result p{overflow:hidden;margin:0;color:#8b7e76;font-size:11px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.clean-wheel-result button{display:flex;align-items:center;gap:5px;width:max-content;max-width:100%;border:0;background:transparent;color:#be4014;font-size:11px;font-weight:900;cursor:pointer}
        .clean-random-panel{display:flex;flex-direction:column;padding:25px;background:#241a15;color:#fff}.clean-random-heading p{color:#ffae79}.clean-random-heading>span{color:#bfb2aa}.clean-random-result{display:flex;align-items:center;gap:15px;margin-top:22px;padding:13px;border-radius:19px;background:rgba(255,255,255,.08)}.clean-random-image{width:86px;height:86px;flex:none;overflow:hidden;border-radius:16px;background:#d88a60}.clean-random-image img{width:100%;height:100%;object-fit:cover}.clean-random-image>span{display:grid;height:100%;place-items:center;font-size:35px;font-weight:900}.clean-random-copy{min-width:0}.clean-random-copy small,.clean-random-copy strong,.clean-random-copy p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clean-random-copy small{color:#ffae79;font-size:9px;font-weight:900;text-transform:uppercase}.clean-random-copy strong{margin-top:4px;font-size:18px;font-weight:900}.clean-random-copy p{margin:4px 0 8px;color:#bfb2aa;font-size:11px;font-weight:700}.clean-random-copy>div{display:flex;gap:11px;color:#eee5df;font-size:10px;font-weight:800}.clean-random-copy>div span{display:flex;align-items:center;gap:4px}.clean-random-copy>div span:first-child{color:#ffd36b}.clean-random-actions{display:flex;gap:9px;margin-top:auto;padding-top:20px}.clean-random-actions button{display:flex;align-items:center;justify-content:center;gap:5px;flex:1;border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:11px;background:transparent;color:#fff;font-size:11px;font-weight:900;cursor:pointer}.clean-random-actions button:last-child{border-color:#fff;background:#fff;color:#241a15}
        .clean-dish-row{display:flex;width:100%;max-width:100%;gap:14px;overflow-x:auto;overscroll-behavior-inline:contain;padding:2px 1px 8px;scrollbar-width:none}.clean-dish-row::-webkit-scrollbar{display:none}.clean-dish{min-width:180px;max-width:230px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:linear-gradient(180deg,#fff,#fffaf7)}.clean-dish a{display:block;color:inherit;text-decoration:none}.clean-dish a>div{height:135px;overflow:hidden;background:#f0d3bd}.clean-dish img{width:100%;height:100%;object-fit:cover}.clean-dish a>div>span{display:grid;height:100%;place-items:center;color:#ce6534;font-size:38px;font-weight:900}.clean-dish strong,.clean-dish small,.clean-dish p{display:block;overflow:hidden;margin-right:14px;margin-left:14px;text-overflow:ellipsis;white-space:nowrap}.clean-dish strong{margin-top:13px;font-size:14px;font-weight:900}.clean-dish small{margin-top:3px;color:#91847c;font-size:11px;font-weight:700}.clean-dish p{margin-top:10px;margin-bottom:14px;color:#c94113;font-size:13px;font-weight:900}
        .clean-restaurant-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.clean-restaurant-card{overflow:hidden;border:1px solid var(--line);border-radius:22px;background:#fff;box-shadow:0 18px 42px -38px rgba(51,28,15,.65)}.clean-restaurant-image{position:relative;height:170px;overflow:hidden;background:#f0d1b8}.clean-restaurant-image>a{display:block;height:100%}.clean-restaurant-image img{width:100%;height:100%;object-fit:cover;transition:transform .35s}.clean-restaurant-card:hover img{transform:scale(1.035)}.clean-restaurant-image>a>span{display:grid;height:100%;place-items:center;color:#cb6534;font-size:50px;font-weight:900}.clean-favorite{position:absolute;right:10px;top:10px;display:grid;width:38px;height:38px;place-items:center;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#766a63;cursor:pointer;box-shadow:0 5px 14px rgba(0,0,0,.12)}.clean-favorite.active{color:#dd4545}.clean-rating{position:absolute;right:10px;bottom:10px;display:flex;align-items:center;gap:3px;border-radius:999px;padding:6px 9px;background:#fff;color:#14804a;font-size:11px;font-weight:900}.clean-restaurant-copy{display:block;padding:17px;color:inherit;text-decoration:none}.clean-restaurant-copy>div{display:flex;align-items:center;gap:7px}.clean-restaurant-copy h3{overflow:hidden;flex:1;margin:0;font-size:17px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.clean-restaurant-copy>div svg{color:#bd4115}.clean-restaurant-copy p{overflow:hidden;margin:6px 0 11px;color:#8c7f77;font-size:12px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.clean-meta{display:flex;gap:12px;color:#665b55;font-size:11px;font-weight:850}.clean-meta span{display:flex;align-items:center;gap:4px}.clean-price{display:block;margin-top:13px;padding-top:11px;border-top:1px solid #f0e7e1;color:#c74314;font-size:12px;font-weight:900}.clean-empty{padding:30px;border:1px dashed #e1d4cb;border-radius:20px;background:#fff;text-align:center}.clean-empty h3{margin:0;font-size:17px;font-weight:900}.clean-empty p{margin:6px 0 16px;color:#8e8179;font-size:13px;font-weight:700}
        @media(min-width:700px){.clean-stack{gap:44px}.clean-hero{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);min-height:410px}.clean-hero-copy{padding:42px}.clean-hero-visual{min-height:410px}.clean-info-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.clean-decision{grid-template-columns:minmax(0,1.45fr) minmax(280px,.8fr)}.clean-wheel-panel{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto}.clean-wheel-result{grid-column:1/-1}.clean-restaurant-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.clean-restaurant-image{height:225px}.clean-dish{min-width:205px}.clean-dish a>div{height:155px}}
        @media(min-width:1100px){.clean-restaurant-image{height:235px}.clean-dish-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:visible}.clean-dish{min-width:0;max-width:none}}
        @media(max-width:430px){.clean-stack{gap:32px}.clean-hero{border-radius:23px}.clean-hero-copy{padding:23px 17px}.clean-hero-visual{min-height:260px}.clean-hero-placeholder{min-height:260px}.clean-search button{height:38px;padding:0 13px}.clean-live-stats{right:9px;bottom:9px;left:9px}.clean-info-card{padding:14px}.clean-info-action{display:none}.clean-info-copy strong{font-size:14px}.clean-info-copy span{font-size:10px}.clean-section-heading h2{font-size:24px}.clean-decision-copy h2,.clean-random-heading h2{font-size:24px}.clean-wheel-panel,.clean-random-panel{padding:20px}.clean-wheel-wrap{width:170px;height:170px}.clean-restaurant-image{height:145px}.clean-restaurant-copy h3{font-size:14px}.clean-restaurant-copy p,.clean-meta,.clean-price{font-size:10px}}
      `}</style>

      <div className="clean-stack">
        <Hero
          firstName={firstName}
          restaurant={heroRestaurant}
          highlights={feed.highlights || {}}
          search={filters.search}
          onSearchChange={(event) => filters.setSearch(event.target.value)}
          onSearchSubmit={handleSearch}
          location={location}
          locationStatus={locationStatus}
          locationError={locationError}
          requestLocation={requestLocation}
          clearLocation={clearLocation}
        />

        <section className="clean-info-grid">
          <InfoCard
            icon={<CoinIcon className="h-5 w-5" />}
            eyebrow={`${String(loyalty?.tier || "Bronze").toLowerCase()} member`}
            title={`${Number(loyalty?.points || 0).toLocaleString()} NearCoins`}
            description="Your rewards and redemption balance"
            action="View"
            onClick={() => navigate(appRoutes.customerProfile)}
          />
          <InfoCard
            icon={<MealIcon className="h-5 w-5" />}
            eyebrow={`${tiffins.length || 0} providers`}
            title="Daily tiffin plans"
            description={tiffinMinPrice ? `Home-style meals from ${formatCurrency(tiffinMinPrice)}` : "Fresh home-style meals delivered daily"}
            action="Explore"
            onClick={() => navigate(appRoutes.customerTiffin)}
          />
          <InfoCard
            accent
            icon={<GameIcon className="h-5 w-5" />}
            eyebrow={promo?.code || "NearBites extras"}
            title={promoTitle}
            description="Offers, food games and NearCoins rewards"
            action="Open"
            onClick={() => navigate(promos.length ? appRoutes.customerSearch : appRoutes.customerGames)}
          />
        </section>

        <section className="clean-cuisine-section">
          <SectionHeading eyebrow="Browse by cuisine" title="What are you craving?" />
          <div className="clean-categories">
            {categories.map((label) => (
              <button key={label} type="button" className={activeCategory === label ? "active" : ""} onClick={() => handleCategory(label)}>
                <span dangerouslySetInnerHTML={{ __html: CATEGORY_ICONS[label] || "&#127860;" }} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <DecisionLab
          restaurants={restaurants}
          dishes={popularDishes}
          onOpenRestaurant={(restaurant) => navigate(getCustomerRestaurantRoute(restaurant._id))}
        />

        {popularDishes.length > 0 ? (
          <section className="clean-popular-section">
            <SectionHeading eyebrow="Popular right now" title="People nearby are ordering" action={<Link to={appRoutes.customerSearch}>See all</Link>} />
            <div className="clean-dish-row">{popularDishes.map((dish) => <DishCard key={dish._id} dish={dish} />)}</div>
          </section>
        ) : null}

        <section id="restaurants">
          <SectionHeading
            eyebrow={`${feed.highlights?.activeRestaurantCount || restaurants.length} restaurants open`}
            title={activeCategory === "All" ? "Restaurants near you" : `${activeCategory} near you`}
            action={<Link to={appRoutes.customerSearch}>See all</Link>}
          />
          {loading ? (
            <RestaurantSkeleton />
          ) : error ? (
            <div className="clean-empty"><h3>Restaurants could not load</h3><p>{error}</p><Button onClick={loadDiscovery}>Retry</Button></div>
          ) : restaurants.length ? (
            <div className="clean-restaurant-grid">
              {restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant._id}
                  restaurant={restaurant}
                  favorite={favoriteIds.includes(String(restaurant._id))}
                  pending={isPending(restaurant._id)}
                  onFavorite={handleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="clean-empty"><h3>No restaurants found</h3><p>Try another cuisine or search.</p><Button onClick={() => handleCategory("All")}>Show all</Button></div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CustomerHome;
