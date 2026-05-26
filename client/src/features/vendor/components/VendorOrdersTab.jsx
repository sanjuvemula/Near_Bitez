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
                  <div className="flex items-center justify-between border-b border-[#eee7dc] pb-4">
                    <StatusBadge status={order.status} />
                    <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-black text-stone-500">
                      ID #{order._id.slice(-6)}
                    </span>
                  </div>

                  <div>
                    <h3 className="mb-2 text-2xl font-black text-stone-950">
                      {order.customer?.name}
                    </h3>
                    <p className="rounded-xl border border-[#eee7dc] bg-[#fffaf5] p-3 text-sm font-medium text-stone-600">
                      {order.deliveryAddress}
                    </p>
                    <p className="mt-3 text-xs font-black text-orange-600">
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={`${order._id}-${item.menuItem}`}
                        className="rounded-lg border border-[#eee7dc] bg-white px-3 py-1.5 text-xs font-bold text-stone-600"
                      >
                        <span className="mr-1 text-orange-600">
                          {item.quantity}x
                        </span>
                        {item.name}
                      </span>
                    ))}
                  </div>

                  <OrderProgress status={order.status} />
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-[#eee7dc] pt-5">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-500">
                      Grand Total
                    </p>
                    <p className="text-3xl font-black text-stone-950">
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
