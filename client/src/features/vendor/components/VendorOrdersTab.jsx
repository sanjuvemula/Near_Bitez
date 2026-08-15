import { formatCurrency } from "../../../utils/formatters.js";
import { formatRelativeTime, STATUS_ACTIONS } from "../vendorShared.js";
import {
  EmptyState,
  FieldInput,
  FieldSelect,
  OrderProgress,
  Panel,
  StatusBadge,
  VendorButton,
} from "./VendorUi.jsx";

const VendorOrdersTab = ({
  filteredOrders,
  orderSearch,
  setOrderSearch,
  orderStatusFilter,
  setOrderStatusFilter,
  orderFilterOptions,
  updateOrderStatus,
  pendingOrderId,
}) => {
  return (
    <div className="space-y-8">
      <Panel tone="dark" className="grid gap-5 p-5 md:grid-cols-2">
        <FieldInput
          placeholder="Search by ID, name, address..."
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
        />
        <FieldSelect
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
        >
          {orderFilterOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} ({option.count})
            </option>
          ))}
        </FieldSelect>
      </Panel>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try another filter or wait for the next order."
          tone="warning"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredOrders.map((order) => (
            <Panel
              key={order._id}
              className="p-7"
              tone={order.status === "PLACED" ? "urgent" : "dark"}
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <StatusBadge status={order.status} />
                    <span className="rounded-lg bg-sunken px-3 py-1.5 text-xs font-black text-muted">
                      ID #{order._id.slice(-6)}
                    </span>
                  </div>

                  <div>
                    <h3 className="mb-2 text-2xl font-black text-heading">
                      {order.customer?.name}
                    </h3>
                    <div className="space-y-2 rounded-xl border border-line bg-sunken p-3 text-sm font-medium text-body">
                      <p>{order.deliveryAddress}</p>
                      <p className="font-black text-heading">
                        Phone: {order.deliveryPhone || order.customer?.phone || "Not provided"}
                      </p>
                    </div>
                    <p className="mt-3 text-xs font-black text-accent">
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={`${order._id}-${item.menuItem}`}
                        className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-body"
                      >
                        <span className="mr-1 text-accent">
                          {item.quantity}x
                        </span>
                        {item.name}
                      </span>
                    ))}
                  </div>

                  <OrderProgress status={order.status} />
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-line pt-5">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted">
                      Grand Total
                    </p>
                    <p className="text-3xl font-black text-heading">
                      {formatCurrency(order.grandTotal)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {(STATUS_ACTIONS[order.status] || []).map((action) => (
                      <VendorButton
                        key={action.status}
                        tone={action.variant}
                        loading={pendingOrderId === order._id}
                        onClick={() =>
                          updateOrderStatus(order._id, action.status)
                        }
                      >
                        {action.label}
                      </VendorButton>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrdersTab;
