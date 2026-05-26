import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Loader from "../../components/Loader.jsx";
import { appRoutes, getCustomerRestaurantRoute } from "../../app/routes.jsx";
import { useFavoritesContext } from "../../context/FavoritesContext.jsx";
import { formatCurrency } from "../../utils/formatters.js";

const SearchIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const HeartIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const RatingBadge = ({ rating }) => {
  const value = Number(rating || 0);
  const tone =
    value >= 4.5 ? "bg-emerald-600" : value >= 4 ? "bg-orange-500" : "bg-stone-500";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white ${tone}`}
    >
      <span aria-hidden="true">★</span>
      {value.toFixed(1)}
    </span>
  );
};

const FavoriteCard = ({ restaurant, index, onRemove }) => {
  const navigate = useNavigate();
  const { isPending } = useFavoritesContext();
  const pending = isPending(restaurant._id);

  const openRestaurant = () => navigate(getCustomerRestaurantRoute(restaurant._id));

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Card className="overflow-hidden border-[#f0ede8] transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_50px_-40px_rgba(234,88,12,0.45)]">
        <div
          role="button"
          tabIndex={0}
          onClick={openRestaurant}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openRestaurant();
            }
          }}
          className="relative h-[190px] cursor-pointer overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50"
        >
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-black text-orange-200">
              {restaurant.name?.[0] || "?"}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

          {!restaurant.isActive ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <span className="rounded-full bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-red-600">
                Closed
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(restaurant);
            }}
            disabled={pending}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-500 shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={`Remove ${restaurant.name} from favorites`}
          >
            {pending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            ) : (
              <HeartIcon className="h-4 w-4" />
            )}
          </button>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="truncate text-lg font-black text-white">{restaurant.name}</h3>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {(restaurant.cuisineType || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(restaurant.cuisineType || []).slice(0, 3).map((cuisine) => (
                <span
                  key={cuisine}
                  className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-stone-500"
                >
                  {cuisine}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <RatingBadge rating={restaurant.rating} />
              <span className="text-sm font-semibold text-stone-500">
                {restaurant.deliveryTime || 30} min
              </span>
              {restaurant.minimumItemPrice ? (
                <span className="text-sm font-semibold text-stone-500">
                  {formatCurrency(restaurant.minimumItemPrice)}
                </span>
              ) : null}
            </div>

            <Link
              to={getCustomerRestaurantRoute(restaurant._id)}
              className="rounded-full bg-orange-600 px-4 py-2 text-xs font-black text-white no-underline transition hover:bg-orange-700"
            >
              {restaurant.isActive ? "Open" : "View"}
            </Link>
          </div>
        </div>
      </Card>
    </Motion.div>
  );
};

const EmptyState = ({ onBrowse }) => (
  <Motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-orange-50 text-orange-600">
        <HeartIcon className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-3xl font-black text-stone-950">No favorites yet</h2>
      <p className="mt-3 max-w-sm text-sm font-semibold text-stone-500">
        Save restaurants to find them faster.
      </p>
      <Button className="mt-6" onClick={onBrowse}>
        Browse restaurants
      </Button>
    </Card>
  </Motion.div>
);

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favorites, loading, toggleFavorite, refreshFavorites } = useFavoritesContext();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      favorites.filter((restaurant) =>
        restaurant.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [favorites, search]
  );

  const handleRemove = async (restaurant) => {
    try {
      await toggleFavorite(restaurant);
      toast.success(`Removed ${restaurant.name}`);
    } catch {
      toast.error("Could not remove favorite");
    }
  };

  if (loading && favorites.length === 0) {
    return <Loader label="Loading favorites..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
            Favorites
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
            Saved restaurants
          </h1>
          {favorites.length > 0 ? (
            <p className="mt-2 text-sm font-semibold text-stone-500">
              {favorites.length} saved
            </p>
          ) : null}
        </div>

        <Button variant="secondary" onClick={refreshFavorites}>
          Refresh
        </Button>
      </div>

      {favorites.length > 0 ? (
        <Card className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search favorites"
              className="h-12 w-full rounded-[18px] border border-[#ece4d7] bg-[#fcfbf8] pl-11 pr-4 text-sm font-semibold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white"
            />
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-[190px] animate-pulse bg-stone-100" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-stone-100" />
              </div>
            </Card>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState onBrowse={() => navigate(appRoutes.customerHome)} />
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-xl font-black text-stone-950">No matches</p>
          <div className="mt-5">
            <Button variant="secondary" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        </Card>
      ) : (
        <Motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((restaurant, index) => (
              <FavoriteCard
                key={restaurant._id}
                restaurant={restaurant}
                index={index}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </Motion.div>
      )}
    </div>
  );
};

export default FavoritesPage;
