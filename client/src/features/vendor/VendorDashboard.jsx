import Loader from "../../components/Loader.jsx";
import VendorAnalyticsTab from "./components/VendorAnalyticsTab.jsx";
import VendorCommandCenter from "./components/VendorCommandCenter.jsx";
import VendorMenuTab from "./components/VendorMenuTab.jsx";
import VendorOrdersTab from "./components/VendorOrdersTab.jsx";
import VendorOverviewTab from "./components/VendorOverviewTab.jsx";
import VendorRestaurantTab from "./components/VendorRestaurantTab.jsx";
import VendorShell from "./components/VendorShell.jsx";
import VendorTiffinTab from "./components/VendorTiffinTab.jsx";
import VendorSubscriptionTab from "./components/VendorSubscriptionTab.jsx";
import VendorReviewsTab from "./components/VendorReviewsTab.jsx";
import VendorMessagesTab from "./components/VendorMessagesTab.jsx";
import VendorWalletTab from "./components/VendorWalletTab.jsx";
import VendorMarketingTab from "./components/VendorMarketingTab.jsx";
import VendorInventoryTab from "./components/VendorInventoryTab.jsx";
import { Panel } from "./components/VendorUi.jsx";
import { useVendorDashboard } from "./useVendorDashboard.js";
import VendorLogisticsTab from "./components/VendorLogisticsTab.jsx";

const VendorDashboard = () => {
  const dashboard = useVendorDashboard();

  if (dashboard.loading) {
    return <Loader label="Loading System..." />;
  }

  return (
    <VendorShell
      activeTab={dashboard.tab}
      onTabChange={dashboard.setTab}
      onLogout={dashboard.handleLogout}
      overview={dashboard.overview}
      restaurant={dashboard.restaurant}
      chats={dashboard.chats}
    >
      {dashboard.tab === "overview" ? (
        <VendorCommandCenter
          isAdminWorkspace={dashboard.isAdminWorkspace}
          lastSyncedAt={dashboard.lastSyncedAt}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          overview={dashboard.overview}
          refreshing={dashboard.refreshing}
          restaurant={dashboard.restaurant}
          restaurantOptions={dashboard.restaurantOptions}
          selectedRestaurantId={dashboard.selectedRestaurantId}
          setSelectedRestaurantId={dashboard.setSelectedRestaurantId}
        />
      ) : null}

      {dashboard.error ? (
        <Panel tone="warning" className="mb-6 rounded-2xl p-6 text-sm font-bold text-rose-600">
          System Notice: {dashboard.error}
        </Panel>
      ) : null}

      {dashboard.tab === "overview" ? (
        <VendorOverviewTab
          overview={dashboard.overview}
          restaurant={dashboard.restaurant}
          orders={dashboard.orders}
          onTabChange={dashboard.setTab}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
          updateOrderStatus={dashboard.updateOrderStatus}
          pendingOrderId={dashboard.pendingOrderId}
        />
      ) : null}

      {dashboard.tab === "orders" ? (
        <VendorOrdersTab
          filteredOrders={dashboard.filteredOrders}
          orderSearch={dashboard.orderSearch}
          setOrderSearch={dashboard.setOrderSearch}
          orderStatusFilter={dashboard.orderStatusFilter}
          setOrderStatusFilter={dashboard.setOrderStatusFilter}
          orderFilterOptions={dashboard.orderFilterOptions}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
          updateOrderStatus={dashboard.updateOrderStatus}
          pendingOrderId={dashboard.pendingOrderId}
          restaurant={dashboard.restaurant}
          overview={dashboard.overview}
        />
      ) : null}

      {dashboard.tab === "menu" ? (
        <VendorMenuTab
          restaurant={dashboard.restaurant}
          menuForm={dashboard.menuForm}
          setMenuForm={dashboard.setMenuForm}
          editingMenuId={dashboard.editingMenuId}
          menuImagePreview={dashboard.menuImagePreview}
          handleMenuImageChange={dashboard.handleMenuImageChange}
          saveMenuItem={dashboard.saveMenuItem}
          savingMenu={dashboard.savingMenu}
          resetMenuForm={dashboard.resetMenuForm}
          filteredMenuItems={dashboard.filteredMenuItems}
          menuSearch={dashboard.menuSearch}
          setMenuSearch={dashboard.setMenuSearch}
          menuCategoryFilter={dashboard.menuCategoryFilter}
          setMenuCategoryFilter={dashboard.setMenuCategoryFilter}
          menuCategories={dashboard.menuCategories}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
          startEditingMenuItem={dashboard.startEditingMenuItem}
          toggleAvailability={dashboard.toggleAvailability}
          pendingAvailabilityId={dashboard.pendingAvailabilityId}
          deleteMenuItem={dashboard.deleteMenuItem}
          pendingDeleteMenuId={dashboard.pendingDeleteMenuId}
          onTabChange={dashboard.setTab}
        />
      ) : null}

      {dashboard.tab === "inventory" ? (
        <VendorInventoryTab
          menuItems={dashboard.menuItems}
          toggleAvailability={dashboard.toggleAvailability}
          pendingAvailabilityId={dashboard.pendingAvailabilityId}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
        />
      ) : null}

      {dashboard.tab === "wallet" ? (
        <VendorWalletTab
          restaurant={dashboard.restaurant}
          wallet={dashboard.wallet}
          requestPayout={dashboard.requestPayout}
          requestingPayout={dashboard.requestingPayout}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
        />
      ) : null}

      {dashboard.tab === "marketing" ? (
        <VendorMarketingTab
          restaurant={dashboard.restaurant}
          promos={dashboard.promos}
          createPromoCode={dashboard.createPromoCode}
          togglePromoStatus={dashboard.togglePromoStatus}
          deletePromo={dashboard.deletePromo}
          pendingPromoId={dashboard.pendingPromoId}
        />
      ) : null}

      {dashboard.tab === "restaurant" ? (
        <VendorRestaurantTab
          restaurant={dashboard.restaurant}
          restaurantForm={dashboard.restaurantForm}
          setRestaurantForm={dashboard.setRestaurantForm}
          setRestaurantDirty={dashboard.setRestaurantDirty}
          restaurantImagePreview={dashboard.restaurantImagePreview}
          handleRestaurantImageChange={dashboard.handleRestaurantImageChange}
          saveRestaurant={dashboard.saveRestaurant}
          savingRestaurant={dashboard.savingRestaurant}
          updateRestaurantLiveState={dashboard.updateRestaurantLiveState}
          updatingStoreStatus={dashboard.updatingStoreStatus}
          hydrateRestaurantForm={dashboard.hydrateRestaurantForm}
        />
      ) : null}

      {dashboard.tab === "analytics" ? (
        <VendorAnalyticsTab
          overview={dashboard.overview}
          restaurant={dashboard.restaurant}
        />
      ) : null}

      {dashboard.tab === "tiffin" ? (
        <VendorTiffinTab restaurant={dashboard.restaurant} />
      ) : null}

      {dashboard.tab === "subscription" ? (
        <VendorSubscriptionTab
          restaurant={dashboard.restaurant}
          subscriptions={dashboard.subscriptions}
          updateSubscriptionStatus={dashboard.updateSubscriptionStatus}
          pendingSubId={dashboard.pendingSubId}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
        />
      ) : null}

      {dashboard.tab === "reviews" ? (
        <VendorReviewsTab
          restaurant={dashboard.restaurant}
          reviews={dashboard.reviews}
          onRefresh={() => dashboard.refreshDashboard({ silent: true })}
          refreshing={dashboard.refreshing}
        />
      ) : null}

      {dashboard.tab === "messages" ? (
        <VendorMessagesTab
          restaurant={dashboard.restaurant}
          chats={dashboard.chats}
          sendMessage={dashboard.sendMessage}
          pendingMessageId={dashboard.pendingMessageId}
        />
      ) : null}

      {dashboard.tab === "logistics" ? (
        <VendorLogisticsTab
          restaurant={dashboard.restaurant}
          logistics={dashboard.logistics}
          saveLogistics={dashboard.saveLogistics}
          savingLogistics={dashboard.savingLogistics}
        />
      ) : null}
    </VendorShell>
  );
};

export default VendorDashboard;
