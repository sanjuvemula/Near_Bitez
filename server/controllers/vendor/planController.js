import {
  applyVendorPlan,
  buildVendorPlanPayload,
} from "../../services/vendorPlanService.js";
import { getVendorRestaurant } from "./shared.js";

export const getVendorPlan = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  }

  const payload = await buildVendorPlanPayload(restaurant);
  res.status(200).json({ success: true, data: payload });
};

export const updateVendorPlan = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const payload = await applyVendorPlan(restaurant, req.body.plan);
    res.status(200).json({
      success: true,
      message: "Restaurant plan updated",
      data: payload,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Unable to update restaurant plan",
    });
  }
};
