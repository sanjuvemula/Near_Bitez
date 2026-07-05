import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import heroImage from "../../assets/hero.png";
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

const SearchIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const StatTile = ({ label, value }) => (
  <div className="min-w-0 rounded-[18px] border border-white/25 bg-white/90 px-4 py-3 text-stone-950 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.55)] backdrop-blur">
    <strong className="block truncate text-2xl font-black">{value}</strong>
    <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
      {label}
    </span>
  </div>
);

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
      <section
        className="relative -mx-4 min-h-[500px] overflow-hidden rounded-none bg-stone-950 px-4 py-8 text-white sm:-mx-6 sm:px-8 lg:-mx-8 lg:rounded-[28px] lg:px-10"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(20,13,8,0.9), rgba(20,13,8,0.55) 48%, rgba(20,13,8,0.22)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex min-h-[440px] max-w-3xl flex-col justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-200">
              NearBitez
            </p>
            <h1 className="mt-3 max-w-2xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
              Fresh local food, fast.
            </h1>
            <p className="mt-5 max-w-xl text-base font-bold leading-7 text-white/78">
              Browse live menus from nearby restaurants and sign in only when you are ready to order.
            </p>

            <form
              className="mt-7 flex max-w-xl items-center gap-3 rounded-[20px] border border-white/20 bg-white p-2 text-stone-950 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.8)]"
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
            </form>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            <StatTile label="Restaurants" value={highlights.activeRestaurantCount || visibleRestaurants.length || 0} />
            <StatTile label="Live dishes" value={highlights.availableDishCount || 0} />
            <StatTile label="Avg time" value={highlights.averageDeliveryTime ? `${highlights.averageDeliveryTime}m` : "Fast"} />
          </div>
        </div>
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

        <div
          ref={cuisineRef}
          className="scrollbar-hide flex gap-3 overflow-x-auto pb-2"
        >
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
