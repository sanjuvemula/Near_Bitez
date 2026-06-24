import { useEffect, useState } from "react";
import { api } from "../../services/api.js";

const BLOCKED_STATUSES = new Set(["REJECTED", "CANCELLED"]);

const isEligibleOrder = (order) =>
  Boolean(order?._id) && !BLOCKED_STATUSES.has(String(order.status || "").toUpperCase());

const getOrdersArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const useOrderGameAccess = (orderId = "") => {
  const [state, setState] = useState({
    loading: true,
    unlocked: false,
    order: null,
    message: "",
  });

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      setState((current) => ({ ...current, loading: true }));
      try {
        if (orderId) {
          const response = await api.get(`/orders/${orderId}`);
          const order = response?.data || response;
          if (!mounted) return;
          setState({
            loading: false,
            unlocked: isEligibleOrder(order),
            order: isEligibleOrder(order) ? order : null,
            message: isEligibleOrder(order)
              ? ""
              : "This order cannot unlock games right now.",
          });
          return;
        }

        const response = await api.get("/orders");
        const orders = getOrdersArray(response?.data || response);
        const order = orders.find(isEligibleOrder) || null;
        if (!mounted) return;
        setState({
          loading: false,
          unlocked: Boolean(order),
          order,
          message: order ? "" : "Place your first order to unlock the game zone.",
        });
      } catch (error) {
        if (!mounted) return;
        setState({
          loading: false,
          unlocked: false,
          order: null,
          message: error.message || "Could not verify order access.",
        });
      }
    };

    checkAccess();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  return state;
};

export default useOrderGameAccess;
