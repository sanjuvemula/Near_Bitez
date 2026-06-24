import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";

// ─── In-memory cache ──────────────────────────────────────────────────────────
const CACHE_TTL_MS = 30_000;

const cache = {
  decoratedRestaurants: { data: null, filtersKey: null, expiresAt: 0 },
  popularDishes: { data: null, restaurantHash: null, expiresAt: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hashString = (value = "") =>
  [...String(value)].reduce((hash, character) => {
    const nextHash = (hash << 5) - hash + character.charCodeAt(0);
    return nextHash | 0;
  }, 0);

const getEstimatedDistanceKm = (restaurant) => {
  const seed = `${restaurant._id}-${restaurant.name}-${restaurant.address}-${restaurant.category}`;
  const normalizedHash = Math.abs(hashString(seed));
  return Number((0.8 + (normalizedHash % 121) / 10).toFixed(1));
};

const getQualityScore = ({ rating, deliveredOrderCount, availableItemCount }) => {
  const ratingScore = (clamp(Number(rating || 0), 0, 5) / 5) * 60;
  const reliabilityScore = Math.min(
    25,
    Math.log10(Number(deliveredOrderCount || 0) + 1) * 12
  );
  const assortmentScore = Math.min(15, Number(availableItemCount || 0) * 1.8);
  return Math.round(ratingScore + reliabilityScore + assortmentScore);
};

const getPriceBand = (minimumItemPrice) => {
  if (!minimumItemPrice || minimumItemPrice <= 250) return "Budget";
  if (minimumItemPrice <= 500) return "Mid";
  return "Premium";
};

const withRestaurantStats = (restaurants, menuStats, orderStats = []) => {
  const menuStatsMap = new Map(menuStats.map((item) => [String(item._id), item]));
  const orderStatsMap = new Map(orderStats.map((item) => [String(item._id), item]));

  return restaurants.map((restaurant) => {
    const menuSnapshot = menuStatsMap.get(String(restaurant._id));
    const orderSnapshot = orderStatsMap.get(String(restaurant._id));
    const minimumItemPrice = menuSnapshot?.minimumItemPrice || 0;
    const maximumItemPrice = menuSnapshot?.maximumItemPrice || 0;
    const availableItemCount = menuSnapshot?.availableItemCount || 0;
    const menuItemCount = menuSnapshot?.menuItemCount || 0;
    const vegItemCount = menuSnapshot?.vegItemCount || 0;
    const nonVegItemCount = menuSnapshot?.nonVegItemCount || 0;
    const orderCount = orderSnapshot?.orderCount || 0;
    const deliveredOrderCount = orderSnapshot?.deliveredOrderCount || 0;
    const distanceKm = getEstimatedDistanceKm(restaurant);
    const qualityScore = getQualityScore({
      rating: restaurant.rating,
      deliveredOrderCount,
      availableItemCount,
    });

    return {
      ...restaurant,
      minimumItemPrice,
      maximumItemPrice,
      availableItemCount,
      menuItemCount,
      vegItemCount,
      nonVegItemCount,
      orderCount,
      deliveredOrderCount,
      distanceKm,
      qualityScore,
      priceBand: getPriceBand(minimumItemPrice),
    };
  });
};

const getRestaurantStats = async (restaurantIds) => {
  if (restaurantIds.length === 0) return { menuStats: [], orderStats: [] };

  const [menuStats, orderStats] = await Promise.all([
    MenuItem.aggregate([
      { $match: { restaurant: { $in: restaurantIds } } },
      {
        $group: {
          _id: "$restaurant",
          minimumItemPrice: { $min: "$price" },
          maximumItemPrice: { $max: "$price" },
          availableItemCount: {
            $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] },
          },
          menuItemCount: { $sum: 1 },
          vegItemCount: {
            $sum: { $cond: [{ $eq: ["$isVeg", true] }, 1, 0] },
          },
          nonVegItemCount: {
            $sum: { $cond: [{ $eq: ["$isVeg", false] }, 1, 0] },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { restaurant: { $in: restaurantIds } } },
      {
        $group: {
          _id: "$restaurant",
          orderCount: { $sum: 1 },
          deliveredOrderCount: {
            $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  return { menuStats, orderStats };
};

// ─── Exports ──────────────────────────────────────────────────────────────────
export const decorateRestaurants = async (restaurants) => {
  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const { menuStats, orderStats } = await getRestaurantStats(restaurantIds);
  return withRestaurantStats(restaurants, menuStats, orderStats);
};

export const getDecoratedRestaurants = async (filters) => {
  const filtersKey = JSON.stringify(filters);
  const now = Date.now();

  if (
    cache.decoratedRestaurants.data &&
    cache.decoratedRestaurants.filtersKey === filtersKey &&
    cache.decoratedRestaurants.expiresAt > now
  ) {
    return cache.decoratedRestaurants.data;
  }

  const restaurants = await Restaurant.find(filters).lean();
  const decorated = await decorateRestaurants(restaurants);

  cache.decoratedRestaurants = {
    data: decorated,
    filtersKey,
    expiresAt: now + CACHE_TTL_MS,
  };

  return decorated;
};

export const getDecoratedRestaurantsByIds = async (
  restaurantIds,
  { activeOnly = false } = {}
) => {
  if (!restaurantIds?.length) return [];

  const filters = { _id: { $in: restaurantIds } };
  if (activeOnly) filters.isActive = true;

  const restaurants = await Restaurant.find(filters).lean();
  const decoratedRestaurants = await decorateRestaurants(restaurants);
  const sortOrder = new Map(
    restaurantIds.map((restaurantId, index) => [String(restaurantId), index])
  );

  return decoratedRestaurants.sort(
    (a, b) =>
      (sortOrder.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) -
      (sortOrder.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER)
  );
};

const pickTopCuisine = (restaurants) => {
  const counts = new Map();

  for (const restaurant of restaurants) {
    const labels =
      restaurant.cuisineType?.length > 0
        ? restaurant.cuisineType
        : [restaurant.category];

    for (const label of labels) {
      if (!label) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Local favorites";
};

export const buildCategories = (restaurants) => {
  const categories = new Map();

  for (const restaurant of restaurants) {
    if (!restaurant.category) continue;

    const existing = categories.get(restaurant.category) || {
      name: restaurant.category,
      restaurantCount: 0,
      availableItemCount: 0,
      totalStartingPrice: 0,
      featuredImageUrl: restaurant.imageUrl || "",
    };

    existing.restaurantCount += 1;
    existing.availableItemCount += restaurant.availableItemCount || 0;
    existing.totalStartingPrice += restaurant.minimumItemPrice || 0;

    if (!existing.featuredImageUrl && restaurant.imageUrl) {
      existing.featuredImageUrl = restaurant.imageUrl;
    }

    categories.set(restaurant.category, existing);
  }

  return [...categories.values()]
    .map((category) => ({
      name: category.name,
      restaurantCount: category.restaurantCount,
      availableItemCount: category.availableItemCount,
      averageStartingPrice: category.restaurantCount
        ? Math.round(category.totalStartingPrice / category.restaurantCount)
        : 0,
      featuredImageUrl: category.featuredImageUrl,
    }))
    .sort((a, b) => b.restaurantCount - a.restaurantCount)
    .slice(0, 8);
};

export const buildHighlights = (restaurants) => ({
  activeRestaurantCount: restaurants.length,
  availableDishCount: restaurants.reduce(
    (sum, restaurant) => sum + (restaurant.availableItemCount || 0),
    0
  ),
  averageDeliveryTime: restaurants.length
    ? Math.round(
        restaurants.reduce(
          (sum, restaurant) => sum + Number(restaurant.deliveryTime || 0),
          0
        ) / restaurants.length
      )
    : 0,
  topCuisine: pickTopCuisine(restaurants),
  nearestDistanceKm: restaurants.length
    ? Math.min(...restaurants.map((restaurant) => Number(restaurant.distanceKm || 0)))
    : 0,
  averageQualityScore: restaurants.length
    ? Math.round(
        restaurants.reduce(
          (sum, restaurant) => sum + Number(restaurant.qualityScore || 0),
          0
        ) / restaurants.length
      )
    : 0,
});

export const buildCollection = (restaurants, sorter, limit = 6) =>
  [...restaurants].sort(sorter).slice(0, limit);

export const getPopularDishes = async (restaurants) => {
  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  if (restaurantIds.length === 0) return [];

  const restaurantHash = restaurantIds.map(String).join(",");
  const now = Date.now();

  if (
    cache.popularDishes.data &&
    cache.popularDishes.restaurantHash === restaurantHash &&
    cache.popularDishes.expiresAt > now
  ) {
    return cache.popularDishes.data;
  }

  const popularity = await Order.aggregate([
    { $match: { restaurant: { $in: restaurantIds }, status: { $ne: "REJECTED" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.menuItem",
        orderCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: 8 },
  ]);

  let orderedDishIds = popularity.map((item) => item._id).filter(Boolean);

  if (orderedDishIds.length === 0) {
    const fallback = await MenuItem.find({
      restaurant: { $in: restaurantIds },
      isAvailable: true,
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    orderedDishIds = fallback.map((item) => item._id);
  }

  if (orderedDishIds.length === 0) {
    cache.popularDishes = { data: [], restaurantHash, expiresAt: now + CACHE_TTL_MS };
    return [];
  }

  const dishes = await MenuItem.find({ _id: { $in: orderedDishIds } }).lean();
  const dishMap = new Map(dishes.map((dish) => [String(dish._id), dish]));
  const restaurantMap = new Map(
    restaurants.map((restaurant) => [String(restaurant._id), restaurant])
  );
  const popularityMap = new Map(
    popularity.map((item) => [String(item._id), item.orderCount])
  );

  const result = orderedDishIds
    .map((dishId) => {
      const dish = dishMap.get(String(dishId));
      if (!dish) return null;

      const restaurant = restaurantMap.get(String(dish.restaurant));
      if (!restaurant?.isActive) return null;

      return {
        ...dish,
        orderCount: popularityMap.get(String(dish._id)) || 0,
        restaurant: restaurant
          ? {
              _id: restaurant._id,
              name: restaurant.name,
              category: restaurant.category,
              rating: restaurant.rating,
              deliveryTime: restaurant.deliveryTime,
              imageUrl: restaurant.imageUrl,
            }
          : null,
      };
    })
    .filter(Boolean);
  
  cache.popularDishes = { data: result, restaurantHash, expiresAt: now + CACHE_TTL_MS };
  return result;
};