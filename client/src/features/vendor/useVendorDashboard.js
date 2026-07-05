import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import {
  initialMenuForm,
  initialOverview,
  initialRestaurantForm,
  LIVE_ORDER_STATUSES,
  mapMenuItemToFormValues,
  mapRestaurantToFormValues,
  ORDER_FILTERS,
  validateImageFile,
} from "./vendorShared.js";

const createPreviewUrl = (file) => (file ? URL.createObjectURL(file) : "");

export const useVendorDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const isAdminWorkspace = user?.role === "admin";

  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(initialOverview);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [chats, setChats] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [vendorPlan, setVendorPlan] = useState(null);
  const [promos, setPromos] = useState([]);
  const [restaurantOptions, setRestaurantOptions] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");

  const [logistics, setLogistics] = useState({
    location: { lat: 30.9010, lng: 75.8573 },
    deliveryRadiusKm: 5,
    baseDeliveryFee: 40,
    freeDeliveryAbove: 500,
    isSelfDelivery: true,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [restaurantDirty, setRestaurantDirty] = useState(false);
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);
  const [restaurantImagePreview, setRestaurantImagePreview] = useState("");
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [updatingStoreStatus, setUpdatingStoreStatus] = useState(false);

  const extendedMenuForm = { ...initialMenuForm, discountPrice: "", prepTime: "15", spicyLevel: "None" };
  const [menuForm, setMenuForm] = useState(extendedMenuForm);
  const [editingMenuId, setEditingMenuId] = useState("");
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState("");
  const [savingMenu, setSavingMenu] = useState(false);
  const [pendingAvailabilityId, setPendingAvailabilityId] = useState("");
  const [pendingDeleteMenuId, setPendingDeleteMenuId] = useState("");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [pendingOrderId, setPendingOrderId] = useState("");
  const [pendingSubId, setPendingSubId] = useState("");
  const [pendingMessageId, setPendingMessageId] = useState("");
  const [pendingPromoId, setPendingPromoId] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [savingLogistics, setSavingLogistics] = useState(false);

  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("ALL");

  const deferredOrderSearch = useDeferredValue(orderSearch);
  const deferredMenuSearch = useDeferredValue(menuSearch);

  const getVendorPath = useCallback((path) => {
    if (!isAdminWorkspace || !selectedRestaurantId) {
      return path;
    }

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}restaurantId=${encodeURIComponent(selectedRestaurantId)}`;
  }, [isAdminWorkspace, selectedRestaurantId]);

  const hydrateRestaurantForm = useCallback((nextRestaurant) => {
    setRestaurantForm(mapRestaurantToFormValues(nextRestaurant));
    setRestaurantImagePreview(nextRestaurant?.imageUrl || "");
    setRestaurantImageFile(null);
  }, []);

  const resetMenuForm = useCallback(() => {
    setEditingMenuId("");
    setMenuForm(extendedMenuForm);
    setMenuImageFile(null);
    setMenuImagePreview("");
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isAdminWorkspace) {
      setRestaurantOptions([]);
      setSelectedRestaurantId("");
      return () => {
        isMounted = false;
      };
    }

    const loadRestaurantOptions = async () => {
      try {
        const response = await api.get("/admin/restaurants?status=all");
        const options = response.data || [];

        if (!isMounted) {
          return;
        }

        setRestaurantOptions(options);
        setSelectedRestaurantId((current) => {
          if (current && options.some((item) => item._id === current)) {
            return current;
          }

          return options[0]?._id || "";
        });
      } catch (apiError) {
        if (isMounted) {
          toast.error(apiError?.message || "Unable to load restaurants");
        }
      }
    };

    loadRestaurantOptions();

    return () => {
      isMounted = false;
    };
  }, [isAdminWorkspace]);

  useEffect(() => {
    if (!isAdminWorkspace) {
      return;
    }

    setRestaurantDirty(false);
    setRestaurantImageFile(null);
    resetMenuForm();
  }, [isAdminWorkspace, resetMenuForm, selectedRestaurantId]);

  const refreshDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (isAdminWorkspace && !selectedRestaurantId) {
        setOverview(initialOverview);
        setRestaurant(null);
        setMenuItems([]);
        setOrders([]);
        setSubscriptions([]);
        setReviews([]);
        setChats([]);
        setWallet({ balance: 0, totalEarnings: 0, pendingSettlement: 0, history: [] });
        setVendorPlan(null);
        setPromos([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [
          overviewRes, restaurantRes, menuRes, orderRes, subRes, reviewsRes,
          chatsRes, walletRes, planRes, promoRes, logisticsRes,
        ] = await Promise.all([
          api.get(getVendorPath("/vendor/overview")),
          api.get(getVendorPath("/vendor/restaurant")).catch(() => ({ data: null })),
          api.get(getVendorPath("/vendor/menu")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/orders")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/subscriptions")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/reviews")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/chats")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/wallet")).catch(() => ({ data: { balance: 0, totalEarnings: 0, pendingSettlement: 0, history: [] } })),
          api.get(getVendorPath("/vendor/plan")).catch(() => ({ data: null })),
          api.get(getVendorPath("/vendor/promos")).catch(() => ({ data: [] })),
          api.get(getVendorPath("/vendor/logistics")).catch(() => ({ data: null })),
        ]);

        const nextOverview = overviewRes.data || initialOverview;
        const nextRestaurant = restaurantRes.data || nextOverview.restaurant || null;

        setOverview(nextOverview);
        setRestaurant(nextRestaurant);
        setMenuItems(menuRes.data || []);
        setOrders(orderRes.data || []);
        setSubscriptions(subRes.data || []);
        setReviews(reviewsRes.data || []);
        setChats(chatsRes.data || []);
        setWallet(walletRes.data || { balance: 0, totalEarnings: 0, pendingSettlement: 0, history: [] });
        setVendorPlan(planRes.data || null);
        setPromos(promoRes.data || []);

        if (logisticsRes.data) setLogistics(logisticsRes.data);

        setError("");
        setLastSyncedAt(new Date().toISOString());

        if (!restaurantDirty && !restaurantImageFile) hydrateRestaurantForm(nextRestaurant);
      } catch (apiError) {
        const message = apiError?.response?.data?.message || apiError.message || "Unable to load vendor dashboard";
        setError(message);
        if (!silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getVendorPath, hydrateRestaurantForm, isAdminWorkspace, restaurantDirty, restaurantImageFile, selectedRestaurantId]
  );

  useEffect(() => { refreshDashboard(); }, [refreshDashboard]);

  const hasLiveOrders = useMemo(() => orders.some((order) => LIVE_ORDER_STATUSES.includes(order.status)), [orders]);

  useEffect(() => {
    const intervalMs = hasLiveOrders || tab === "orders" || tab === "messages" ? 5000 : 12000;
    const intervalId = setInterval(() => { refreshDashboard({ silent: true }); }, intervalMs);
    return () => clearInterval(intervalId);
  }, [hasLiveOrders, refreshDashboard, tab]);

  useEffect(() => {
    if (!restaurantImageFile) return undefined;
    const previewUrl = createPreviewUrl(restaurantImageFile);
    setRestaurantImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [restaurantImageFile]);

  useEffect(() => {
    if (!menuImageFile) return undefined;
    const previewUrl = createPreviewUrl(menuImageFile);
    setMenuImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [menuImageFile]);

  const menuCategories = useMemo(
    () => ["ALL", ...new Set(menuItems.map((item) => item.category).filter(Boolean))],
    [menuItems]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === "ALL" || order.status === orderStatusFilter;
      const searchPool = [order._id, order.customer?.name, order.customer?.phone, order.deliveryAddress]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && searchPool.includes(deferredOrderSearch.toLowerCase());
    });
  }, [deferredOrderSearch, orderStatusFilter, orders]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = menuCategoryFilter === "ALL" || item.category === menuCategoryFilter;
      const searchPool = [item.name, item.description, item.category].filter(Boolean).join(" ").toLowerCase();
      return matchesCategory && searchPool.includes(deferredMenuSearch.toLowerCase());
    });
  }, [deferredMenuSearch, menuCategoryFilter, menuItems]);

  const orderFilterOptions = useMemo(
    () => ORDER_FILTERS.map((item) => ({
      ...item,
      count: item.id === "ALL" ? orders.length : overview.statusBreakdown[item.id] || 0,
    })),
    [orders.length, overview.statusBreakdown]
  );

  const handleRestaurantImageChange = useCallback((event) => {
    const file = event.target.files?.[0];
    const validationError = validateImageFile(file);
    if (validationError) { toast.error(validationError); event.target.value = ""; return; }
    setRestaurantDirty(true);
    setRestaurantImageFile(file || null);
  }, []);

  const handleMenuImageChange = useCallback((event) => {
    const file = event.target.files?.[0];
    const validationError = validateImageFile(file);
    if (validationError) { toast.error(validationError); event.target.value = ""; return; }
    setMenuImageFile(file || null);
  }, []);

  const buildRestaurantPayload = useCallback((overrides = {}) => {
    const formData = new FormData();
    const nextValues = { ...restaurantForm, ...overrides };
    Object.entries(nextValues).forEach(([key, value]) => { formData.append(key, String(value ?? "")); });
    if (restaurantImageFile) formData.append("image", restaurantImageFile);
    return formData;
  }, [restaurantForm, restaurantImageFile]);

  const saveRestaurant = useCallback(async () => {
    setSavingRestaurant(true);
    try {
      const response = await api.put(getVendorPath("/vendor/restaurant"), buildRestaurantPayload());
      setRestaurant(response.data);
      setOverview((current) => ({ ...current, restaurant: response.data }));
      hydrateRestaurantForm(response.data);
      setRestaurantDirty(false);
      toast.success("Restaurant profile saved");
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Unable to save restaurant profile");
    } finally { setSavingRestaurant(false); }
  }, [buildRestaurantPayload, getVendorPath, hydrateRestaurantForm, refreshDashboard]);

  const updateRestaurantLiveState = useCallback(async (nextState) => {
    setUpdatingStoreStatus(true);
    try {
      const response = await api.put(getVendorPath("/vendor/restaurant"), { isActive: nextState });
      setRestaurant(response.data);
      setOverview((current) => ({ ...current, restaurant: response.data }));
      setRestaurantForm((current) => ({ ...current, isActive: nextState }));
      toast.success(nextState ? "Store is live now" : "Store paused");
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Unable to update store status");
    } finally { setUpdatingStoreStatus(false); }
  }, [getVendorPath, refreshDashboard]);

  const buildMenuPayload = useCallback(() => {
    const formData = new FormData();
    formData.append("name", menuForm.name.trim());
    formData.append("description", menuForm.description.trim());
    formData.append("category", menuForm.category.trim());
    formData.append("price", String(menuForm.price));
    if (menuForm.discountPrice) formData.append("discountPrice", String(menuForm.discountPrice));
    if (menuForm.prepTime) formData.append("prepTime", String(menuForm.prepTime));
    if (menuForm.spicyLevel) formData.append("spicyLevel", menuForm.spicyLevel);
    formData.append("isVeg", String(menuForm.isVeg));
    formData.append("isAvailable", String(menuForm.isAvailable));
    if (menuImageFile) formData.append("image", menuImageFile);
    return formData;
  }, [menuForm, menuImageFile]);

  const validateMenuForm = useCallback(() => {
    if (!menuForm.name.trim()) return "Add a dish name.";
    if (!menuForm.category.trim()) return "Choose a category.";
    if (!Number.isFinite(Number(menuForm.price)) || Number(menuForm.price) <= 0) return "Enter a valid price.";
    if (!menuImageFile && !menuImagePreview) return "Upload a dish image before saving.";
    return "";
  }, [menuForm, menuImageFile, menuImagePreview]);

  const saveMenuItem = useCallback(async () => {
    const validationError = validateMenuForm();
    if (validationError) { toast.error(validationError); return; }

    setSavingMenu(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = { _id: tempId, ...menuForm, imageUrl: menuImagePreview || "", isOptimistic: true };

    setMenuItems((current) => {
      if (editingMenuId) return current.map((item) => (item._id === editingMenuId ? { ...item, ...menuForm, imageUrl: menuImagePreview || item.imageUrl, isOptimistic: true } : item));
      return [optimisticItem, ...current];
    });

    const payload = buildMenuPayload();
    const isEditing = editingMenuId;
    const currentEditId = editingMenuId;

    resetMenuForm();
    setTab("menu");

    try {
      const response = isEditing
        ? await api.put(getVendorPath(`/vendor/menu/${currentEditId}`), payload)
        : await api.post(getVendorPath("/vendor/menu"), payload);
      setMenuItems((current) => current.map((item) => (item._id === tempId || item._id === currentEditId ? response.data : item)));
      toast.success(isEditing ? "Dish updated!" : "Dish published!");
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Failed to save dish.");
      refreshDashboard({ silent: true });
    } finally {
      setSavingMenu(false);
    }
  }, [buildMenuPayload, editingMenuId, getVendorPath, menuForm, menuImagePreview, refreshDashboard, resetMenuForm, validateMenuForm]);

  const startEditingMenuItem = useCallback((item) => {
    setEditingMenuId(item._id);
    setMenuForm({ ...extendedMenuForm, ...mapMenuItemToFormValues(item), discountPrice: item.discountPrice || "", prepTime: item.prepTime || "15", spicyLevel: item.spicyLevel || "None" });
    setMenuImagePreview(item.imageUrl || "");
    setMenuImageFile(null);
    setTab("menu");
  }, []);

  const toggleAvailability = useCallback(async (item) => {
    setPendingAvailabilityId(item._id);
    try {
      const response = await api.patch(getVendorPath(`/vendor/menu/${item._id}/availability`), { isAvailable: !item.isAvailable });
      setMenuItems((current) => current.map((currentItem) => (currentItem._id === item._id ? response.data : currentItem)));
      toast.success(response.data.isAvailable ? "Dish is live now" : "Dish paused");
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Unable to update availability");
      refreshDashboard({ silent: true });
    } finally { setPendingAvailabilityId(""); }
  }, [getVendorPath, refreshDashboard]);

  const deleteMenuItem = useCallback(async (item) => {
    const shouldDelete = window.confirm(`Delete ${item.name} from the menu?`);
    if (!shouldDelete) return;
    setPendingDeleteMenuId(item._id);
    setMenuItems((current) => current.filter((currentItem) => currentItem._id !== item._id));
    toast.success("Dish removed");
    if (editingMenuId === item._id) resetMenuForm();
    try { await api.delete(getVendorPath(`/vendor/menu/${item._id}`)); }
    catch { toast.error("Failed to delete. Reverting..."); refreshDashboard({ silent: true }); }
    finally { setPendingDeleteMenuId(""); }
  }, [editingMenuId, getVendorPath, refreshDashboard, resetMenuForm]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    setPendingOrderId(orderId);
    try {
      const response = await api.patch(getVendorPath(`/vendor/orders/${orderId}/status`), { status });
      setOrders((current) => current.map((order) => (order._id === orderId ? response.data : order)));
      toast.success("Order updated");
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Unable to update order status");
    } finally { setPendingOrderId(""); }
  }, [getVendorPath, refreshDashboard]);

  const updateSubscriptionStatus = useCallback(async (subId, status) => {
    setPendingSubId(subId);
    try {
      const response = await api.patch(getVendorPath(`/vendor/subscriptions/${subId}/status`), { status });
      setSubscriptions((current) => current.map((sub) => (sub._id === subId ? response.data : sub)));
      toast.success(`Subscription marked as ${status}`);
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Unable to update subscription");
    } finally { setPendingSubId(""); }
  }, [getVendorPath, refreshDashboard]);

  const sendMessage = useCallback(async (chatId, text) => {
    setPendingMessageId(chatId);
    try {
      await api.post(getVendorPath(`/vendor/chats/${chatId}/message`), { text });
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || apiError.message || "Failed to send message");
    } finally { setPendingMessageId(""); }
  }, [getVendorPath, refreshDashboard]);

  const createPromoCode = useCallback(async (promoData) => {
    setPendingPromoId("creating");
    try {
      const response = await api.post(getVendorPath("/vendor/promos"), promoData);
      setPromos((current) => [response.data, ...current]);
      toast.success("Promo code activated successfully!");
      return true;
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || "Failed to create promo code.");
      return false;
    } finally { setPendingPromoId(""); }
  }, [getVendorPath]);

  const togglePromoStatus = useCallback(async (promoId, isActive) => {
    setPendingPromoId(promoId);
    try {
      const response = await api.patch(getVendorPath(`/vendor/promos/${promoId}/status`), { isActive });
      setPromos((current) => current.map(p => p._id === promoId ? response.data : p));
      toast.success(isActive ? "Promo code re-activated" : "Promo code disabled");
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || "Failed to update promo status");
    } finally { setPendingPromoId(""); }
  }, [getVendorPath]);

  const deletePromo = useCallback(async (promoId) => {
    try {
      await api.delete(getVendorPath(`/vendor/promos/${promoId}`));
      setPromos((current) => current.filter(p => p._id !== promoId));
      toast.success("Promo deleted");
    } catch (apiError) {
      toast.error(apiError?.message || "Failed to delete promo");
    }
  }, [getVendorPath]);

  const requestPayout = useCallback(async (amount) => {
    setRequestingPayout(true);
    try {
      await api.post(getVendorPath("/vendor/wallet/payout"), { amount });
      toast.success("Withdrawal requested successfully!");
      refreshDashboard({ silent: true });
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || "Failed to request payout");
    } finally { setRequestingPayout(false); }
  }, [getVendorPath, refreshDashboard]);

  const updateVendorPlan = useCallback(async (plan) => {
    try {
      const response = await api.patch(getVendorPath("/vendor/plan"), { plan });
      setVendorPlan(response.data || null);
      toast.success("Plan updated");
      refreshDashboard({ silent: true });
      return true;
    } catch (apiError) {
      toast.error(apiError?.message || "Unable to update plan");
      return false;
    }
  }, [getVendorPath, refreshDashboard]);

  const saveLogistics = useCallback(async (data) => {
    setSavingLogistics(true);
    try {
      const response = await api.put(getVendorPath("/vendor/logistics"), data);
      setLogistics(response.data);
      toast.success("Delivery zone and fees updated!");
      return true;
    } catch (apiError) {
      toast.error(apiError?.response?.data?.message || "Failed to save delivery settings");
      return false;
    } finally { setSavingLogistics(false); }
  }, [getVendorPath]);

  const handleLogout = useCallback(async () => {
    const shouldLogout = window.confirm("Log out from the vendor dashboard?");
    if (!shouldLogout) return;
    await logout();
    navigate("/vendor/login", { replace: true });
  }, [logout, navigate]);

  return {
    tab, setTab, loading, refreshing, lastSyncedAt, error,
    overview, restaurant, menuItems, orders, subscriptions, reviews, chats,
    wallet, vendorPlan, promos, logistics,
    hasLiveOrders, refreshDashboard, handleLogout,

    restaurantForm, setRestaurantForm, restaurantDirty, setRestaurantDirty,
    restaurantImagePreview, handleRestaurantImageChange, saveRestaurant,
    savingRestaurant, updateRestaurantLiveState, updatingStoreStatus, hydrateRestaurantForm,

    menuForm, setMenuForm, editingMenuId, menuImagePreview, handleMenuImageChange,
    saveMenuItem, savingMenu, resetMenuForm, startEditingMenuItem, toggleAvailability,
    pendingAvailabilityId, deleteMenuItem, pendingDeleteMenuId, filteredMenuItems,
    menuSearch, setMenuSearch, menuCategoryFilter, setMenuCategoryFilter, menuCategories,

    filteredOrders, orderSearch, setOrderSearch, orderStatusFilter, setOrderStatusFilter,
    orderFilterOptions, updateOrderStatus, pendingOrderId,

    updateSubscriptionStatus, pendingSubId,
    sendMessage, pendingMessageId,

    createPromoCode, togglePromoStatus, deletePromo, pendingPromoId,
    updateVendorPlan,
    requestPayout, requestingPayout,
    saveLogistics, savingLogistics,
    isAdminWorkspace, restaurantOptions, selectedRestaurantId, setSelectedRestaurantId,
  };
};
