/**
 * Single import surface for every backend module.
 *
 * Screens import from here and never build a URL inline, so a route change is
 * a one-file edit.
 */
export { authApi } from "./auth";
export { restaurantApi, cartApi, orderApi } from "./catalog";
export type { CreateOrderPayload } from "./catalog";
export { vendorApi } from "./vendor";
export { adminApi } from "./admin";
export { gameApi } from "./games";
export { notificationApi } from "./notifications";
export {
  tiffinApi,
  chatApi,
  reviewApi,
  promoApi,
  favoriteApi,
  settingsApi,
  feedbackApi,
} from "./misc";
