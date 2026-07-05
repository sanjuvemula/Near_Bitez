import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import { appRoutes } from "../../app/routes.jsx";
import RestaurantCard from "./RestaurantCard.jsx";
import { useRestaurantDiscovery } from "./useRestaurantDiscovery.js";

const FALLBACK_CUISINES = [
  "All",
  "Biryani",
  "Pizza",
  "Burger",
  "Chinese",
  "South Indian",
  "Desserts",
  "Healthy",
];

const ArrowIcon = ({ direction = "right", className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === "left" ? (
      <>
        <path d="M19 12H5" />
        <path d="m10 17-5-5 5-5" />
      </>
    ) : (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    )}
  </svg>
);

const SearchIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const CheckIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ClockIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const PinIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const StatTile = ({ label, value, tone = "orange" }) => {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "sky"
      ? "bg-sky-50 text-sky-700"
      : "bg-orange-50 text-orange-700";

  return (
    <div className="min-w-0 rounded-[20px] border border-[#efe6dc] bg-white/90 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.5)]">
      <span className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${toneClass}`}>
        {label}
      </span>
      <strong className="block truncate text-2xl font-black text-stone-950">{value}</strong>
    </div>
  );
};

const SignalPill = ({ children, tone = "orange" }) => {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "sky"
      ? "border-sky-100 bg-sky-50 text-sky-700"
      : "border-orange-100 bg-orange-50 text-orange-700";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${toneClass}`}>
      <CheckIcon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
};

const FeatureCard = ({ eyebrow, title, text, tone = "orange" }) => {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-600 text-white shadow-[0_24px_55px_-35px_rgba(5,150,105,0.7)]"
      : tone === "sky"
      ? "bg-sky-600 text-white shadow-[0_24px_55px_-35px_rgba(2,132,199,0.7)]"
      : "bg-stone-950 text-white shadow-[0_24px_55px_-35px_rgba(28,25,23,0.8)]";

  return (
    <article className={`rounded-[22px] p-5 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{eyebrow}</p>
      <h3 className="mt-3 text-lg font-black leading-tight">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-white/74">{text}</p>
    </article>
  );
};

const getCuisineLine = (restaurant) =>
  (restaurant?.cuisineType || []).slice(0, 2).join(", ") || restaurant?.category || "Live menu";

const getDistanceLabel = (restaurant) =>
  restaurant?.distanceKm ? `${Number(restaurant.distanceKm).toFixed(1)} km` : "Nearby";

const RestaurantPreview = ({ restaurants, highlights }) => {
  const previewRestaurants = restaurants.slice(0, 3);
  const featured = previewRestaurants[0];

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[32px] border border-[#ede1d5] bg-white/88 p-4 shadow-[0_35px_90px_-58px_rgba(15,23,42,0.55)] backdrop-blur">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(251,146,60,0.2),transparent_30%),radial-gradient(circle_at_90%_12%,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,237,0.64))]" />
      <div className="relative rounded-[24px] border border-white/80 bg-white/86 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
              Live nearby
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">
              {featured?.name || "Local kitchens"}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Open now
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {previewRestaurants.length ? (
            previewRestaurants.map((restaurant, index) => (
              <div
                key={restaurant._id}
                className="grid grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-[18px] border border-[#f0e6dc] bg-white px-3 py-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.55)]"
              >
                <span
                  className={[
                    "grid h-11 w-11 place-items-center rounded-[16px] text-sm font-black text-white",
                    index === 0 ? "bg-orange-600" : index === 1 ? "bg-sky-600" : "bg-emerald-600",
                  ].join(" ")}
                >
                  {restaurant.name?.charAt(0) || "N"}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-black text-stone-950">{restaurant.name}</strong>
                  <span className="mt-0.5 flex items-center gap-2 text-xs font-bold text-stone-500">
                    <PinIcon className="h-3.5 w-3.5 text-orange-500" />
                    <span className="truncate">{getCuisineLine(restaurant)}</span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-black text-stone-700">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {restaurant.deliveryTime || highlights.averageDeliveryTime || 30}m
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#eadfd4] bg-white/84 p-5 text-sm font-bold leading-6 text-stone-500">
              Live restaurant previews will appear here as soon as discovery data loads.
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 overflow-hidden rounded-[22px] border border-[#eadfd4] bg-stone-950 text-white">
        <div className="border-r border-white/10 p-4">
          <strong className="block text-lg font-black">{highlights.activeRestaurantCount || restaurants.length || 0}</strong>
          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.14em] text-white/54">Restaurants</span>
        </div>
        <div className="border-r border-white/10 p-4">
          <strong className="block text-lg font-black">{highlights.availableDishCount || 0}</strong>
          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.14em] text-white/54">Dishes</span>
        </div>
        <div className="p-4">
          <strong className="block text-lg font-black">
            {featured ? getDistanceLabel(featured) : "Near"}
          </strong>
          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.14em] text-white/54">Distance</span>
        </div>
      </div>
    </div>
  );
};

const PublicHome = () => {
  const { feed, loading, error, loadDiscovery, filters, filteredRestaurants } = useRestaurantDiscovery();
  const cuisineRef = useRef(null);

  const cuisines = useMemo(() => {
    const live = filters.cuisineOptions?.length ? filters.cuisineOptions : [];
    return [...new Set([...FALLBACK_CUISINES, ...live])].slice(0, 12);
  }, [filters.cuisineOptions]);

  const visibleRestaurants = useMemo(() => {
    const source = filters.search.trim()
      ? filteredRestaurants
      : feed.featuredRestaurants?.length
      ? feed.featuredRestaurants
      : filteredRestaurants;
    return source.slice(0, 6);
  }, [feed.featuredRestaurants, filteredRestaurants, filters.search]);

  const scrollCuisines = (direction) => {
    cuisineRef.current?.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  const selectCuisine = (cuisine) => {
    filters.setSelectedCuisine(cuisine);
  };

  const highlights = feed.highlights || {};

  return (
    <div className="space-y-10">
      <section className="relative -mx-4 overflow-hidden border-y border-[#eadfd4] bg-[#fffaf5] px-4 py-8 sm:-mx-6 sm:px-8 lg:-mx-8 lg:rounded-[32px] lg:border lg:px-10 lg:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(251,146,60,0.24),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.14),transparent_26%),radial-gradient(circle_at_70%_86%,rgba(16,185,129,0.13),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,247,237,0.88))]" />
        <div className="relative grid min-h-[540px] gap-8 lg:grid-cols-[minmax(0,1.04fr),minmax(360px,0.96fr)] lg:items-center">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <SignalPill>Fresh local food</SignalPill>
              <SignalPill tone="sky">Live menus</SignalPill>
              <SignalPill tone="emerald">Quick ordering</SignalPill>
            </div>

            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
              NearBitez
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-black leading-none tracking-normal text-stone-950 sm:text-6xl lg:text-7xl">
              Your next meal should feel this easy.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-stone-600 sm:text-lg">
              Browse nearby restaurants, compare live menus, and sign in only when you are ready to order.
            </p>

            <form
              className="mt-7 flex max-w-2xl items-center gap-3 rounded-[22px] border border-[#e9ded4] bg-white/95 p-2 text-stone-950 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.65)] backdrop-blur"
              onSubmit={(event) => event.preventDefault()}
            >
              <span className="ml-3 text-orange-600">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={filters.search}
                onChange={(event) => filters.setSearch(event.target.value)}
                placeholder="Search restaurants or dishes"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold outline-none placeholder:text-stone-400"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => filters.setSearch("")}
                  className="rounded-2xl px-3 py-2 text-xs font-black text-stone-400 transition hover:bg-stone-100 hover:text-stone-800"
                >
                  Clear
                </button>
              ) : null}
              <Link
                to={appRoutes.customerLogin}
                className="hidden rounded-[16px] bg-stone-950 px-4 py-3 text-sm font-black text-white no-underline transition hover:bg-stone-800 sm:inline-flex"
              >
                Order
              </Link>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={appRoutes.customerLogin}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-orange-600 px-5 text-sm font-black text-white no-underline shadow-[0_18px_35px_-20px_rgba(234,88,12,0.75)] transition hover:bg-orange-700"
              >
                Login to order
                <ArrowIcon />
              </Link>
              <Link
                to={appRoutes.customerRegister}
                className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[#eadfd4] bg-white px-5 text-sm font-black text-stone-800 no-underline transition hover:border-orange-200 hover:text-orange-700"
              >
                Create account
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <StatTile label="Restaurants" value={highlights.activeRestaurantCount || visibleRestaurants.length || 0} />
              <StatTile label="Live dishes" value={highlights.availableDishCount || 0} tone="sky" />
              <StatTile label="Avg time" value={highlights.averageDeliveryTime ? `${highlights.averageDeliveryTime}m` : "Fast"} tone="emerald" />
            </div>
          </div>

          <RestaurantPreview restaurants={visibleRestaurants} highlights={highlights} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          eyebrow="Browse"
          title="See what is actually open nearby."
          text="The first screen starts with live restaurants and real menu data, not filler."
        />
        <FeatureCard
          eyebrow="Choose"
          title="Search by craving, cuisine, or restaurant."
          text="Filter quickly before logging in so ordering feels direct from the first tap."
          tone="sky"
        />
        <FeatureCard
          eyebrow="Order"
          title="Login only when checkout matters."
          text="Keep browsing lightweight, then move into cart, favorites, and tracking."
          tone="emerald"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              Cuisines
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Choose a craving</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollCuisines("left")}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#eee7dc] bg-white text-stone-700 shadow-sm transition hover:border-orange-200 hover:text-orange-700"
              aria-label="Scroll cuisines left"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => scrollCuisines("right")}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#eee7dc] bg-white text-stone-700 shadow-sm transition hover:border-orange-200 hover:text-orange-700"
              aria-label="Scroll cuisines right"
            >
              <ArrowIcon />
            </button>
          </div>
        </div>

        <div ref={cuisineRef} className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
          {cuisines.map((cuisine) => {
            const active = filters.selectedCuisine === cuisine;
            return (
              <button
                key={cuisine}
                type="button"
                onClick={() => selectCuisine(cuisine)}
                className={[
                  "min-h-12 shrink-0 rounded-full border px-5 text-sm font-black transition",
                  active
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-[#eee7dc] bg-white text-stone-600 hover:border-orange-200 hover:text-orange-700",
                ].join(" ")}
              >
                {cuisine}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              Restaurants
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">
              {filters.selectedCuisine === "All" ? "Open near you" : `${filters.selectedCuisine} places`}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => filters.resetFilters()}>
              Reset
            </Button>
            <Link
              to={appRoutes.customerLogin}
              className="inline-flex items-center justify-center rounded-[20px] bg-orange-600 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-orange-700"
            >
              Login
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-[20px]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
            {error}
            <div className="mt-4">
              <Button onClick={loadDiscovery}>Retry</Button>
            </div>
          </div>
        ) : visibleRestaurants.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleRestaurants.map((restaurant, index) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#eadfce] bg-white p-10 text-center">
            <h3 className="text-xl font-black text-stone-950">No restaurants found</h3>
            <p className="mt-2 text-sm font-semibold text-stone-500">Try another cuisine or clear the search.</p>
            <Button className="mt-5" onClick={() => filters.resetFilters()}>
              Show all
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicHome;
