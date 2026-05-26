import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

// GET /api/v1/search?q=biryani&type=all|restaurants|dishes
export const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const type = req.query.type || "all";

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { restaurants: [], dishes: [], query: q },
      });
    }

    const regex = new RegExp(q, "i");

    const [restaurants, dishes] = await Promise.all([
      type === "dishes"
        ? Promise.resolve([])
        : Restaurant.find({
            isActive: true,
            $or: [
              { name: regex },
              { category: regex },
              { cuisineType: regex },
              { description: regex },
              { address: regex },
            ],
          })
            .select("name imageUrl category cuisineType rating deliveryTime address isVegOnly priceBand")
            .limit(12)
            .lean(),

      type === "restaurants"
        ? Promise.resolve([])
        : MenuItem.find({
            isAvailable: true,
            $or: [{ name: regex }, { category: regex }, { description: regex }],
          })
            .populate("restaurant", "name imageUrl isActive")
            .select("name price imageUrl isVeg category description restaurant")
            .limit(20)
            .lean(),
    ]);

    // Filter dishes whose restaurant is active
    const activeDishes = dishes.filter((d) => d.restaurant?.isActive);

    // Group dishes by restaurant
    const dishGroups = {};
    activeDishes.forEach((dish) => {
      const rId = String(dish.restaurant._id);
      if (!dishGroups[rId]) {
        dishGroups[rId] = {
          restaurant: dish.restaurant,
          dishes: [],
        };
      }
      dishGroups[rId].dishes.push(dish);
    });

    res.json({
      success: true,
      data: {
        query: q,
        restaurants,
        dishes: activeDishes,
        dishGroups: Object.values(dishGroups),
        total: restaurants.length + activeDishes.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};







