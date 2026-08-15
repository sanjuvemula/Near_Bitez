import {
  BoxesIcon,
  ChefHatIcon,
  ClipboardListIcon,
  CrownIcon,
  LayoutDashboardIcon,
  MapPinnedIcon,
  MessageCircleIcon,
  RadioIcon,
  StarIcon,
  TrendingUpIcon,
  UtensilsCrossedIcon,
  WalletCardsIcon,
} from "./components/VendorIcons.jsx";

/**
 * Vendor navigation model.
 *
 * A grouping layer over the dashboard's existing tabs — every `tab` below is
 * an id the dashboard already renders. No routes, pages or components are
 * added or removed here; this only shapes how they are reached.
 *
 * `orderFilter` lets two entries share the `orders` tab while showing
 * different slices of it, reusing the order status filter the tab supports.
 *
 * `accent: true` marks a section as premium, which gives its icon a subtle
 * tinted container in the sidebar.
 */
export const VENDOR_NAV = [
  {
    id: "dashboard", tint: "sky",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    tab: "overview",
  },
  {
    id: "operations", tint: "orange",
    label: "Orders & Menu",
    icon: ClipboardListIcon,
    children: [
      {
        id: "live-orders", tint: "rose",
        label: "Live Orders",
        tab: "orders",
        orderFilter: "LIVE",
        badge: "liveOrders",
        icon: RadioIcon,
        accent: true,
      },
      { id: "all-orders", label: "All Orders", tab: "orders", orderFilter: "ALL" },
      { id: "menu", tint: "amber", label: "Menu", tab: "menu", icon: UtensilsCrossedIcon },
      {
        id: "inventory", tint: "teal",
        label: "Inventory & Stock",
        tab: "inventory",
        icon: BoxesIcon,
        badge: "lowStock",
      },
    ],
  },
  {
    id: "tiffin", tint: "emerald",
    label: "Tiffin & Services",
    icon: ChefHatIcon,
    children: [
      { id: "tiffin-services", label: "Tiffin Services", tab: "tiffin" },
      { id: "tiffin-subscribers", label: "Tiffin Subscribers", tab: "subscription" },
    ],
  },
  // Stands alone: this is the restaurant's own relationship with NearBitez,
  // not a customer-facing service.
  {
    id: "my-subscription", tint: "violet",
    label: "My Subscription",
    icon: CrownIcon,
    tab: "plan",
    badge: "subscription",
    accent: true,
  },
  {
    id: "delivery", tint: "cyan",
    label: "Delivery",
    icon: MapPinnedIcon,
    tab: "logistics",
  },
  {
    id: "finance", tint: "indigo",
    label: "Finance",
    icon: WalletCardsIcon,
    tab: "wallet",
  },
  {
    id: "growth", tint: "fuchsia",
    label: "Growth",
    icon: TrendingUpIcon,
    accent: true,
    children: [
      { id: "marketing", label: "Marketing", tab: "marketing" },
      { id: "analytics", tint: "blue", label: "Analytics", tab: "analytics" },
      { id: "reviews", label: "Reviews", tab: "reviews", icon: StarIcon },
    ],
  },
  {
    id: "messages", tint: "purple",
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
