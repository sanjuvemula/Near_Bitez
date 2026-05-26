import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import { getDecoratedRestaurantsByIds } from "../services/restaurantService.js";

const toFavoriteIds = (favoriteRestaurants = []) =>
  favoriteRestaurants.map((restaurantId) => String(restaurantId));

export const getFavoriteRestaurants = async (req, res) => {
  const restaurants = await getDecoratedRestaurantsByIds(
    req.user.favoriteRestaurants || [],
    { activeOnly: false }
  );

  res.status(200).json({
    success: true,
    data: restaurants,
  });
};

export const addFavoriteRestaurant = async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { favoriteRestaurants: restaurant._id } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: `${restaurant.name} added to favorites`,
    data: {
      favoriteRestaurantIds: toFavoriteIds(user.favoriteRestaurants),
    },
  });
};

export const removeFavoriteRestaurant = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { favoriteRestaurants: req.params.restaurantId } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Restaurant removed from favorites",
    data: {
      favoriteRestaurantIds: toFavoriteIds(user.favoriteRestaurants),
    },
  });
};











