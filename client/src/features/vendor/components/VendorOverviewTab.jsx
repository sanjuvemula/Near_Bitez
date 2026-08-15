import { motion } from "framer-motion";
import { formatCurrency } from "../../../utils/formatters.js";
import {
  formatRelativeTime,
  LIVE_ORDER_STATUSES,
  STATUS_ACTIONS,
} from "../vendorShared.js";
import {
  LiveBadge,
  Panel,
  StatusBadge,
  VendorButton,
  ActionTile,
} from "./VendorUi.jsx";

const VendorOverviewTab = ({
  overview,
  restaurant,
  orders,
  onTabChange,
  onRefresh,
  updateOrderStatus,
  pendingOrderId,
  lowStockCount = 0,
}) => {
  const liveOrders = orders
    .filter((order) => LIVE_ORDER_STATUSES.includes(order.status))
    .slice(0, 6);
  const stats = overview?.stats || {};

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,320px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Revenue", value: formatCurrency(stats.todayRevenue || 0), tone: "positive" },
            { label: "Active Queue", value: stats.liveOrders || 0, tone: "urgent" },
            { label: "Orders Done", value: stats.todayOrders || 0, tone: "info" },
            { label: "Acceptance", value: `${stats.acceptanceRate || 0}%`, tone: "neutral" },
          ].map((card) => (
            <Panel key={card.label} interactive tone={card.tone} className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">
                {card.value}
              </p>
            </Panel>
          ))}
        </div>

        <Panel tone="dark" className="p-6">
          <div className="mb-6 flex items-center justify-between border-b border-[#eee7dc] pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold tracking-tight text-stone-950">
                Live Pipeline
              </h2>
              <LiveBadge
                label={`${liveOrders.length} Active`}
                accent={liveOrders.length > 0 ? "orange" : "cyan"}
              />
            </div>
            <button
              onClick={onRefresh}
              className="text-xs font-bold text-stone-500 transition-colors hover:text-orange-700"
            >
              Refresh
            </button>
          </div>

          {liveOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7ddd0] bg-[#fffaf5] px-6 py-16 text-center">
              <p className="text-sm font-bold text-stone-950">No live orders</p>
              <p className="mt-2 text-xs text-stone-500">
                Your queue is clear right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {liveOrders.map((order, index) => {
                const action = STATUS_ACTIONS[order.status]?.[0];

                return (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative flex flex-col rounded-2xl border p-5 ${
                      order.status === "PLACED"
                        ? "border-orange-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)]"
                        : "border-[#eee7dc] bg-white"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <StatusBadge status={order.status} />
                      <span className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-mono text-stone-500">
                        #{order._id.slice(-5)}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-base font-bold text-stone-950">
                        {order.customer?.name}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-orange-600">
                        {formatRelativeTime(order.createdAt)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <span
                            key={item.menuItem}
                            className="rounded-lg border border-[#eee7dc] bg-[#fffaf5] px-2 py-1 text-[10px] font-medium text-stone-600"
                          >
                            <span className="mr-1 font-bold text-orange-600">
                              {item.quantity}x
                            </span>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#eee7dc] pt-4">
                      <p className="text-lg font-bold text-stone-950">
                        {formatCurrency(order.grandTotal)}
                      </p>
                      {action ? (
                        <VendorButton
                          tone="primary"
                          className="!min-h-0 !px-4 !py-1.5"
                          loading={pendingOrderId === order._id}
                          onClick={() =>
                            updateOrderStatus(order._id, action.status)
                          }
                        >
                          {action.label}
                        </VendorButton>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel tone="neutral" className="p-5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Quick Actions
          </p>
          {/* Shortcuts to sections that now sit inside collapsed nav groups,
              so common tasks stay one click away. */}
          <div className="space-y-2">
            <ActionTile
              title="Live Orders"
              description={`${stats.liveOrders || 0} in progress`}
              icon="L"
              tone="urgent"
              onClick={() => onTabChange("orders")}
            />
            <ActionTile
              title="Menu Editor"
              description={`${stats.activeMenuItems || 0} active items`}
              icon="M"
              tone="positive"
              onClick={() => onTabChange("menu")}
            />
            <ActionTile
              title="Inventory & Stock"
              description={
                lowStockCount > 0 ? `${lowStockCount} out of stock` : "All items in stock"
              }
              icon="I"
              tone={lowStockCount > 0 ? "urgent" : "info"}
              onClick={() => onTabChange("inventory")}
            />
            <ActionTile
              title="Tiffin Services"
              description="Plans and subscribers"
              icon="T"
              tone="positive"
              onClick={() => onTabChange("tiffin")}
            />
            <ActionTile
              title="Wallet & Payouts"
              description="Earnings and settlements"
              icon="W"
              tone="info"
              onClick={() => onTabChange("wallet")}
            />
            <ActionTile
              title="Store Profile"
              description={restaurant?.isActive ? "Live" : "Paused"}
              icon="S"
              tone="info"
              onClick={() => onTabChange("restaurant")}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default VendorOverviewTab;
