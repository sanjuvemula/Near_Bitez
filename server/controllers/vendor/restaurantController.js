import Restaurant from "../../models/Restaurant.js";
import {
  getVendorRestaurant,
  parseBoolean,
  parseCuisineType,
  removeCloudinaryAsset,
  rollbackUploadedFile,
  toNumber,
  toTrimmedString,
  validateRestaurantPayload,
} from "./shared.js";

export const getVendorProfile = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  res.status(200).json({
    success: true,
    data: restaurant,
  });
};

export const upsertVendorProfile = async (req, res) => {
  try {
    const existingRestaurant = await getVendorRestaurant(req);

    // ── Parse weekly menu safely ───────────────────────────────────────────
    let tiffinWeeklyMenu = existingRestaurant?.tiffinWeeklyMenu || {};
    if (req.body.tiffinWeeklyMenu) {
      try {
        tiffinWeeklyMenu =
          typeof req.body.tiffinWeeklyMenu === "string"
            ? JSON.parse(req.body.tiffinWeeklyMenu)
            : req.body.tiffinWeeklyMenu;
      } catch {
        tiffinWeeklyMenu = existingRestaurant?.tiffinWeeklyMenu || {};
      }
    }

    // ── Core restaurant payload ────────────────────────────────────────────
    const payload = {
      name:        toTrimmedString(req.body.name),
      description: toTrimmedString(req.body.description),
      address:     toTrimmedString(req.body.address),
      category:    toTrimmedString(req.body.category),
      cuisineType: parseCuisineType(
        req.body.cuisineType ?? existingRestaurant?.cuisineType ?? []
      ),
      deliveryTime: Math.round(
        toNumber(req.body.deliveryTime ?? existingRestaurant?.deliveryTime ?? 30)
      ),
      isVegOnly: parseBoolean(
        req.body.isVegOnly,
        existingRestaurant?.isVegOnly ?? false
      ),
      isActive:
        req.body.isActive === undefined
          ? existingRestaurant?.isActive ?? true
          : parseBoolean(req.body.isActive, existingRestaurant?.isActive ?? true),
      imageUrl:      req.file?.path     || existingRestaurant?.imageUrl     || "",
      imagePublicId: req.file?.filename || existingRestaurant?.imagePublicId || "",

      // ── Tiffin fields ────────────────────────────────────────────────────
      tiffinAvailable:
        req.body.tiffinAvailable !== undefined
          ? parseBoolean(req.body.tiffinAvailable, existingRestaurant?.tiffinAvailable ?? false)
          : existingRestaurant?.tiffinAvailable ?? false,

      tiffinPrice:
        req.body.tiffinPrice !== undefined
          ? toNumber(req.body.tiffinPrice)
          : existingRestaurant?.tiffinPrice ?? 0,

      tiffinMealType:
        toTrimmedString(req.body.tiffinMealType) ||
        existingRestaurant?.tiffinMealType ||
        "veg",

      tiffinDescription:
        toTrimmedString(req.body.tiffinDescription) ??
        existingRestaurant?.tiffinDescription ??
        "",

      tiffinDeliveryType:
        toTrimmedString(req.body.tiffinDeliveryType) ||
        existingRestaurant?.tiffinDeliveryType ||
        "delivery",

      tiffinMealsPerDay:
        req.body.tiffinMealsPerDay !== undefined
          ? Math.max(1, Math.min(5, toNumber(req.body.tiffinMealsPerDay)))
          : existingRestaurant?.tiffinMealsPerDay ?? 1,

      // ── NEW: tiffinDuration ──────────────────────────────────────────────
      tiffinDuration:
        toTrimmedString(req.body.tiffinDuration) ||
        existingRestaurant?.tiffinDuration ||
        "monthly",

      tiffinWeeklyMenu,
    };

    const validationError = validateRestaurantPayload(payload);
    if (validationError) {
      await rollbackUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (
      req.file &&
      existingRestaurant?.imagePublicId &&
      existingRestaurant.imagePublicId !== req.file.filename
    ) {
      await removeCloudinaryAsset(existingRestaurant.imagePublicId);
    }

    const isAdminUpdate = req.user?.role === "admin";
    const targetQuery = isAdminUpdate
      ? existingRestaurant?._id
        ? { _id: existingRestaurant._id }
        : null
      : { vendor: req.user._id };

    if (!targetQuery) {
      await rollbackUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      targetQuery,
      {
        $set: isAdminUpdate
          ? payload
          : { ...payload, vendor: req.user._id },
      },
      {
        new: true,
        upsert: !isAdminUpdate,
        runValidators: true,
        setDefaultsOnInsert: !isAdminUpdate,
      }
    );

    // ── Emit real-time tiffin update ───────────────────────────────────────
    const tiffinChanged =
      req.body.tiffinAvailable  !== undefined ||
      req.body.tiffinPrice      !== undefined ||
      req.body.tiffinMealType   !== undefined ||
      req.body.tiffinDescription !== undefined ||
      req.body.tiffinDeliveryType !== undefined ||
      req.body.tiffinMealsPerDay !== undefined ||
      req.body.tiffinDuration   !== undefined ||   // ← NEW
      req.body.tiffinWeeklyMenu !== undefined;

    if (tiffinChanged) {
      const io = req.app.get("io");
      if (io) {
        const tiffinPayload = {
          _id:             restaurant._id,
          vendorName:      restaurant.name,
          imageUrl:        restaurant.imageUrl || null,
          price:           restaurant.tiffinPrice || 0,
          mealType:        restaurant.tiffinMealType || "veg",
          description:     restaurant.tiffinDescription || "Fresh home-style meals delivered daily",
          deliveryType:    restaurant.tiffinDeliveryType || "delivery",
          mealsPerDay:     restaurant.tiffinMealsPerDay || 1,
          duration:        restaurant.tiffinDuration || "monthly",  // ← NEW
          rating:          restaurant.rating || null,
          address:         restaurant.address || {},
          cuisineType:     restaurant.cuisineType || [],
          tiffinAvailable: restaurant.tiffinAvailable || false,
          weeklyMenu:      restaurant.tiffinWeeklyMenu || {},
        };

        io.to("tiffin_subscribers").emit("tiffin_updated", tiffinPayload);
      }
    }

    res.status(200).json({
      success: true,
      message: "Restaurant profile saved",
      data: restaurant,
    });
  } catch (error) {
    await rollbackUploadedFile(req.file);

    res.status(400).json({
      success: false,
      message: "Unable to save restaurant profile",
    });
  }
};