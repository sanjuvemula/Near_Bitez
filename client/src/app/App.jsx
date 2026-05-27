import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import Loader from "../components/Loader.jsx";
import { appRoutes, getCustomerOrderRoute } from "./routes.jsx";
import { useAuth } from "../hooks/useAuth.js";
import Navbar from "../features/navbar/Navbar.jsx";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";
import { NotificationProvider } from "../context/NotificationContext.jsx";
import PwaInstallButton from "../components/PwaInstallButton.jsx";

const Home            = lazy(() => import("../features/home/Home.jsx"));
const CustomerHome    = lazy(() => import("../features/home/CustomerHome.jsx"));
const RestaurantMenu  = lazy(() => import("../features/home/RestaurantMenu.jsx"));
const Cart            = lazy(() => import("../features/cart/Cart.jsx"));
const CheckoutPage    = lazy(() => import("../features/cart/CheckoutPage.jsx"));
const SearchPage      = lazy(() => import("../features/search/SearchPage.jsx"));
const CustomerLogin   = lazy(() => import("../features/auth/CustomerLogin.jsx"));
const CustomerRegister= lazy(() => import("../features/auth/CustomerRegister.jsx"));
const VendorLogin     = lazy(() => import("../features/auth/VendorLogin.jsx"));
const VendorRegister  = lazy(() => import("../features/auth/VendorRegister.jsx"));
const OrdersPage      = lazy(() => import("../features/order/OrdersPage.jsx"));
const OrderTracking   = lazy(() => import("../features/order/OrderTracking.jsx"));
const UserProfile     = lazy(() => import("../features/profile/UserProfile.jsx"));
const VendorDashboard = lazy(() => import("../features/vendor/VendorDashboard.jsx"));
const CustomerShell   = lazy(() => import("../features/customer/CustomerShell.jsx"));
const FavoritesPage   = lazy(() => import("../features/customer/FavoritesPage.jsx"));
const AdminDashboard  = lazy(() => import("../features/admin/AdminDashboard.jsx"));
const TiffinPage = lazy(() => import("../features/tiffin/TiffinPage.jsx"));
const CustomerGamesPage = lazy(() => import("../features/games/CustomerGamesPage.jsx"));
const GamePlayPage = lazy(() => import("../features/games/GamePlayPage.jsx"));

const PublicLayout = () => (
  <div className="relative min-h-screen overflow-x-hidden bg-surface">
    <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),transparent_28%),radial-gradient(circle_at_top_right,_rgba(244,63,94,0.12),transparent_20%),linear-gradient(180deg,rgba(255,247,237,0.92),rgba(248,245,242,0))]" />
    <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.12),transparent_25%),linear-gradient(180deg,rgba(248,245,242,0),rgba(255,255,255,0.6))]" />
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  </div>
);

const LandingRoute = () => {
  const { authReady, loading, user } = useAuth();
  if (!authReady || loading) return <Loader label="Preparing NearBites..." />;
  if (user?.role === "admin")    return <Navigate to="/admin" replace />;
  if (user?.role === "customer") return <Navigate to={appRoutes.customerHome} replace />;
  if (user?.role === "vendor")   return <Navigate to={appRoutes.vendorDashboard} replace />;
  return <Home />;
};

const LegacyOrderRedirect = () => {
  const { id } = useParams();
  return <Navigate to={getCustomerOrderRoute(id)} replace />;
};

const LegacyGameRedirect = () => {
  const { gameSlug } = useParams();
  return <Navigate to={`/app/games/${gameSlug}`} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <Suspense fallback={<Loader label="Loading NearBites..." />}>
          <Routes>
            {/* ── Auth ── */}
            <Route path={appRoutes.customerLogin}    element={<CustomerLogin />} />
            <Route path={appRoutes.customerRegister} element={<CustomerRegister />} />
            <Route path={appRoutes.vendorLogin}      element={<VendorLogin />} />
            <Route path={appRoutes.vendorRegister}   element={<VendorRegister />} />
            <Route path="/login"    element={<Navigate to={appRoutes.customerLogin}    replace />} />
            <Route path="/register" element={<Navigate to={appRoutes.customerRegister} replace />} />

            {/* ── Public ── */}
            <Route element={<PublicLayout />}>
              <Route path={appRoutes.publicHome} element={<LandingRoute />} />
              <Route path="/search"              element={<Navigate to={appRoutes.publicHome} replace />} />
              <Route path="/restaurants/:id"     element={<RestaurantMenu />} />
              <Route path="/restaurant/:id"      element={<RestaurantMenu />} />
            </Route>

            {/* ── Customer Shell (protected) ── */}
            <Route
              path={appRoutes.customerHome}
              element={
                <ProtectedRoute roles={["customer", "admin"]}>
                  <CustomerShell />
                </ProtectedRoute>
              }
            >
              <Route index                          element={<CustomerHome />} />
              <Route path="restaurants/:id"         element={<RestaurantMenu />} />
              <Route path="orders"                  element={<OrdersPage />} />
              <Route path="orders/:id"              element={<OrderTracking />} />
              <Route path="cart"                    element={<Cart />} />
              <Route path="checkout"                element={<CheckoutPage />} />
              <Route path="search"                  element={<SearchPage />} />
              <Route path="profile"                 element={<UserProfile />} />
              <Route path="favorites"               element={<FavoritesPage />} />
              <Route path="tiffin"                  element={<TiffinPage />} />
              <Route path="games"                   element={<CustomerGamesPage />} />
            </Route>

            <Route
              path={appRoutes.customerGame}
              element={
                <ProtectedRoute roles={["customer", "admin"]}>
                  <GamePlayPage />
                </ProtectedRoute>
              }
            />

            {/* ── Legacy redirects ── */}
            <Route path="/cart"         element={<Navigate to={appRoutes.customerCart}    replace />} />
            <Route path="/orders"       element={<Navigate to={appRoutes.customerOrders}  replace />} />
            <Route path="/orders/:id"   element={<LegacyOrderRedirect />} />
            <Route path="/account"      element={<Navigate to={appRoutes.customerProfile} replace />} />
            <Route path="/games"        element={<Navigate to={appRoutes.customerGames}   replace />} />
            <Route path="/games/:gameSlug" element={<LegacyGameRedirect />} />

            {/* ── Vendor ── */}
            <Route
              path={appRoutes.vendorDashboard}
              element={
                <ProtectedRoute roles={["vendor", "admin"]}>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Admin ── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to={appRoutes.publicHome} replace />} />
          </Routes>
        </Suspense>
        <PwaInstallButton />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
