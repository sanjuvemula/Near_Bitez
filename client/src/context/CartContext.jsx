import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../services/api.js";

const CartContext = createContext(null);
const canUseCart = (role) => role === "customer" || role === "admin";

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, authReady } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || !canUseCart(user?.role)) {
      setCart(null);
      return null;
    }

    setLoading(true);
    try {
      const response = await api.get("/cart");
      setCart(response.data);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    if (!isAuthenticated || !canUseCart(user?.role)) {
      setCart(null);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      return undefined;
    }

    refreshCart();

    pollingRef.current = setInterval(() => {
      refreshCart();
    }, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [authReady, isAuthenticated, refreshCart, user?.role]);

  const addItem = useCallback(
    async ({ menuItemId, quantity = 1, replaceCart = false }) => {
      const response = await api.post("/cart/items", {
        menuItemId,
        quantity,
        replaceCart,
      });
      setCart(response.data);
      return response.data;
    },
    []
  );

  const updateItemQuantity = useCallback(async (menuItemId, quantity) => {
    const response = await api.patch(`/cart/items/${menuItemId}`, { quantity });
    setCart(response.data);
    return response.data;
  }, []);

  const removeItem = useCallback(async (menuItemId) => {
    const response = await api.delete(`/cart/items/${menuItemId}`);
    setCart(response.data);
    return response.data;
  }, []);

  const clearCart = useCallback(async () => {
    const response = await api.delete("/cart");
    setCart(response.data);
    return response.data;
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      refreshCart,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, cart, clearCart, loading, refreshCart, removeItem, updateItemQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};






