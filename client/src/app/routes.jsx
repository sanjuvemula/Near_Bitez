export const appRoutes = {
  publicHome: "/",
  customerHome: "/app",
  customerLogin: "/customer/login",
  customerRegister: "/customer/register",
  vendorLogin: "/vendor/login",
  vendorRegister: "/vendor/register",
  customerCart: "/app/cart",
  customerCheckout:  "/app/checkout",
  customerOrders: "/app/orders",
  customerProfile: "/app/profile",
  customerFavorites: "/app/favorites",
  customerTiffin: "/app/tiffin",
  customerGames: "/app/games",
  customerGame: "/app/games/:gameSlug",
  vendorDashboard: "/vendor/dashboard",
  customerSearch: "/app/search",
  
};

export const getPublicRestaurantRoute = (restaurantId) =>
  `/restaurants/${restaurantId}`;

export const getCustomerRestaurantRoute = (restaurantId) =>
  `/app/restaurants/${restaurantId}`;

export const getRestaurantRoute = (user, restaurantId) =>
  user?.role === "customer" || user?.role === "admin"
    ? getCustomerRestaurantRoute(restaurantId)
    : getPublicRestaurantRoute(restaurantId);

export const getCustomerOrderRoute = (orderId) => `/app/orders/${orderId}`;

export const getCustomerGameRoute = (gameSlug) => `/app/games/${gameSlug}`;
