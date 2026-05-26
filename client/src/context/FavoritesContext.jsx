import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../services/api.js";

const FavoritesContext = createContext(null);
const canUseFavorites = (role) => role === "customer" || role === "admin";

export const FavoritesProvider = ({ children }) => {
  const { authReady, isAuthenticated, user } = useAuth();
  const [favorites, setFavorites]   = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [pendingIds, setPendingIds] = useState([]);

  const resetFavorites = useCallback(() => {
    setFavorites([]);
    setFavoriteIds([]);
    setPendingIds([]);
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated || !canUseFavorites(user?.role)) {
      resetFavorites();
      return [];
    }

    setLoading(true);
    try {
      // ── FIXED: correct endpoint is /auth/favorites ─────────────────────────
      const response = await api.get("/auth/favorites");
      // api.js returns { success, data } — response.data is the array
      const nextFavorites = Array.isArray(response.data) ? response.data : [];
      setFavorites(nextFavorites);
      setFavoriteIds(nextFavorites.map((r) => String(r._id)));
      return nextFavorites;
    } catch {
      // Non-critical — silently fail, don't crash the app
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, resetFavorites, user?.role]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated || !canUseFavorites(user?.role)) {
      resetFavorites();
      return;
    }
    refreshFavorites();
  }, [authReady, isAuthenticated, refreshFavorites, resetFavorites, user?.role]);

  const isFavorite = useCallback(
    (restaurantId) => favoriteIds.includes(String(restaurantId)),
    [favoriteIds]
  );

  const isPending = useCallback(
    (restaurantId) => pendingIds.includes(String(restaurantId)),
    [pendingIds]
  );

  const toggleFavorite = useCallback(
    async (restaurant) => {
      const restaurantId =
        typeof restaurant === "string" ? restaurant : restaurant?._id;

      if (!restaurantId) throw new Error("Restaurant id is required");

      const id = String(restaurantId);
      const currentlyFavorite = favoriteIds.includes(id);

      // Optimistic update
      setPendingIds((prev) => [...prev, id]);

      if (currentlyFavorite) {
        setFavoriteIds((prev) => prev.filter((item) => item !== id));
        setFavorites((prev) => prev.filter((item) => String(item._id) !== id));
      } else if (restaurant && typeof restaurant === "object") {
        setFavoriteIds((prev) => [...new Set([...prev, id])]);
        setFavorites((prev) => [
          restaurant,
          ...prev.filter((item) => String(item._id) !== id),
        ]);
      }

      try {
        // ── FIXED: correct endpoints ──────────────────────────────────────────
        const response = currentlyFavorite
          ? await api.delete(`/auth/favorites/${id}`)
          : await api.put(`/auth/favorites/${id}`, {});

        // Sync with server-returned ids
        const nextIds = response.data?.favoriteRestaurantIds || [];
        setFavoriteIds(nextIds);

        // If adding a new restaurant (no full object), re-fetch for image/data
        if (!currentlyFavorite && (!restaurant || typeof restaurant === "string")) {
          await refreshFavorites();
        }

        return !currentlyFavorite;
      } catch (error) {
        // Rollback on error
        await refreshFavorites();
        throw error;
      } finally {
        setPendingIds((prev) => prev.filter((item) => item !== id));
      }
    },
    [favoriteIds, refreshFavorites]
  );

  const value = useMemo(
    () => ({
      favorites,
      favoriteIds,
      loading,
      refreshFavorites,
      toggleFavorite,
      isFavorite,
      isPending,
    }),
    [favorites, favoriteIds, loading, refreshFavorites, toggleFavorite, isFavorite, isPending]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
};
