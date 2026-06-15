import Cart from "../models/Cart.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import { calculateOrderTotals } from "../services/pricingService.js";

const ensureCart = async (customerId) => {
  let cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    cart = await Cart.create({
      customer: customerId,
      restaurant: null,
      items: [],
    });
  }

  return cart;
};

const buildCartResponse = async (cart) => {
  if (!cart) {
    return {
      restaurant: null,
      items: [],
      warnings: [],
      totals: {
        itemTotal: 0,
        deliveryFee: 0,
        platformFee: 0,
        gst: 0,
        grandTotal: 0,
        totalItems: 0,
      },
    };
  }

  await cart.populate("restaurant");
  await cart.populate("items.menuItem");

  const warnings = [];
  let cartChanged = false;

  if (cart.restaurant && !cart.restaurant.isActive) {
    warnings.push("The restaurant in your cart is currently unavailable.");
  }

  const nextItems = [];
  const items = [];
  let totalItems = 0;

  for (const cartItem of cart.items) {
    const menuItem = cartItem.menuItem;

    if (!menuItem) {
      cartChanged = true;
      warnings.push("A removed menu item was cleared from your cart.");
      continue;
    }

    nextItems.push({ menuItem: menuItem._id, quantity: cartItem.quantity });

    const lineTotal = menuItem.price * cartItem.quantity;
    totalItems += cartItem.quantity;

    if (!menuItem.isAvailable) {
      warnings.push(`${menuItem.name} is currently unavailable.`);
    }

    items.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      category: menuItem.category,
      price: menuItem.price,
      quantity: cartItem.quantity,
      imageUrl: menuItem.imageUrl,
      isVeg: menuItem.isVeg,
      isAvailable: menuItem.isAvailable,
      lineTotal,
    });
  }

  if (cartChanged) {
    cart.items = nextItems;
    if (cart.items.length === 0) {
      cart.restaurant = null;
    }
    await cart.save();
  }

  const totals = await calculateOrderTotals(items, cart.restaurant);

  return {
    _id: cart._id,
    restaurant: cart.restaurant
      ? {
          _id: cart.restaurant._id,
          name: cart.restaurant.name,
          imageUrl: cart.restaurant.imageUrl,
          address: cart.restaurant.address,
          category: cart.restaurant.category,
          deliveryTime: cart.restaurant.deliveryTime,
          rating: cart.restaurant.rating,
          isActive: cart.restaurant.isActive,
        }
      : null,
    items,
    warnings,
    totals: {
      itemTotal: totals.itemTotal,
      deliveryFee: totals.deliveryFee,
      platformFee: totals.platformFee,
      gst: totals.gst,
      grandTotal: totals.grandTotal,
      totalItems,
      freeDeliveryAbove: totals.freeDeliveryAbove,
      deliveryBaseFee: totals.deliveryBaseFee,
      gstPercent: totals.gstPercent,
    },
    updatedAt: cart.updatedAt,
  };
};

export const getCart = async (req, res) => {
  const cart = await ensureCart(req.user._id);
  const data = await buildCartResponse(cart);

  res.status(200).json({
    success: true,
    data,
  });
};

export const addCartItem = async (req, res) => {
  try {
    const { menuItemId, quantity = 1, replaceCart = false } = req.body;

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    if (!menuItem.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "This item is currently unavailable",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: menuItem.restaurant,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(400).json({
        success: false,
        message: "Restaurant is currently unavailable",
      });
    }

    const cart = await ensureCart(req.user._id);

    if (
      cart.restaurant &&
      String(cart.restaurant) !== String(menuItem.restaurant) &&
      !replaceCart
    ) {
      return res.status(409).json({
        success: false,
        code: "CART_RESTAURANT_MISMATCH",
        message:
          "Your cart contains items from another restaurant. Clear it to continue.",
      });
    }

    if (
      !cart.restaurant ||
      String(cart.restaurant) !== String(menuItem.restaurant)
    ) {
      cart.restaurant = menuItem.restaurant;
      cart.items = [];
    }

    const existingItem = cart.items.find(
      (item) => String(item.menuItem) === String(menuItem._id)
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity) || 1;
    } else {
      cart.items.push({
        menuItem: menuItem._id,
        quantity: Number(quantity) || 1,
      });
    }

    await cart.save();
    const data = await buildCartResponse(cart);

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Unable to update cart",
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    const cart = await ensureCart(req.user._id);
    const item = cart.items.find(
      (cartItem) => String(cartItem.menuItem) === req.params.menuItemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    if (Number(quantity) <= 0) {
      cart.items = cart.items.filter(
        (cartItem) => String(cartItem.menuItem) !== req.params.menuItemId
      );
    } else {
      item.quantity = Number(quantity);
    }

    if (cart.items.length === 0) {
      cart.restaurant = null;
    }

    await cart.save();
    const data = await buildCartResponse(cart);

    res.status(200).json({
      success: true,
      message: "Cart updated",
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Unable to update cart item",
    });
  }
};

export const removeCartItem = async (req, res) => {
  const cart = await ensureCart(req.user._id);

  cart.items = cart.items.filter(
    (item) => String(item.menuItem) !== req.params.menuItemId
  );

  if (cart.items.length === 0) {
    cart.restaurant = null;
  }

  await cart.save();
  const data = await buildCartResponse(cart);

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data,
  });
};

export const clearCart = async (req, res) => {
  const cart = await ensureCart(req.user._id);
  cart.items = [];
  cart.restaurant = null;
  await cart.save();

  const data = await buildCartResponse(cart);

  res.status(200).json({
    success: true,
    message: "Cart cleared",
    data,
  });
};
