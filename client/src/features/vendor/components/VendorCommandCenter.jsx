import { VendorButton } from "./VendorUi.jsx";
import { formatSyncLabel } from "../vendorShared.js";

const VendorCommandCenter = ({
  isAdminWorkspace = false,
  lastSyncedAt,
  onRefresh,
  overview,
  refreshing,
  restaurant,
  restaurantOptions = [],
  selectedRestaurantId = "",
  setSelectedRestaurantId,
}) => {
  const stats = overview?.stats || {};

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-[20px] border border-orange-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)] p-5 shadow-[0_26px_60px_-42px_rgba(249,115,22,0.3)] md:flex-row md:items-center">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-950">
          Welcome back, {restaurant?.name?.split(" ")[0] || "Vendor"}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-stone-500">
          <span>ID: {restaurant?._id?.slice(-6) || "N/A"}</span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-80" />
            {formatSyncLabel(lastSyncedAt)}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 md:border-l md:border-orange-200 md:pl-6">
        {isAdminWorkspace && restaurantOptions.length > 0 ? (
          <label className="min-w-[220px]">
            <span className="sr-only">Restaurant</span>
            <select
              value={selectedRestaurantId}
              onChange={(event) => setSelectedRestaurantId?.(event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 outline-none transition-colors focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              {restaurantOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Queue
          </p>
          <p className="text-xl font-bold text-orange-600">
            {stats.liveOrders || 0}
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Done
          </p>
          <p className="text-xl font-bold text-emerald-600">
            {stats.todayOrders || 0}
          </p>
        </div>
        <VendorButton
          tone="secondary"
          loading={refreshing}
          onClick={onRefresh}
          className="ml-2 !min-h-0 !px-3 !py-1.5 !text-xs"
        >
          Sync
        </VendorButton>
      </div>
    </div>
  );
};

export default VendorCommandCenter;
