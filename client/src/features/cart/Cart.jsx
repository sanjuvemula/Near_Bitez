import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Loader from "../../components/Loader.jsx";
import { appRoutes } from "../../app/routes.jsx";
import {
  CustomerEmptyState,
  CustomerHero,
  CustomerPanel,
} from "../customer/components/CustomerUi.jsx";
import {
  formatRelativeTime,
  getDeliveryFeeProgress,
} from "../customer/customerShared.js";
import { useCart } from "../../hooks/useCart.js";
import { formatCurrency } from "../../utils/formatters.js";

const Cart = () => {
  const navigate = useNavigate();
  const {
    cart,
    loading,
    clearCart,
    refreshCart,
    updateItemQuantity,
    removeItem,
  } = useCart();

  const [updatingItemId, setUpdatingItemId] = useState("");
  const [clearingCart, setClearingCart] = useState(false);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const unavailableItems = cart?.items?.filter((item) => !item.isAvailable) || [];
  const deliveryFeeProgress = useMemo(
    () => getDeliveryFeeProgress(cart?.totals?.itemTotal || 0),
    [cart?.totals?.itemTotal]
  );

  const checkoutBlocked =
    unavailableItems.length > 0 ||
    !cart?.restaurant?.isActive;

  const heroStats = useMemo(
    () => [
      {
        label: "Items",
        value: cart?.totals?.totalItems || 0,
      },
      {
        label: "Delivery ETA",
        value: cart?.restaurant?.deliveryTime
          ? `${cart.restaurant.deliveryTime} min`
          : "Fast",
      },
      {
        label: "Grand total",
        value: formatCurrency(cart?.totals?.grandTotal || 0),
      },
    ],
    [cart]
  );

  const handleQuantityChange = async (menuItemId, quantity) => {
    try {
      setUpdatingItemId(menuItemId);
      if (quantity <= 0) {
        await removeItem(menuItemId);
      } else {
        await updateItemQuantity(menuItemId, quantity);
      }
    } catch (apiError) {
      toast.error(apiError.message || "Unable to update cart");
    } finally {
      setUpdatingItemId("");
    }
  };

  const handleClearCart = async () => {
    const shouldClear = window.confirm("Clear your current cart?");
    if (!shouldClear) return;
    setClearingCart(true);
    try {
      await clearCart();
      toast.success("Cart cleared");
    } catch (apiError) {
      toast.error(apiError.message || "Unable to clear cart");
    } finally {
      setClearingCart(false);
    }
  };

  if (loading && !cart) {
    return <Loader label="Loading your cart..." />;
  }

  if (!cart?.items?.length) {
    return (
      <CustomerEmptyState
        title="Your cart is empty"
        description="Add items to see your total here."
        action={
          <Button size="lg" onClick={() => navigate(appRoutes.customerHome)}>
            Explore restaurants
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <CustomerHero
        eyebrow="Review your order"
        title={`Checkout from ${cart.restaurant?.name}`}
        description="Review items, pricing, and availability before checkout."
        stats={heroStats}
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate(appRoutes.customerHome)}>
              Add more items
            </Button>
            <Button
              variant="secondary"
              loading={clearingCart}
              onClick={handleClearCart}
            >
              Clear cart
            </Button>
          </div>
        }
      />

      {cart.warnings?.length ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
          {cart.warnings.join(" ")}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
        <section className="space-y-6">
          <CustomerPanel className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                  Cart items
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950">
                  Ready to review before checkout
                </h2>
              </div>
              <p className="text-sm font-semibold text-gray-500">
                Last synced {formatRelativeTime(cart.updatedAt)}
              </p>
            </div>

            {/* Free delivery progress bar */}
            <div className="mt-6 rounded-[26px] bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-gray-950">
                    {deliveryFeeProgress.unlocked
                      ? "Free delivery unlocked"
                      : `${formatCurrency(deliveryFeeProgress.remaining)} away from free delivery`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Unlocks at {formatCurrency(deliveryFeeProgress.threshold)}.
                  </p>
                </div>
                <p className="text-lg font-black text-orange-600">
                  {deliveryFeeProgress.progress}%
                </p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                  style={{ width: `${deliveryFeeProgress.progress}%` }}
                />
              </div>
            </div>
          </CustomerPanel>

          <div className="space-y-4">
            {cart.items.map((item) => (
              <CustomerPanel
                key={item.menuItemId}
                className="grid gap-4 p-5 md:grid-cols-[1fr,180px]"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black tracking-tight text-gray-950">
                          {item.name}
                        </h2>
                        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">
                          {item.isVeg ? "Veg" : "Non-veg"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-gray-600">
                        {item.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                        item.isAvailable
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-black text-gray-950">
                        {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm font-semibold text-gray-500">
                        Line total: {formatCurrency(item.lineTotal)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 p-1.5">
                        <button
                          className="rounded-full bg-white px-3 py-2 text-sm font-black text-orange-600 shadow-sm"
                          onClick={() =>
                            handleQuantityChange(item.menuItemId, item.quantity - 1)
                          }
                          disabled={updatingItemId === item.menuItemId}
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-black text-orange-700">
                          {updatingItemId === item.menuItemId ? "..." : item.quantity}
                        </span>
                        <button
                          className="rounded-full bg-orange-600 px-3 py-2 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() =>
                            handleQuantityChange(item.menuItemId, item.quantity + 1)
                          }
                          disabled={
                            !item.isAvailable || updatingItemId === item.menuItemId
                          }
                        >
                          +
                        </button>
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => handleQuantityChange(item.menuItemId, 0)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Item image */}
                <div className="overflow-hidden rounded-[26px] bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full min-h-[180px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[180px] items-center justify-center text-4xl font-black text-orange-500">
                      {item.name.slice(0, 1)}
                    </div>
                  )}
                </div>
              </CustomerPanel>
            ))}
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          {/* Restaurant card */}
          <CustomerPanel className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[180px,1fr] xl:grid-cols-1">
              <div className="overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
                {cart.restaurant?.imageUrl ? (
                  <img
                    src={cart.restaurant.imageUrl}
                    alt={cart.restaurant.name}
                    className="h-full min-h-[180px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[180px] items-center justify-center text-5xl font-black text-orange-500">
                    {cart.restaurant?.name?.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                  Restaurant
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950">
                  {cart.restaurant?.name}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-gray-500">
                  {cart.restaurant?.address}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      ETA
                    </p>
                    <p className="mt-2 text-lg font-black text-gray-950">
                      {cart.restaurant?.deliveryTime || 30} min
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      Rating
                    </p>
                    <p className="mt-2 text-lg font-black text-gray-950">
                      Rating {Number(cart.restaurant?.rating || 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CustomerPanel>

          {/* Bill summary */}
          <CustomerPanel className="bg-slate-950 p-6 text-white">
            <h2 className="text-2xl font-black tracking-tight">Bill summary</h2>
            <div className="mt-5 space-y-3 text-sm font-semibold text-slate-200">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span className="font-black">{formatCurrency(cart.totals.itemTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery fee</span>
                <span className="font-black">
                  {cart.totals.deliveryFee === 0 ? (
                    <span className="text-emerald-400">FREE</span>
                  ) : (
                    formatCurrency(cart.totals.deliveryFee)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform fee</span>
                <span className="font-black">{formatCurrency(cart.totals.platformFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST (5%)</span>
                <span className="font-black">{formatCurrency(cart.totals.gst)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 text-base">
                <div className="flex items-center justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-orange-400">
                    {formatCurrency(cart.totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={checkoutBlocked}
              onClick={() => navigate(appRoutes.customerCheckout)}
            >
              Proceed to Checkout
            </Button>

            {/* Blocking messages */}
            {!cart.restaurant?.isActive ? (
              <p className="mt-3 text-sm font-semibold text-red-300">
                This restaurant is not accepting orders right now.
              </p>
            ) : null}
            {unavailableItems.length ? (
              <p className="mt-3 text-sm font-semibold text-red-300">
                Remove unavailable items to continue.
              </p>
            ) : null}
          </CustomerPanel>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
