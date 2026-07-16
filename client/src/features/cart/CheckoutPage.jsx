import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Loader from "../../components/Loader.jsx";
import { appRoutes, getCustomerOrderRoute } from "../../app/routes.jsx";
import { useCartContext } from "../../context/CartContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";

const TIER_CONFIG = {
  BRONZE: { tone: "text-amber-700 bg-amber-50 border-amber-200", label: "Bronze" },
  SILVER: { tone: "text-slate-700 bg-slate-50 border-slate-200", label: "Silver" },
  GOLD: { tone: "text-yellow-700 bg-yellow-50 border-yellow-200", label: "Gold" },
  PLATINUM: { tone: "text-cyan-700 bg-cyan-50 border-cyan-200", label: "Platinum" },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: "easeOut" },
};

const inputClassName =
  "w-full rounded-xl border border-[#e7ddd0] bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";

const SectionCard = ({ title, subtitle, aside = null, children, className = "" }) => (
  <Card className={`p-5 sm:p-6 ${className}`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {aside}
    </div>
    {children}
  </Card>
);

const Field = ({ label, hint, children }) => (
  <label className="block">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-sm font-black text-stone-900">{label}</span>
      {hint ? <span className="text-xs font-bold text-stone-400">{hint}</span> : null}
    </div>
    {children}
  </label>
);

const SummaryRow = ({ label, value, highlight = false }) => (
  <div className="flex items-center justify-between gap-4 text-sm font-semibold">
    <span className="text-stone-600">{label}</span>
    <span className={`text-right font-black ${highlight ? "text-orange-600" : "text-stone-950"}`}>
      {value}
    </span>
  </div>
);

const toDateTimeLocalValue = (date) => {
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const ScheduleCard = ({ enabled, value, onToggle, onChange }) => {
  const [baseTime] = useState(() => Date.now());
  const minDate = new Date(baseTime + 30 * 60 * 1000);
  const maxDate = new Date(baseTime + 7 * 24 * 60 * 60 * 1000);

  return (
    <SectionCard
      title="Delivery time"
      subtitle="Order now, or schedule for later."
      className="bg-[linear-gradient(135deg,#ffffff,#eff6ff)]"
      aside={
        <button
          type="button"
          onClick={onToggle}
          className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-orange-600" : "bg-stone-200"}`}
          aria-label="Toggle scheduled order"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`}
          />
        </button>
      }
    >
      <AnimatePresence initial={false}>
        {enabled ? (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Field label="Scheduled for" hint="Next 7 days">
              <input
                type="datetime-local"
                className={inputClassName}
                min={toDateTimeLocalValue(minDate)}
                max={toDateTimeLocalValue(maxDate)}
                value={value}
                onChange={(event) => onChange(event.target.value)}
              />
            </Field>
          </Motion.div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#eadfce] bg-white px-4 py-4 text-sm font-semibold text-stone-500">
            Keep this off for immediate delivery.
          </div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
};

const OrderItemRow = ({ item, pending, onQuantityChange }) => (
  <div className="grid gap-3 rounded-xl border border-[#eee7dc] bg-[#fffaf5] p-3 sm:grid-cols-[64px,minmax(0,1fr),auto] sm:items-center">
    <div className="h-16 w-16 overflow-hidden rounded-xl bg-stone-100">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
          {item.name?.slice(0, 1) || "F"}
        </div>
      )}
    </div>

    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-stone-950">{item.name}</p>
          <p className="mt-1 text-xs font-bold text-stone-500">
            {formatCurrency(item.price)} x {item.quantity}
            {item.isAvailable === false ? " - unavailable" : ""}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-black text-stone-950">
          {formatCurrency((item.price || 0) * (item.quantity || 1))}
        </p>
      </div>
    </div>

    <div className="flex items-center justify-between gap-2 sm:justify-end">
      <div className="flex h-10 items-center overflow-hidden rounded-xl border border-orange-200 bg-white">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center text-base font-black text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
          onClick={() => onQuantityChange(item.menuItemId, item.quantity - 1)}
          disabled={pending}
        >
          -
        </button>
        <span className="min-w-9 text-center text-sm font-black text-stone-950">
          {pending ? "..." : item.quantity}
        </span>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center bg-orange-600 text-base font-black text-white transition hover:bg-orange-700 disabled:opacity-50"
          onClick={() => onQuantityChange(item.menuItemId, item.quantity + 1)}
          disabled={pending || item.isAvailable === false}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="rounded-xl border border-[#e7ddd0] bg-white px-3 py-2 text-xs font-black text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        onClick={() => onQuantityChange(item.menuItemId, 0)}
        disabled={pending}
      >
        Remove
      </button>
    </div>
  </div>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const {
    cart,
    loading,
    refreshCart,
    updateItemQuantity,
    removeItem,
    clearCart,
  } = useCartContext();
  const { pushNotification } = useNotifications();

  const [addressType, setAddressType] = useState("Home");
  const [address, setAddress] = useState(user?.address || "");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [instructions, setInstructions] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [clearingCart, setClearingCart] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoData, setPromoData] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    api
      .get("/orders/loyalty")
      .then((response) => setLoyaltyInfo(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setAddress((current) => current || user?.address || "");
    setPhone((current) => current || user?.phone || "");
  }, [user?.address, user?.phone]);

  const items = cart?.items || [];
  const restaurant = cart?.restaurant || null;
  const restaurantId = restaurant?._id || restaurant;

  const itemTotal =
    cart?.totals?.itemTotal ??
    items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
  const deliveryFee = cart?.totals?.deliveryFee ?? (itemTotal >= 500 ? 0 : 40);
  const platformFee = cart?.totals?.platformFee ?? (itemTotal > 0 ? 5 : 0);
  const gst = cart?.totals?.gst ?? Math.round(itemTotal * 0.05);
  const subtotal = itemTotal + deliveryFee + platformFee + gst;
  const promoDiscount = Number(promoData?.discount || 0);
  const loyaltyDiscount = Math.floor(pointsToRedeem / 10);
  const grandTotal = Math.max(1, subtotal - promoDiscount - loyaltyDiscount);
  const totalSavings = promoDiscount + loyaltyDiscount + (deliveryFee === 0 ? 40 : 0);
  const unavailableItems = items.filter((item) => item.isAvailable === false);
  const restaurantUnavailable = restaurant && restaurant.isActive === false;
  const phoneDigits = phone.replace(/\D/g, "");
  const addressReady = address.trim().length >= 12;
  const phoneReady = phoneDigits.length >= 10;
  const deliveryReady = addressReady && phoneReady;
  const checkoutBlocked =
    !deliveryReady ||
    items.length === 0 ||
    unavailableItems.length > 0 ||
    restaurantUnavailable;

  const maxRedeemable = loyaltyInfo
    ? Math.min(
        loyaltyInfo.points,
        Math.floor((subtotal - promoDiscount - 1) / 10) * 10
      )
    : 0;
  const tierConfig = TIER_CONFIG[loyaltyInfo?.tier || "BRONZE"] || TIER_CONFIG.BRONZE;

  useEffect(() => {
    if (pointsToRedeem > maxRedeemable) {
      setPointsToRedeem(maxRedeemable);
    }
  }, [maxRedeemable, pointsToRedeem]);

  const buildDeliveryAddress = useCallback(() => {
    const parts = [
      addressType ? `${addressType}: ${address.trim()}` : address.trim(),
      landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
    ].filter(Boolean);

    return parts.join("\n");
  }, [address, addressType, landmark]);

  const handleQuantityChange = async (menuItemId, quantity) => {
    setError("");
    try {
      setUpdatingItemId(menuItemId);
      if (quantity <= 0) {
        await removeItem(menuItemId);
      } else {
        await updateItemQuantity(menuItemId, quantity);
      }
    } catch (apiError) {
      setError(apiError.message || "Unable to update cart");
    } finally {
      setUpdatingItemId("");
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Clear your current cart?")) return;
    setClearingCart(true);
    setError("");
    try {
      await clearCart();
    } catch (apiError) {
      setError(apiError.message || "Unable to clear cart");
    } finally {
      setClearingCart(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoData(null);

    try {
      const response = await api.post("/orders/validate-promo", {
        code: promoInput.trim(),
        restaurantId,
        orderTotal: itemTotal,
      });

      setPromoData(response.data);
      pushNotification?.({
        type: "PROMO",
        title: "Promo applied",
        message: `${response.data.code} saves ${formatCurrency(response.data.discount)}`,
      });
    } catch (apiError) {
      setPromoError(apiError?.message || "Invalid or expired promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!addressReady) {
      setError("Add a complete delivery address with house number, street, area, and city");
      return;
    }
    if (!phoneReady) {
      setError("Add a valid 10 digit mobile number for delivery");
      return;
    }
    if (unavailableItems.length > 0) {
      setError("Remove unavailable items to place this order");
      return;
    }
    if (restaurantUnavailable) {
      setError("This restaurant is not accepting orders right now");
      return;
    }
    if (scheduleEnabled && !scheduledFor) {
      setError("Choose a delivery time for the scheduled order");
      return;
    }

    setPlacing(true);
    setError("");

    try {
      const response = await api.post("/orders", {
        deliveryAddress: buildDeliveryAddress(),
        deliveryPhone: phone.trim(),
        deliveryInstructions: instructions.trim(),
        promoCode: promoData?.code || undefined,
        pointsToRedeem: pointsToRedeem || 0,
        scheduledFor:
          scheduleEnabled && scheduledFor
            ? new Date(scheduledFor).toISOString()
            : undefined,
        referralCode: referralCode.trim() || undefined,
      });

      const earnedCoins = Math.max(25, Math.round(grandTotal / 10));
      window.localStorage.setItem("nearBites:lastCoinGain", String(earnedCoins));
      pushNotification?.({
        type: "XP_GAIN",
        title: "NearCoins earned",
        message: `+${earnedCoins} NearCoins unlocked with this order`,
      });

      await refreshCart();
      await refreshUser?.();
      navigate(getCustomerOrderRoute(response.data._id));
    } catch (apiError) {
      setError(apiError?.message || "Could not place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const heroStats = useMemo(
    () => [
      { label: "Items", value: cart?.totals?.totalItems || 0 },
      { label: "ETA", value: `${restaurant?.deliveryTime || 30} min` },
      { label: "To pay", value: formatCurrency(grandTotal) },
    ],
    [cart?.totals?.totalItems, grandTotal, restaurant?.deliveryTime]
  );

  if (loading && !cart) {
    return <Loader label="Loading your cart..." />;
  }

  if (!cart || items.length === 0) {
    return (
      <Card className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center border-dashed p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-2xl font-black text-orange-600">
          +
        </div>
        <h1 className="mt-6 text-3xl font-black text-stone-950">Your cart is empty</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-stone-500">
          Add dishes from a restaurant and this page will become your complete order form.
        </p>
        <Button className="mt-6" size="lg" onClick={() => navigate(appRoutes.customerHome)}>
          Explore restaurants
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <Motion.section
        {...fadeUp}
        className="overflow-hidden rounded-2xl border border-[#eee7dc] bg-[linear-gradient(180deg,#ffffff,#fffaf5)] p-5 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              One-page order
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
              Cart and delivery details
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-stone-500">
              Review items, confirm address and phone, then place the order from this screen.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate(appRoutes.customerHome)}>
                Add more items
              </Button>
              <Button variant="secondary" loading={clearingCart} onClick={handleClearCart}>
                Clear cart
              </Button>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[360px]">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[#eee7dc] bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-black text-stone-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="min-w-0 space-y-6">
          <Motion.div {...fadeUp}>
            <SectionCard
              title="Delivery address"
              subtitle="Add the full address and mobile number the restaurant can use."
              className="bg-[linear-gradient(135deg,#ffffff,#fff7ed)]"
            >
              <div className="space-y-4">
                {user?.address ? (
                  <button
                    type="button"
                    onClick={() => setAddress(user.address || "")}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      address.trim() === user.address?.trim()
                        ? "border-orange-200 bg-orange-50"
                        : "border-[#eee7dc] bg-white hover:bg-[#fffaf5]"
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
                      Saved address
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-stone-700">
                      {user.address}
                    </p>
                  </button>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  {["Home", "Work", "Other"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressType(type)}
                      className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                        addressType === type
                          ? "border-orange-200 bg-orange-600 text-white shadow-[0_18px_32px_-24px_rgba(234,88,12,0.85)]"
                          : "border-[#eee7dc] bg-white text-stone-600 hover:bg-orange-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),260px]">
                  <Field label="Complete address" hint="Required">
                    <textarea
                      rows={4}
                      className={`${inputClassName} min-h-[124px] resize-y`}
                      placeholder="House or flat number, street, area, city and pincode"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </Field>
                  <Field label="Mobile number" hint="Required">
                    <input
                      type="tel"
                      inputMode="tel"
                      className={inputClassName}
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    <p className={`mt-2 text-xs font-bold ${phoneReady ? "text-emerald-600" : "text-orange-600"}`}>
                      {phoneReady ? "Delivery contact ready" : "Enter at least 10 digits"}
                    </p>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Landmark or floor" hint="Helpful">
                    <input
                      className={inputClassName}
                      placeholder="Near gate, floor, building, shop"
                      value={landmark}
                      onChange={(event) => setLandmark(event.target.value)}
                    />
                  </Field>
                  <Field label="Delivery instructions" hint="Optional">
                    <input
                      className={inputClassName}
                      placeholder="Call before arrival, leave at reception"
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                    />
                  </Field>
                </div>

                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                    deliveryReady
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
                >
                  {deliveryReady
                    ? "Address and phone are ready for delivery."
                    : "Complete address and mobile number are required before placing the order."}
                </div>
              </div>
            </SectionCard>
          </Motion.div>

          <Motion.div {...fadeUp}>
            <SectionCard
              title="Order items"
              subtitle={`${items.length} ${items.length === 1 ? "item" : "items"} from ${restaurant?.name || "your selected restaurant"}.`}
              className="bg-[linear-gradient(135deg,#ffffff,#fff7ed)]"
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <OrderItemRow
                    key={item.menuItemId || item._id || item.name}
                    item={item}
                    pending={updatingItemId === item.menuItemId}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>

              {unavailableItems.length ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  Remove unavailable items before placing the order.
                </div>
              ) : null}
            </SectionCard>
          </Motion.div>

          <Motion.div {...fadeUp}>
            <ScheduleCard
              enabled={scheduleEnabled}
              value={scheduledFor}
              onToggle={() => setScheduleEnabled((current) => !current)}
              onChange={setScheduledFor}
            />
          </Motion.div>

          <Motion.div {...fadeUp} className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Promo code"
              subtitle="Apply an offer."
              className="bg-[linear-gradient(135deg,#ffffff,#f0fdf4)]"
            >
              {promoData ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-emerald-700">
                        {promoData.code} applied
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        You save {formatCurrency(promoData.discount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoData(null);
                        setPromoInput("");
                        setPromoError("");
                      }}
                      className="text-xs font-black uppercase tracking-[0.12em] text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),auto]">
                    <input
                      className={`${inputClassName} uppercase tracking-[0.12em]`}
                      placeholder="ENTER CODE"
                      value={promoInput}
                      onChange={(event) => {
                        setPromoInput(event.target.value.toUpperCase());
                        setPromoError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={handleApplyPromo}
                      disabled={!promoInput.trim()}
                      loading={promoLoading}
                    >
                      Apply
                    </Button>
                  </div>
                  {promoError ? <p className="mt-3 text-sm font-bold text-red-500">{promoError}</p> : null}
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Referral code"
              subtitle="Optional"
              className="bg-[linear-gradient(135deg,#ffffff,#f5f3ff)]"
            >
              <input
                className={`${inputClassName} uppercase tracking-[0.12em]`}
                placeholder="FRIEND CODE"
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
              />
            </SectionCard>
          </Motion.div>

          {loyaltyInfo ? (
            <Motion.div {...fadeUp}>
              <SectionCard
                title="Loyalty points"
                subtitle="Use points on this order."
                className="bg-[linear-gradient(135deg,#ffffff,#fffbeb)]"
                aside={
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tierConfig.tone}`}>
                    {tierConfig.label}
                  </span>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),170px]">
                  <div className="rounded-xl border border-[#eee7dc] bg-white p-4">
                    <p className="text-sm font-black text-stone-950">
                      {loyaltyInfo.points} points available
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      Worth {formatCurrency(Math.floor(loyaltyInfo.points / 10))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPointsToRedeem((current) =>
                        current > 0 ? 0 : Math.min(maxRedeemable, loyaltyInfo.points)
                      )
                    }
                    disabled={maxRedeemable <= 0}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      pointsToRedeem > 0
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-[#eee7dc] bg-white text-stone-600"
                    } ${maxRedeemable <= 0 ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.12em]">
                      Use points
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {maxRedeemable > 0 ? "Apply points" : "Not available"}
                    </p>
                  </button>
                </div>

                {pointsToRedeem > 0 ? (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-black text-orange-700">Points to redeem</p>
                      <p className="text-sm font-black text-orange-700">{pointsToRedeem} pts</p>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={maxRedeemable}
                      step={10}
                      value={pointsToRedeem}
                      onChange={(event) => setPointsToRedeem(Number(event.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="mt-3 flex items-center justify-between text-sm font-bold text-orange-700">
                      <span>Loyalty discount</span>
                      <span>-{formatCurrency(loyaltyDiscount)}</span>
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            </Motion.div>
          ) : null}
        </div>

        <Motion.aside {...fadeUp} className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden">
            <div className="h-44 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
              {restaurant?.imageUrl ? (
                <img src={restaurant.imageUrl} alt={restaurant.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-orange-600">
                  {restaurant?.name?.slice(0, 1) || "R"}
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
                Restaurant
              </p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">{restaurant?.name}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
                {restaurant?.address}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#fffaf5] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">ETA</p>
                  <p className="mt-1 text-base font-black text-stone-950">{restaurant?.deliveryTime || 30} min</p>
                </div>
                <div className="rounded-xl bg-[#fffaf5] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">Rating</p>
                  <p className="mt-1 text-base font-black text-stone-950">{Number(restaurant?.rating || 0).toFixed(1)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-orange-100 bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#ecfeff)] p-5 text-stone-950">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
              Bill summary
            </p>
            <div className="mt-5 space-y-3">
              <SummaryRow label="Item total" value={formatCurrency(itemTotal)} />
              <SummaryRow
                label="Delivery fee"
                value={deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee)}
                highlight={deliveryFee === 0}
              />
              <SummaryRow label="Platform fee" value={formatCurrency(platformFee)} />
              <SummaryRow label="GST" value={formatCurrency(gst)} />
              {promoDiscount > 0 ? (
                <SummaryRow label={`Promo (${promoData.code})`} value={`-${formatCurrency(promoDiscount)}`} highlight />
              ) : null}
              {loyaltyDiscount > 0 ? (
                <SummaryRow label="Loyalty" value={`-${formatCurrency(loyaltyDiscount)}`} highlight />
              ) : null}
              <div className="border-t border-orange-100 pt-3">
                <SummaryRow label="To pay" value={formatCurrency(grandTotal)} highlight />
              </div>
            </div>

            {totalSavings > 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                You are saving {formatCurrency(totalSavings)} on this order.
              </div>
            ) : null}

            {scheduleEnabled && scheduledFor ? (
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                Scheduled for{" "}
                {new Date(scheduledFor).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-orange-100 bg-white/80 px-4 py-3 text-sm font-semibold text-stone-600">
              Payment mode: Cash on Delivery
            </div>

            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={checkoutBlocked}
              loading={placing}
            >
              {scheduleEnabled ? "Schedule order" : "Place order"}
            </Button>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            ) : null}

            {!deliveryReady ? (
              <p className="mt-3 text-center text-xs font-bold text-orange-600">
                Address and phone are required.
              </p>
            ) : null}
            {restaurantUnavailable ? (
              <p className="mt-3 text-center text-xs font-bold text-red-600">
                This restaurant is not accepting orders right now.
              </p>
            ) : null}
          </Card>
        </Motion.aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
