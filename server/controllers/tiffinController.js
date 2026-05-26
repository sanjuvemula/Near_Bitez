import Restaurant from "../models/Restaurant.js";

/**
 * GET /api/v1/tiffins
 * Returns all vendors who have tiffinAvailable: true and isActive: true,
 * shaped into the flat object TiffinCard expects.
 */
export const getTiffins = async (req, res) => {
  try {
    const tiffinVendors = await Restaurant.find({
      tiffinAvailable: true,
      isActive: true,
    }).select(
      "name imageUrl tiffinPrice tiffinMealType tiffinDescription " +
      "tiffinDeliveryType tiffinMealsPerDay tiffinDuration " +
      "rating address cuisineType"
    );

    const shaped = tiffinVendors.map((v) => ({
      _id:          v._id,
      vendorName:   v.name,
      imageUrl:     v.imageUrl || null,
      price:        v.tiffinPrice || 0,
      mealType:     v.tiffinMealType || "veg",
      description:  v.tiffinDescription || "Fresh home-style meals delivered daily",
      deliveryType: v.tiffinDeliveryType || "delivery",
      mealsPerDay:  v.tiffinMealsPerDay || 1,
      duration:     v.tiffinDuration || "monthly",
      rating:       v.rating || null,
      address:      v.address || {},
      cuisineType:  v.cuisineType || [],
    }));

    res.status(200).json({ success: true, data: shaped });
  } catch (error) {
    console.error("[getTiffins]", error);
    res.status(500).json({ success: false, message: "Unable to fetch tiffin providers" });
  }
};