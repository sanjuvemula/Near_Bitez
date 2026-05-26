import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import {
  buildCategories,
  buildCollection,
  buildHighlights,
  decorateRestaurants,
  getDecoratedRestaurants,
  getPopularDishes,
} from "../services/restaurantService.js";

// ─── Haversine distance ───────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

export const getRestaurants = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, minRating, sort, lat, lng } = req.query;

    const filters = { isActive: true };

    if (category) filters.category = category;
    if (minRating) filters.rating = { $gte: Number(minRating) || 0 };

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { cuisineType: { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }

    let payload = await getDecoratedRestaurants(filters);

    if (minPrice) payload = payload.filter((r) => r.minimumItemPrice >= Number(minPrice));
    if (maxPrice) payload = payload.filter((r) => r.minimumItemPrice === 0 || r.minimumItemPrice <= Number(maxPrice));

    // ── Attach real distance if user location provided ────────────────────────
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const hasLocation = userLat !== null && userLng !== null;

    if (hasLocation) {
      payload = payload.map((r) => {
        if (r.location?.coordinates?.length === 2) {
          const [rLng, rLat] = r.location.coordinates;
          return { ...r, distanceKm: haversineKm(userLat, userLng, rLat, rLng) };
        }
        return r; // keep hash-based fallback
      });
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    if (sort === "price_asc") {
      payload.sort((a, b) => a.minimumItemPrice - b.minimumItemPrice);
    } else if (sort === "price_desc") {
      payload.sort((a, b) => b.minimumItemPrice - a.minimumItemPrice);
    } else if (sort === "rating_desc") {
      payload.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sort === "distance_asc") {
      payload.sort((a, b) => parseFloat(a.distanceKm || 99) - parseFloat(b.distanceKm || 99));
    } else if (sort === "popularity_desc") {
      payload.sort((a, b) => Number(b.deliveredOrderCount || 0) - Number(a.deliveredOrderCount || 0));
    } else if (sort === "delivery_asc") {
      payload.sort((a, b) => Number(a.deliveryTime || 99) - Number(b.deliveryTime || 99));
    } else {
      payload.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch restaurants" });
  }
};

export const getRestaurantDiscovery = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const hasLocation = userLat !== null && userLng !== null;

    let restaurants = await getDecoratedRestaurants({ isActive: true });

    // ── Attach real distance ──────────────────────────────────────────────────
    if (hasLocation) {
      restaurants = restaurants.map((r) => {
        if (r.location?.coordinates?.length === 2) {
          const [rLng, rLat] = r.location.coordinates;
          return { ...r, distanceKm: haversineKm(userLat, userLng, rLat, rLng) };
        }
        return r;
      });
    }

    const popularDishes = await getPopularDishes(restaurants);

    res.status(200).json({
      success: true,
      data: {
        restaurants,
        categories: buildCategories(restaurants),
        popularDishes,
        featuredRestaurants: buildCollection(
          restaurants,
          (a, b) =>
            Number(b.rating || 0) - Number(a.rating || 0) ||
            Number(b.deliveredOrderCount || 0) - Number(a.deliveredOrderCount || 0)
        ),
        trendingRestaurants: buildCollection(
          restaurants,
          (a, b) =>
            Number(b.orderCount || 0) - Number(a.orderCount || 0) ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
        nearestRestaurants: buildCollection(
          restaurants,
          (a, b) =>
            parseFloat(a.distanceKm || 99) - parseFloat(b.distanceKm || 99) ||
            Number(b.rating || 0) - Number(a.rating || 0),
          4
        ),
        bestValueRestaurants: buildCollection(
          restaurants,
          (a, b) =>
            Number(a.minimumItemPrice || Number.MAX_SAFE_INTEGER) -
              Number(b.minimumItemPrice || Number.MAX_SAFE_INTEGER) ||
            Number(b.rating || 0) - Number(a.rating || 0),
          4
        ),
        fastestRestaurants: buildCollection(
          restaurants,
          (a, b) =>
            Number(a.deliveryTime || 0) - Number(b.deliveryTime || 0) ||
            Number(b.rating || 0) - Number(a.rating || 0),
          4
        ),
        highlights: buildHighlights(restaurants),
        userLocation: hasLocation ? { lat: userLat, lng: userLng } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to load discovery feed" });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).lean();

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const [decoratedRestaurant, menu] = await Promise.all([
      decorateRestaurants([restaurant]).then(([item]) => item),
      MenuItem.find({ restaurant: restaurant._id }).sort({ category: 1, name: 1 }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { ...decoratedRestaurant, menu },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch restaurant details" });
  }
};



