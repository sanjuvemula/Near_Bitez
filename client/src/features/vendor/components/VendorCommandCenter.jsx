import { motion } from "framer-motion";

/**
 * Dashboard header.
 *
 * Deliberately free of system jargon (record ids, sync state) — a restaurant
 * owner acts on whether they are open and how many orders are waiting, not on
 * internal plumbing. Refreshing happens on its own, so no manual button.
 */
const VendorCommandCenter = ({
  isAdminWorkspace = false,
  overview,
  restaurant,
  restaurantOptions = [],
  selectedRestaurantId = "",
  setSelectedRestaurantId,
  onToggleStatus,
  updatingStatus,
}) => {
  const stats = overview?.stats || {};
  const isOpen = Boolean(restaurant?.isActive);
  const firstName = restaurant?.name?.split(" ")[0] || "there";

  return (
    <div className="mb-6 overflow-hidden rounded-[20px] border border-accent/25 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)] shadow-[0_26px_60px_-42px_rgba(249,115,22,0.3)] dark:border-accent/30 dark:bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(236,72,153,0.08)_58%,rgba(42,38,47,0.6))]">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight text-heading">
            Hi {firstName}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted">
            {isOpen
              ? stats.liveOrders > 0
                ? `${stats.liveOrders} ${stats.liveOrders === 1 ? "order" : "orders"} need your attention`
                : "You're open and ready for orders"
              : "Your store is closed — customers can't order right now"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdminWorkspace && restaurantOptions.length > 0 ? (
            <label className="min-w-[200px]">
              <span className="sr-only">Restaurant</span>
              <select
                value={selectedRestaurantId}
                onChange={(event) => setSelectedRestaurantId?.(event.target.value)}
                className="w-full rounded-xl border border-accent/25 bg-card px-3 py-2 text-sm font-semibold text-heading outline-none transition-colors focus:border-accent/60 focus:ring-4 focus:ring-accent/15"
              >
                {restaurantOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Primary store control: a switch, so the current state is obvious
              and one tap changes it. */}
          <button
            type="button"
            onClick={onToggleStatus}
            disabled={!onToggleStatus || updatingStatus || !restaurant}
            aria-pressed={isOpen}
            className={`group flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isOpen
                ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                : "border-rose-300 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
            }`}
          >
            <span
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                isOpen ? "bg-emerald-500" : "bg-rose-400 dark:bg-rose-500/70"
              }`}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 600, damping: 34 }}
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${
                  isOpen ? "right-1" : "left-1"
                }`}
              />
            </span>
            <span className="text-left">
              <span
                className={`block text-sm font-bold leading-tight ${
                  isOpen
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {updatingStatus ? "Saving…" : isOpen ? "Open" : "Closed"}
              </span>
              <span className="block text-[11px] font-medium text-muted">
                {isOpen ? "Tap to close" : "Tap to open"}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorCommandCenter;
