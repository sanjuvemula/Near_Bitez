import MenuItem from "../../models/MenuItem.js";
import {
  buildMenuPayload,
  getVendorRestaurant,
  parseBoolean,
  removeCloudinaryAsset,
  rollbackUploadedFile,
} from "./shared.js";

export const getMenuItems = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Create your restaurant profile first",
    });
  }

  const items = await MenuItem.find({ restaurant: restaurant._id }).sort({
    isAvailable: -1,
    category: 1,
    name: 1,
  });

  res.status(200).json({
    success: true,
    data: items,
  });
};

export const createMenuItem = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);

    if (!restaurant) {
      await rollbackUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: "Create your restaurant profile first",
      });
    }

    const { payload, error } = buildMenuPayload({
      body: req.body,
      file: req.file,
    });

    if (error) {
      await rollbackUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const item = await MenuItem.create({
      restaurant: restaurant._id,
      ...payload,
    });

    res.status(201).json({
      success: true,
      message: "Menu item created",
      data: item,
    });
  } catch (error) {
    await rollbackUploadedFile(req.file);

    res.status(400).json({
      success: false,
      message: "Unable to create menu item",
    });
  }
};

export const updateMenuItem = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    await rollbackUploadedFile(req.file);
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const currentItem = await MenuItem.findOne({
    _id: req.params.id,
    restaurant: restaurant._id,
  });

  if (!currentItem) {
    await rollbackUploadedFile(req.file);
    return res.status(404).json({
      success: false,
      message: "Menu item not found",
    });
  }

  const previousImagePublicId = currentItem.imagePublicId;
  const { payload, error } = buildMenuPayload({
    body: req.body,
    currentItem,
    file: req.file,
  });

  if (error) {
    await rollbackUploadedFile(req.file);
    return res.status(400).json({
      success: false,
      message: error,
    });
  }

  try {
    currentItem.name = payload.name;
    currentItem.description = payload.description;
    currentItem.category = payload.category;
    currentItem.price = payload.price;
    currentItem.isVeg = payload.isVeg;
    currentItem.isAvailable = payload.isAvailable;
    currentItem.imageUrl = payload.imageUrl;
    currentItem.imagePublicId = payload.imagePublicId;

    await currentItem.save();

    if (
      req.file &&
      previousImagePublicId &&
      previousImagePublicId !== req.file.filename
    ) {
      await removeCloudinaryAsset(previousImagePublicId);
    }

    res.status(200).json({
      success: true,
      message: "Menu item updated",
      data: currentItem,
    });
  } catch (error) {
    await rollbackUploadedFile(req.file);

    res.status(400).json({
      success: false,
      message: "Unable to update menu item",
    });
  }
};

export const toggleMenuItemAvailability = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const item = await MenuItem.findOne({
    _id: req.params.id,
    restaurant: restaurant._id,
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Menu item not found",
    });
  }

  item.isAvailable =
    req.body.isAvailable === undefined
      ? !item.isAvailable
      : parseBoolean(req.body.isAvailable, item.isAvailable);

  await item.save();

  res.status(200).json({
    success: true,
    message: "Availability updated",
    data: item,
  });
};

export const deleteMenuItem = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const item = await MenuItem.findOneAndDelete({
    _id: req.params.id,
    restaurant: restaurant._id,
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Menu item not found",
    });
  }

  await removeCloudinaryAsset(item.imagePublicId);

  res.status(200).json({
    success: true,
    message: "Menu item deleted",
  });
};
