import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cartApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Cart } from "@/types/models";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  /** Item id currently mutating, for per-row spinners. */
  pendingItemId: string | null;
  itemCount: number;
  refresh: () => Promise<void>;
  addItem: (menuItemId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (menuItemId: string, quantity: number) => Promise<void>;
  removeItem: (menuItemId: string) => Promise<void>;
  clear: () => Promise<void>;
  quantityOf: (menuItemId: string) => number;
}

const EMPTY: Cart = {
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

export const CartContext = createContext<CartContextValue>({
  cart: null,
  loading: false,
  pendingItemId: null,
  itemCount: 0,
  refresh: async () => {},
  addItem: async () => false,
  updateQuantity: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  quantityOf: () => 0,
});

/**
 * Cart state, shared so the tab badge and every "add" button stay in sync.
 *
 * Totals are never computed here — each mutation returns the server-rebuilt
 * cart and that becomes the state, keeping the backend the source of truth for
 * pricing, fees and tax.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const isCustomer = user?.role === "customer" || user?.role === "admin";

  const refresh = useCallback(async () => {
    if (!isCustomer) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      setCart(await cartApi.get());
    } catch {
      // Leave the last known cart in place; screens surface their own errors.
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Returns false when the add was rejected — most often because the cart
   * already holds items from another restaurant, which the caller handles by
   * asking whether to start a new cart.
   */
  const addItem = useCallback(
    async (menuItemId: string, quantity = 1) => {
      setPendingItemId(menuItemId);
      try {
        setCart(await cartApi.addItem(menuItemId, quantity));
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add item");
        return false;
      } finally {
        setPendingItemId(null);
      }
    },
    [toast]
  );

  const updateQuantity = useCallback(
    async (menuItemId: string, quantity: number) => {
      setPendingItemId(menuItemId);
      try {
        setCart(
          quantity <= 0
            ? await cartApi.removeItem(menuItemId)
            : await cartApi.updateItem(menuItemId, quantity)
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update cart");
      } finally {
        setPendingItemId(null);
      }
    },
    [toast]
  );

  const removeItem = useCallback(
    async (menuItemId: string) => {
      setPendingItemId(menuItemId);
      try {
        setCart(await cartApi.removeItem(menuItemId));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove item");
      } finally {
        setPendingItemId(null);
      }
    },
    [toast]
  );

  const clear = useCallback(async () => {
    try {
      setCart(await cartApi.clear());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear cart");
    }
  }, [toast]);

  const quantityOf = useCallback(
    (menuItemId: string) => {
      const line = cart?.items.find((item) => {
        const id = typeof item.menuItem === "string" ? item.menuItem : item.menuItem?._id;
        return id === menuItemId;
      });
      return line?.quantity ?? 0;
    },
    [cart]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart: cart ?? (isCustomer ? EMPTY : null),
      loading,
      pendingItemId,
      itemCount: cart?.totals.totalItems ?? 0,
      refresh,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      quantityOf,
    }),
    [
      addItem,
      cart,
      clear,
      isCustomer,
      loading,
      pendingItemId,
      quantityOf,
      refresh,
      removeItem,
      updateQuantity,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
