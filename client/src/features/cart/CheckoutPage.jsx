import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Skeleton from "../../components/Skeleton.jsx";
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
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: "easeOut" },
};

const SECTION_TONES = {
  default: "bg-white",
  warm: "border-orange-100 bg-[linear-gradient(135deg,#ffffff,#fff7ed)]",
  time: "border-sky-100 bg-[linear-gradient(135deg,#ffffff,#eff6ff)]",
  offer: "border-emerald-100 bg-[linear-gradient(135deg,#ffffff,#f0fdf4)]",
  referral: "border-violet-100 bg-[linear-gradient(135deg,#ffffff,#f5f3ff)]",
  loyalty: "border-amber-100 bg-[linear-gradient(135deg,#ffffff,#fffbeb)]",
  combo: "border-cyan-100 bg-[linear-gradient(135deg,#ffffff,#ecfeff)]",
  items: "border-rose-100 bg-[linear-gradient(135deg,#ffffff,#fff1f2)]",
};

const SectionCard = ({ title, subtitle, aside = null, tone = "default", children }) => (
  <Card className={`p-5 sm:p-6 ${SECTION_TONES[tone] || SECTION_TONES.default}`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
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

const inputClassName =
  "w-full rounded-[18px] border border-[#ece4d7] bg-[#fcfbf8] px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition placeholder:font-semibold placeholder:text-stone-400 focus:border-orange-300 focus:bg-white";

const SchedulePicker = ({ enabled, value, onToggle, onChange }) => {
  const [baseTime] = useState(() => Date.now());
  const minDate = new Date(baseTime + 30 * 60 * 1000);
  const maxDate = new Date(baseTime + 7 * 24 * 60 * 60 * 1000);

  const toInputValue = (date) => {
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return (
    <SectionCard
      title="Delivery time"
      subtitle="Now or later."
      tone="time"
      aside={
        <button
          type="button"
          onClick={onToggle}
          className={`relative h-7 w-12 rounded-full transition ${
            enabled ? "bg-orange-600" : "bg-stone-200"
          }`}
          aria-label="Toggle scheduled order"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
              enabled ? "left-6" : "left-1"
            }`}
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
                min={toInputValue(minDate)}
                max={toInputValue(maxDate)}
                value={value}
                onChange={(event) => onChange(event.target.value)}
              />
            </Field>
            {value ? (
              <div className="mt-4 rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                Scheduled for{" "}
                {new Date(value).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            ) : null}
          </Motion.div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#eadfce] bg-[#fcfbf8] px-4 py-4 text-sm font-semibold text-stone-500">
            Turn on schedule to choose a time.
          </div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
};

const ComboBuilder = ({ restaurantId, onAddCombo }) => {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(500);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCombos = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const response = await api.get(
        `/orders/combo?budget=${budget}&restaurantId=${restaurantId}`
      );
      setCombos(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next && combos.length === 0) {
        loadCombos();
      }
      return next;
    });
  };

  return (
    <SectionCard
      title="Combo ideas"
      subtitle="Build around a budget."
      tone="combo"
      aside={
        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-full border border-[#ece4d7] bg-[#fcfbf8] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-stone-600 transition hover:border-orange-200 hover:bg-orange-50"
        >
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      <AnimatePresence initial={false}>
        {open ? (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-[20px] border border-[#efe8dc] bg-[#fcfbf8] p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-black text-stone-900">Target budget</p>
                <p className="text-lg font-black text-orange-600">
                  {formatCurrency(budget)}
                </p>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-stone-400">
                <span>{formatCurrency(100)}</span>
                <span>{formatCurrency(2000)}</span>
              </div>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant="secondary"
                onClick={loadCombos}
                loading={loading}
              >
                Refresh combos
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : combos.length > 0 ? (
                combos.map((combo, index) => (
                  <div
                    key={`${combo.label}-${index}`}
                    className="rounded-[20px] border border-[#eee7dc] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-stone-950">{combo.label}</p>
                        <p className="mt-1 text-xs font-bold text-emerald-600">
                          Save {formatCurrency(combo.savings)}
                        </p>
                      </div>
                      <p className="text-lg font-black text-orange-600">
                        {formatCurrency(combo.total)}
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {combo.items.map((item) => (
                        <div
                          key={item._id || item.name}
                          className="flex items-center justify-between text-sm font-semibold text-stone-600"
                        >
                          <span className="pr-3">{item.name}</span>
                          <span>{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-4 w-full"
                      size="sm"
                      onClick={() => onAddCombo(combo.items)}
                    >
                      Add this combo
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#eadfce] bg-[#fcfbf8] p-4 text-sm font-semibold text-stone-500">
                  No combo found for this budget.
                </div>
              )}
            </div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </SectionCard>
  );
};

const OrderItemRow = ({ item }) => (
  <div className="flex items-center gap-4 rounded-[20px] border border-[#f1ece4] bg-[#fcfbf8] p-3">
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-stone-100">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
          {item.name?.slice(0, 1) || "F"}
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-stone-950">{item.name}</p>
          <p className="mt-1 text-xs font-bold text-stone-400">
            Qty {item.quantity}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-black text-stone-950">
          {formatCurrency((item.price || 0) * (item.quantity || 1))}
        </p>
      </div>
    </div>
  </div>
);

const SummaryRow = ({ label, value, highlight = false, muted = false }) => (
  <div className="flex items-center justify-between gap-4 text-sm font-semibold">
    <span className={muted ? "text-stone-400" : "text-stone-600"}>{label}</span>
    <span
      className={`text-right font-black ${
        highlight ? "text-orange-600" : muted ? "text-stone-400" : "text-stone-950"
      }`}
    >
      {value}
    </span>
  </div>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, refreshCart, addItem } = useCartContext();
  const { pushNotification } = useNotifications();

  const [address, setAddress] = useState(user?.address || "");
  const [instructions, setInstructions] = useState("");
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

  const maxRedeemable = loyaltyInfo
    ? Math.min(
        loyaltyInfo.points,
        Math.floor((subtotal - promoDiscount - 1) / 10) * 10
      )
    : 0;

  const tier = loyaltyInfo?.tier || "BRONZE";
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;

  useEffect(() => {
    api
      .get("/orders/loyalty")
      .then((response) => setLoyaltyInfo(response.data))
      .catch(() => {});
  }, []);

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

  const handleAddCombo = useCallback(
    async (comboItems) => {
      try {
        for (const item of comboItems) {
          await addItem({ menuItemId: item._id, quantity: 1 });
        }
        await refreshCart();
      } catch {
        setError("Could not add this combo to your cart");
      }
    },
    [addItem, refreshCart]
  );

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      setError("Add your delivery address to continue");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty");
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
        deliveryAddress: address.trim(),
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
      navigate(getCustomerOrderRoute(response.data._id));
    } catch (apiError) {
      setError(apiError?.message || "Could not place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const heroStats = useMemo(
    () => [
      {
        label: "Restaurant",
        value: restaurant?.name || "Checkout",
      },
      {
        label: "ETA",
        value: `${restaurant?.deliveryTime || 30} min`,
      },
      {
        label: "Total",
        value: formatCurrency(grandTotal),
      },
    ],
    [grandTotal, restaurant?.deliveryTime, restaurant?.name]
  );

  if (!cart || items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#eadfce] bg-white p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-orange-50 text-3xl font-black text-orange-600">
          Cart
        </div>
        <h1 className="mt-6 text-3xl font-black text-stone-950">Your cart is empty</h1>
        <Button className="mt-6" size="lg" onClick={() => navigate(appRoutes.customerHome)}>
          Browse restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <Motion.section
        {...fadeUp}
        className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),transparent_30%),linear-gradient(145deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_34px_90px_-60px_rgba(15,23,42,0.42)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate(appRoutes.customerCart)}
              className="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-600 transition hover:border-orange-200 hover:bg-orange-50"
            >
              Back to cart
            </button>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              Checkout
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Review and place order
            </h1>
          </div>
          <div className="grid min-w-[260px] gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[22px] border border-white/90 bg-white/90 px-4 py-4"
              >
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
        <div className="space-y-6">
          <Motion.div {...fadeUp}>
            <SectionCard
              title="Delivery details"
              subtitle="Where should we deliver?"
              tone="warm"
            >
              <div className="grid gap-4">
                <Field label="Delivery address">
                  <textarea
                    rows={4}
                    className={`${inputClassName} min-h-[124px] resize-y`}
                    placeholder="House number, street, area, city"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </Field>
                <Field label="Instructions" hint="Optional">
                  <input
                    className={inputClassName}
                    placeholder="Gate number, landmark, floor, call note"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>
          </Motion.div>

          <Motion.div {...fadeUp}>
            <SchedulePicker
              enabled={scheduleEnabled}
              onToggle={() => setScheduleEnabled((current) => !current)}
              value={scheduledFor}
              onChange={setScheduledFor}
            />
          </Motion.div>

          <Motion.div {...fadeUp} className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Promo code"
              subtitle="Apply an offer."
              tone="offer"
            >
              {promoData ? (
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
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
                  <div className="flex gap-3">
                    <input
                      className={`${inputClassName} flex-1 uppercase tracking-[0.12em]`}
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
                      className="shrink-0"
                      onClick={handleApplyPromo}
                      disabled={!promoInput.trim()}
                      loading={promoLoading}
                    >
                      Apply
                    </Button>
                  </div>
                  {promoError ? (
                    <p className="mt-3 text-sm font-bold text-red-500">{promoError}</p>
                  ) : null}
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Referral code"
              subtitle="Optional"
              tone="referral"
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
                tone="loyalty"
                aside={
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tierConfig.tone}`}
                  >
                    {tierConfig.label}
                  </span>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[1fr,160px]">
                  <div className="rounded-[20px] border border-[#f1ece4] bg-[#fcfbf8] p-4">
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
                    className={`rounded-[20px] border px-4 py-4 text-left transition ${
                      pointsToRedeem > 0
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-[#f1ece4] bg-[#fcfbf8] text-stone-600"
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
                  <div className="mt-4 rounded-[20px] border border-orange-200 bg-orange-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-black text-orange-700">Points to redeem</p>
                      <p className="text-sm font-black text-orange-700">
                        {pointsToRedeem} pts
                      </p>
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

          {restaurantId ? (
            <Motion.div {...fadeUp}>
              <ComboBuilder restaurantId={restaurantId} onAddCombo={handleAddCombo} />
            </Motion.div>
          ) : null}

          <Motion.div {...fadeUp}>
            <SectionCard
              title="Order items"
              subtitle={`${items.length} ${items.length === 1 ? "item" : "items"} from ${restaurant?.name || "your selected restaurant"}.`}
              tone="items"
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <OrderItemRow key={item.menuItemId || item._id || item.name} item={item} />
                ))}
              </div>
            </SectionCard>
          </Motion.div>
        </div>

        <Motion.aside {...fadeUp} className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden">
            <div className="h-44 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
              {restaurant?.imageUrl ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  className="h-full w-full object-cover"
                />
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
              <h2 className="mt-2 text-2xl font-black text-stone-950">
                {restaurant?.name}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
                {restaurant?.address}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-[#fcfbf8] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
                    ETA
                  </p>
                  <p className="mt-1 text-base font-black text-stone-950">
                    {restaurant?.deliveryTime || 30} min
                  </p>
                </div>
                <div className="rounded-[18px] bg-[#fcfbf8] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
                    Rating
                  </p>
                  <p className="mt-1 text-base font-black text-stone-950">
                    {Number(restaurant?.rating || 0).toFixed(1)}
                  </p>
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
                <SummaryRow
                  label={`Promo (${promoData.code})`}
                  value={`-${formatCurrency(promoDiscount)}`}
                  highlight
                />
              ) : null}
              {loyaltyDiscount > 0 ? (
                <SummaryRow
                  label="Loyalty"
                  value={`-${formatCurrency(loyaltyDiscount)}`}
                  highlight
                />
              ) : null}
              <div className="border-t border-orange-100 pt-3">
                <SummaryRow
                  label="To pay"
                  value={formatCurrency(grandTotal)}
                  highlight
                />
              </div>
            </div>

            {totalSavings > 0 ? (
              <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                You are saving {formatCurrency(totalSavings)} on this order.
              </div>
            ) : null}

            {scheduleEnabled && scheduledFor ? (
              <div className="mt-4 rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                Scheduled for{" "}
                {new Date(scheduledFor).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            ) : null}

            <div className="mt-4 rounded-[18px] border border-orange-100 bg-white/80 px-4 py-3 text-sm font-semibold text-stone-600">
              Payment mode: Cash on Delivery
            </div>

            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={!address.trim() || items.length === 0}
              loading={placing}
            >
              {scheduleEnabled ? "Schedule order" : "Place order"}
            </Button>

            {error ? (
              <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            ) : null}

            {!address.trim() ? (
              <p className="mt-3 text-center text-xs font-bold text-orange-600">
                Add address to continue.
              </p>
            ) : null}
          </Card>
        </Motion.aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
