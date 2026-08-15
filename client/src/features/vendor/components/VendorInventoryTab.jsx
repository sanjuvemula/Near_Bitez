import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, EmptyState, VendorButton } from "./VendorUi.jsx";

const VendorInventoryTab = ({
  menuItems = [],
  toggleAvailability,
  pendingAvailabilityId,
  onRefresh,
  refreshing,
}) => {
  const [searchQuery, setSearchQuery]     = useState("");
  const [stockFilter, setStockFilter]     = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const categories = useMemo(
    () => ["ALL", ...new Set(menuItems.map((i) => i.category).filter(Boolean))],
    [menuItems]
  );

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch   = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchStock    =
        stockFilter === "ALL"          ? true :
        stockFilter === "IN_STOCK"     ? item.isAvailable === true :
        stockFilter === "OUT_OF_STOCK" ? item.isAvailable === false : true;
      return matchSearch && matchCategory && matchStock;
    });
  }, [menuItems, searchQuery, categoryFilter, stockFilter]);

  const inStockCount    = menuItems.filter((i) => i.isAvailable).length;
  const outOfStockCount = menuItems.filter((i) => !i.isAvailable).length;
  const totalCount      = menuItems.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,320px]">

      {/* ── LEFT: Item list ─────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-line bg-card/95 p-4 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[14px] border border-line bg-card/95 pl-9 pr-4 py-2.5 text-sm font-semibold text-heading placeholder:text-muted outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-all"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[14px] border border-line bg-card/95 px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>
            ))}
          </select>

          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="rounded-[14px] border border-line bg-card/95 px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="IN_STOCK">Live only</option>
            <option value="OUT_OF_STOCK">Sold out only</option>
          </select>

          {/* Result count */}
          <span className="text-xs font-bold text-muted ml-auto">
            {filteredItems.length} of {totalCount} items
          </span>
        </div>

        {/* List */}
        {filteredItems.length === 0 ? (
          <EmptyState
            title="No Items Found"
            description="Try adjusting your search or filters."
            tone="info"
          />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {filteredItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.14 }}
                  className={`flex items-center gap-4 rounded-[20px] border p-3.5 transition-all ${
                    item.isAvailable
                      ? "bg-card/95 border-line shadow-sm hover:shadow-md"
                      : "bg-rose-50/60 border-rose-200 dark:border-rose-500/25/60"
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-[14px] bg-sunken border border-line" style={{ width: 52, height: 52 }}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={`h-full w-full object-cover transition-all ${!item.isAvailable ? "grayscale opacity-60" : ""}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-black text-faint">
                        {item.name[0]}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold truncate ${item.isAvailable ? "text-heading" : "text-muted line-through"}`}>
                        {item.name}
                      </p>
                      {!item.isAvailable && (
                        <span className="shrink-0 rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
                          Sold Out
                        </span>
                      )}
                      {item.isVeg !== undefined && (
                        <span className={`shrink-0 h-4 w-4 rounded-sm border-2 flex items-center justify-center ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                          <span className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs font-semibold text-muted truncate">{item.category}</p>
                      {item.price && (
                        <p className="text-xs font-bold text-accent">₹{item.price}</p>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    disabled={pendingAvailabilityId === item._id}
                    onClick={() => toggleAvailability(item)}
                    aria-label={item.isAvailable ? "Mark as sold out" : "Mark as live"}
                    className={`relative flex h-9 w-[108px] shrink-0 items-center rounded-full p-1 border transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-1 ${
                      item.isAvailable
                        ? "bg-card border-line focus:ring-orange-300"
                        : "bg-card border-line focus:ring-orange-300"
                    } ${pendingAvailabilityId === item._id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {/* Sliding pill */}
                    <span
                      className={`absolute top-1 bottom-1 rounded-full transition-all duration-200 ease-out ${
                        item.isAvailable
                          ? "bg-emerald-500 left-[calc(50%+2px)] right-1"
                          : "bg-rose-500 left-1 right-[calc(50%+2px)]"
                      }`}
                    />
                    {/* OUT label */}
                    <span className={`relative z-10 w-1/2 text-center text-[9px] font-black uppercase tracking-wider transition-colors ${
                      item.isAvailable ? "text-muted" : "text-heading"
                    }`}>
                      Out
                    </span>
                    {/* LIVE label */}
                    <span className={`relative z-10 w-1/2 text-center text-[9px] font-black uppercase tracking-wider transition-colors ${
                      item.isAvailable ? "text-heading" : "text-muted"
                    }`}>
                      Live
                    </span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── RIGHT: Stats panel ───────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Stock overview */}
        <Panel className="p-5">
          <h2 className="text-sm font-black text-heading mb-4 pb-3 border-b border-line uppercase tracking-wider">
            Stock Overview
          </h2>

          <div className="space-y-2.5">
            {/* Total */}
            <div className="flex items-center justify-between rounded-[16px] bg-sunken border border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[10px] bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center text-base">
                  📦
                </div>
                <p className="text-sm font-bold text-body">Total Items</p>
              </div>
              <p className="text-lg font-black text-heading">{totalCount}</p>
            </div>

            {/* In Stock */}
            <div className="flex items-center justify-between rounded-[16px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/25 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[10px] bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">In Stock</p>
              </div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{inStockCount}</p>
            </div>

            {/* Sold Out */}
            <div className="flex items-center justify-between rounded-[16px] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/25 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[10px] bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Sold Out</p>
              </div>
              <p className="text-lg font-black text-rose-600 dark:text-rose-300">{outOfStockCount}</p>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted">Availability</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  {Math.round((inStockCount / totalCount) * 100)}% live
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-sunken overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(inStockCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-line">
            <VendorButton
              tone="secondary"
              className="w-full"
              loading={refreshing}
              onClick={onRefresh}
            >
              🔄 Sync Live Data
            </VendorButton>
          </div>
        </Panel>

        {/* Warning */}
        <div className="rounded-[20px] border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">⚠️</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Kitchen Warning</h3>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
            Marking an item as{" "}
            <span className="font-bold text-rose-600 dark:text-rose-300">"Out"</span>{" "}
            removes it from the customer app instantly.
          </p>
        </div>

        {/* Quick bulk actions */}
        {outOfStockCount > 0 && (
          <div className="rounded-[20px] border border-accent/25 bg-accent-soft p-4">
            <p className="text-xs font-black uppercase tracking-wider text-accent-text mb-1">
              💡 {outOfStockCount} item{outOfStockCount > 1 ? "s" : ""} sold out
            </p>
            <p className="text-xs text-accent/80 leading-relaxed">
              Toggle each item above when restocked to bring it live again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorInventoryTab;