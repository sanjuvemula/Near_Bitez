import {
  BikeIcon,
  ChartIcon,
  ClipboardListIcon,
  CookingPotIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  PackageIcon,
  StarIcon,
  UtensilsIcon,
  WalletIcon,
} from "./components/VendorIcons.jsx";

/**
 * Vendor navigation model.
 *
 * This is purely a grouping layer over the existing dashboard tabs — every
 * `tab` below is an id the dashboard already renders. No routes, pages or
 * components were added or removed; only the path the user takes to reach them.
 *
 * `orderFilter` lets two nav entries share the `orders` tab while presenting
 * different slices of it (live queue vs full history), reusing the order
 * status filter the tab already supports.
 */
export const VENDOR_NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    tab: "overview",
  },
  {
    id: "operations",
    label: "Orders & Menu",
    icon: ClipboardListIcon,
    children: [
      { id: "live-orders", label: "Live Orders", tab: "orders", orderFilter: "LIVE", badge: "liveOrders" },
      { id: "all-orders", label: "All Orders", tab: "orders", orderFilter: "ALL" },
      { id: "menu", label: "Menu", tab: "menu", icon: UtensilsIcon },
      { id: "inventory", label: "Inventory & Stock", tab: "inventory", icon: PackageIcon, badge: "lowStock" },
    ],
  },
  {
    id: "tiffin-subscription",
    label: "Tiffin & Subscription",
    icon: CookingPotIcon,
    children: [
      { id: "tiffin", label: "Tiffin Services", tab: "tiffin" },
      { id: "tiffin-subscribers", label: "Tiffin Subscribers", tab: "subscription" },
      { id: "my-subscription", label: "My Subscription", tab: "plan", icon: CreditCardIcon, badge: "subscription" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: BikeIcon,
    children: [{ id: "delivery-zones", label: "Delivery Zones", tab: "logistics" }],
  },
  {
    id: "finance",
    label: "Finance",
    icon: WalletIcon,
    children: [{ id: "wallet", label: "Wallet & Payouts", tab: "wallet" }],
  },
  {
    id: "growth",
    label: "Growth",
    icon: MegaphoneIcon,
    children: [
      { id: "marketing", label: "Marketing", tab: "marketing" },
      { id: "analytics", label: "Analytics", tab: "analytics", icon: ChartIcon },
      { id: "reviews", label: "Reviews", tab: "reviews", icon: StarIcon },
    ],
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircleIcon,
    tab: "messages",
    badge: "messages",
  },
];

/** Tabs reachable from the footer rather than the main nav. */
export const VENDOR_FOOTER_TAB = "restaurant";

/** Flat tab -> nav entry lookup, used to resolve the active item and title. */
export const findNavEntry = (tab, orderFilter) => {
  for (const group of VENDOR_NAV) {
    if (group.tab === tab) return { group, child: null };

    for (const child of group.children || []) {
      if (child.tab !== tab) continue;

      // Both order entries share a tab; disambiguate on the filter.
      if (child.orderFilter) {
        const isLive = child.orderFilter === "LIVE";
        const filterIsLive = orderFilter === "LIVE";
        if (isLive !== filterIsLive) continue;
      }

      return { group, child };
    }
  }

  return { group: null, child: null };
};

/** Which group should start open for a given tab. */
export const getGroupIdForTab = (tab) => {
  const { group } = findNavEntry(tab);
  return group?.children ? group.id : "";
};
