import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../../services/api.js";

const initialFeed = {
  restaurants: [],
  categories: [],
  popularDishes: [],
  featuredRestaurants: [],
  trendingRestaurants: [],
  nearestRestaurants: [],
  bestValueRestaurants: [],
  fastestRestaurants: [],
  highlights: {
    activeRestaurantCount: 0,
    availableDishCount: 0,
    averageDeliveryTime: 0,
    topCuisine: "",
    nearestDistanceKm: 0,
    averageQualityScore: 0,
  },
};

const getQualityScore = (restaurant) =>
  Number(
    restaurant.qualityScore ||
      Number(restaurant.rating || 0) * 20 +
        Math.log10(Number(restaurant.deliveredOrderCount || 0) + 1) * 18 +
        Number(restaurant.availableItemCount || 0)
  );

const matchesDietaryPreference = (restaurant, dietaryPreference) => {
  if (dietaryPreference === "veg") {
    return Boolean(restaurant.isVegOnly) || Number(restaurant.vegItemCount || 0) > 0;
  }

  if (dietaryPreference === "non_veg") {
    return Number(restaurant.nonVegItemCount || 0) > 0;
  }

  return true;
};

const matchesPriceRange = (restaurant, priceRange) => {
  const price = Number(restaurant.minimumItemPrice || 0);

  if (priceRange === "budget") {
    return price > 0 && price <= 250;
  }

  if (priceRange === "mid") {
    return price > 250 && price <= 500;
  }

  if (priceRange === "premium") {
    return price > 500;
  }

  return true;
};

const matchesMinimumRating = (restaurant, minimumRating) => {
  if (minimumRating === "all") {
    return true;
  }

  return Number(restaurant.rating || 0) >= Number(minimumRating);
};

const matchesDistanceRange = (restaurant, distanceRange) => {
  const distanceKm = Number(restaurant.distanceKm || 0);

  if (distanceRange === "nearby") {
    return distanceKm > 0 && distanceKm <= 3;
  }

  if (distanceRange === "city") {
    return distanceKm > 3 && distanceKm <= 6;
  }

  if (distanceRange === "extended") {
    return distanceKm > 6;
  }

  return true;
};

export const useRestaurantDiscovery = () => {
  const [feed, setFeed] = useState(initialFeed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [minimumRating, setMinimumRating] = useState("all");
  const [distanceRange, setDistanceRange] = useState("all");
  const [dietaryPreference, setDietaryPreference] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("rating_desc");

  const deferredSearch = useDeferredValue(search);

  const loadDiscovery = useCallback(async () => {
    try {
      const response = await api.get("/restaurants/discover");
      startTransition(() => {
        setFeed(response.data || initialFeed);
      });
      setError("");
    } catch (apiError) {
      setError(apiError.message || "Unable to load restaurants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await api.get("/restaurants/discover");
        if (!active) {
          return;
        }

        startTransition(() => {
          setFeed(response.data || initialFeed);
        });
        setError("");
      } catch (apiError) {
        if (active) {
          setError(apiError.message || "Unable to load restaurants");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    refresh();
    const intervalId = setInterval(refresh, 60000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const cuisineOptions = useMemo(() => {
    const values = new Set(["All"]);

    for (const restaurant of feed.restaurants || []) {
      if (restaurant.category) {
        values.add(restaurant.category);
      }

      for (const cuisine of restaurant.cuisineType || []) {
        if (cuisine) {
          values.add(cuisine);
        }
      }
    }

    return [...values];
  }, [feed.restaurants]);

  const filteredRestaurants = useMemo(() => {
    let nextRestaurants = [...(feed.restaurants || [])];

    if (deferredSearch.trim()) {
      const query = deferredSearch.trim().toLowerCase();
      nextRestaurants = nextRestaurants.filter((restaurant) => {
        const searchPool = [
          restaurant.name,
          restaurant.category,
          restaurant.description,
          restaurant.address,
          ...(restaurant.cuisineType || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchPool.includes(query);
      });
    }

    if (selectedCuisine !== "All") {
      const selectedCuisineKey = selectedCuisine.toLowerCase();
      nextRestaurants = nextRestaurants.filter(
        (restaurant) =>
          restaurant.category?.toLowerCase() === selectedCuisineKey ||
          restaurant.cuisineType?.some(
            (cuisine) => cuisine?.toLowerCase() === selectedCuisineKey
          )
      );
    }

    nextRestaurants = nextRestaurants.filter((restaurant) =>
      matchesDietaryPreference(restaurant, dietaryPreference)
    );

    nextRestaurants = nextRestaurants.filter((restaurant) =>
      matchesMinimumRating(restaurant, minimumRating)
    );

    nextRestaurants = nextRestaurants.filter((restaurant) =>
      matchesDistanceRange(restaurant, distanceRange)
    );

    nextRestaurants = nextRestaurants.filter((restaurant) =>
      matchesPriceRange(restaurant, priceRange)
    );

    if (sortBy === "popularity_desc") {
      nextRestaurants.sort(
        (a, b) =>
          Number(b.orderCount || 0) - Number(a.orderCount || 0) ||
          Number(b.deliveredOrderCount || 0) - Number(a.deliveredOrderCount || 0)
      );
    } else if (sortBy === "quality_desc") {
      nextRestaurants.sort((a, b) => getQualityScore(b) - getQualityScore(a));
    } else if (sortBy === "delivery_asc") {
      nextRestaurants.sort(
        (a, b) =>
          Number(a.deliveryTime || 0) - Number(b.deliveryTime || 0) ||
          Number(b.rating || 0) - Number(a.rating || 0)
      );
    } else if (sortBy === "distance_asc") {
      nextRestaurants.sort(
        (a, b) =>
          Number(a.distanceKm || Number.MAX_SAFE_INTEGER) -
            Number(b.distanceKm || Number.MAX_SAFE_INTEGER) ||
          Number(b.rating || 0) - Number(a.rating || 0)
      );
    } else if (sortBy === "price_asc") {
      nextRestaurants.sort(
        (a, b) => Number(a.minimumItemPrice || 0) - Number(b.minimumItemPrice || 0)
      );
    } else {
      nextRestaurants.sort(
        (a, b) =>
          Number(b.rating || 0) - Number(a.rating || 0) ||
          Number(b.deliveredOrderCount || 0) - Number(a.deliveredOrderCount || 0)
      );
    }

    return nextRestaurants;
  }, [
    deferredSearch,
    dietaryPreference,
    distanceRange,
    feed.restaurants,
    minimumRating,
    priceRange,
    selectedCuisine,
    sortBy,
  ]);

  const activeFilterCount = [
    Boolean(deferredSearch.trim()),
    selectedCuisine !== "All",
    minimumRating !== "all",
    distanceRange !== "all",
    dietaryPreference !== "all",
    priceRange !== "all",
    sortBy !== "rating_desc",
  ].filter(Boolean).length;

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedCuisine("All");
    setMinimumRating("all");
    setDistanceRange("all");
    setDietaryPreference("all");
    setPriceRange("all");
    setSortBy("rating_desc");
  }, []);

  return {
    feed,
    loading,
    error,
    loadDiscovery,
    filters: {
      search,
      setSearch,
      selectedCuisine,
      setSelectedCuisine,
      minimumRating,
      setMinimumRating,
      distanceRange,
      setDistanceRange,
      dietaryPreference,
      setDietaryPreference,
      priceRange,
      setPriceRange,
      sortBy,
      setSortBy,
      cuisineOptions,
      activeFilterCount,
      resetFilters,
    },
    filteredRestaurants,
  };
};
