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
import {
  ClipboardListIcon,
  RadioIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "./VendorIcons.jsx";

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Revenue",
              value: formatCurrency(stats.todayRevenue || 0),
              Icon: WalletCardsIcon,
              tint: "text-emerald-500",
              box: "bg-emerald-500/10",
            },
            {
              label: "In Queue",
              value: stats.liveOrders || 0,
              Icon: RadioIcon,
              tint: "text-rose-500",
              box: "bg-rose-500/10",
            },
            {
              label: "Completed",
              value: stats.todayOrders || 0,
              Icon: ClipboardListIcon,
              tint: "text-sky-500",
              box: "bg-sky-500/10",
            },
            {
              label: "Acceptance",
              value: `${stats.acceptanceRate || 0}%`,
              Icon: TrendingUpIcon,
              tint: "text-violet-500",
              box: "bg-violet-500/10",
            },
          ].map((card) => (
            <Panel key={card.label} interactive className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {card.label}
                </p>
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${card.box} ${card.tint}`}
                >
                  <card.Icon size={16} />
                </span>
              </div>
              <p className="mt-3 truncate text-[27px] font-black leading-none tracking-tight text-heading">
                {card.value}
              </p>
            </Panel>
          ))}
        </div>

        <Panel tone="dark" className="p-6">
          <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold tracking-tight text-heading">
                Live Pipeline
              </h2>
              <LiveBadge
                label={`${liveOrders.length} Active`}
                accent={liveOrders.length > 0 ? "orange" : "cyan"}
              />
            </div>
            <button
              onClick={onRefresh}
              className="text-xs font-bold text-muted transition-colors hover:text-accent-text"
            >
              Refresh
            </button>
          </div>

          {liveOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-sunken px-6 py-16 text-center">
              <p className="text-sm font-bold text-heading">No live orders</p>
              <p className="mt-2 text-xs text-muted">
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
                        ? "border-accent/25 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)]"
                        : "border-line bg-card"
                    } dark:bg-none dark:bg-raised`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <StatusBadge status={order.status} />
                      <span className="rounded-lg bg-sunken px-2 py-1 text-[10px] font-mono text-muted">
                        #{order._id.slice(-5)}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-base font-bold text-heading">
                        {order.customer?.name}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-accent">
                        {formatRelativeTime(order.createdAt)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <span
                            key={item.menuItem}
                            className="rounded-lg border border-line bg-sunken px-2 py-1 text-[10px] font-medium text-body"
                          >
                            <span className="mr-1 font-bold text-accent">
                              {item.quantity}x
                            </span>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <p className="text-lg font-bold text-heading">
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
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted">
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
