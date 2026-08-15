/**
 * Line icons for the vendor navigation.
 *
 * Drawn inline rather than pulling in an icon package: the project has no
 * general-purpose icon library (public/icons.svg only holds social marks), and
 * these few paths avoid adding a dependency for the sidebar alone.
 *
 * Geometry follows the Lucide icon set (ISC licensed) so sizing, stroke weight
 * and optical balance stay consistent across the nav.
 */

const Svg = ({ children, className = "", size = 18, strokeWidth = 1.75 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const LayoutDashboardIcon = (props) => (
  <Svg {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </Svg>
);

export const ClipboardListIcon = (props) => (
  <Svg {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
  </Svg>
);

export const UtensilsIcon = (props) => (
  <Svg {...props}>
    <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </Svg>
);

export const PackageIcon = (props) => (
  <Svg {...props}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </Svg>
);

export const CookingPotIcon = (props) => (
  <Svg {...props}>
    <path d="M2 12h20M12 12v8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
    <path d="m4 8 16-4M8.86 6.78l-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" />
  </Svg>
);

export const CreditCardIcon = (props) => (
  <Svg {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </Svg>
);

export const BikeIcon = (props) => (
  <Svg {...props}>
    <circle cx="18.5" cy="17.5" r="3.5" />
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="15" cy="5" r="1" />
    <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
  </Svg>
);

export const WalletIcon = (props) => (
  <Svg {...props}>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </Svg>
);

export const MegaphoneIcon = (props) => (
  <Svg {...props}>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </Svg>
);

export const MessageCircleIcon = (props) => (
  <Svg {...props}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Svg>
);

export const ChartIcon = (props) => (
  <Svg {...props}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9M13 17V5M8 17v-3" />
  </Svg>
);

export const StarIcon = (props) => (
  <Svg {...props}>
    <path d="M11.5 2.8a.6.6 0 0 1 1 0l2.4 5a.6.6 0 0 0 .5.3l5.3.8c.5.1.7.7.3 1l-3.8 3.8a.6.6 0 0 0-.2.5l.9 5.3c.1.5-.4.9-.9.7l-4.7-2.5a.6.6 0 0 0-.6 0l-4.7 2.5c-.5.2-1-.2-.9-.7l.9-5.3a.6.6 0 0 0-.2-.5L3 9.9c-.4-.3-.2-.9.3-1l5.3-.8a.6.6 0 0 0 .5-.3Z" />
  </Svg>
);

export const SettingsIcon = (props) => (
  <Svg {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const LogOutIcon = (props) => (
  <Svg {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </Svg>
);

export const ChevronDownIcon = (props) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const MenuIcon = (props) => (
  <Svg {...props}>
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </Svg>
);

export const XIcon = (props) => (
  <Svg {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const PlusIcon = (props) => (
  <Svg {...props}>
    <path d="M5 12h14M12 5v14" />
  </Svg>
);

/** Marks the subscription section as the premium surface. */
export const CrownIcon = (props) => (
  <Svg {...props}>
    <path d="M11.6 3.2a.6.6 0 0 1 .8 0l2.7 2.4a.6.6 0 0 0 .8 0l2.6-2.3c.4-.4 1 0 .9.5L18 14.5a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L4.6 3.8c-.1-.5.5-.9.9-.5l2.6 2.3a.6.6 0 0 0 .8 0Z" />
    <path d="M6 19h12" />
  </Svg>
);

export const SparklesIcon = (props) => (
  <Svg {...props}>
    <path d="M9.9 3.4a.5.5 0 0 1 .95 0l1.15 3.4a.5.5 0 0 0 .3.31l3.4 1.15a.5.5 0 0 1 0 .95l-3.4 1.15a.5.5 0 0 0-.3.3l-1.15 3.4a.5.5 0 0 1-.95 0l-1.15-3.4a.5.5 0 0 0-.3-.3L5.05 9.2a.5.5 0 0 1 0-.95l3.4-1.15a.5.5 0 0 0 .3-.3Z" />
    <path d="M18 14.5 18.6 16l1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6ZM17.5 3l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4Z" />
  </Svg>
);

/** Live/active signal for the order hub. */
export const RadioIcon = (props) => (
  <Svg {...props}>
    <path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2" />
    <circle cx="12" cy="12" r="2" />
  </Svg>
);

export const UtensilsCrossedIcon = (props) => (
  <Svg {...props}>
    <path d="m16 2-8.4 8.4a2 2 0 1 0 2.8 2.8L18.8 4.8M15 15l6.3 6.3M9 9 2.7 2.7M7 14l-4.5 4.5a2.1 2.1 0 0 0 3 3L10 17" />
  </Svg>
);

export const BoxesIcon = (props) => (
  <Svg {...props}>
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-4.5-2.6a2 2 0 0 0-2 0Z" />
    <path d="m7 16.5-4.74-2.85M7 16.5v5M12 13.5 7 16.5" />
    <path d="M16 8.5 12 6V2.5" />
    <path d="M12 13.5V8.5l4.5-2.6a2 2 0 0 1 2 0l3 1.8a2 2 0 0 1 1 1.7v3.3a2 2 0 0 1-1 1.7l-3 1.8a2 2 0 0 1-2 0L12 13.5Z" />
  </Svg>
);

export const ChefHatIcon = (props) => (
  <Svg {...props}>
    <path d="M17 21H7a1 1 0 0 1-1-1v-6.6A5 5 0 1 1 9.5 4.3a5 5 0 0 1 9 3.2 5 5 0 0 1-.5 5.9V20a1 1 0 0 1-1 1Z" />
    <path d="M6 17h12" />
  </Svg>
);

export const MapPinnedIcon = (props) => (
  <Svg {...props}>
    <path d="M18 8c0 4.5-6 10-6 10S6 12.5 6 8a6 6 0 0 1 12 0Z" />
    <circle cx="12" cy="8" r="2" />
    <path d="M8.8 15.5 5 17l7 4 7-4-3.8-1.5" />
  </Svg>
);

export const WalletCardsIcon = (props) => (
  <Svg {...props}>
    <rect width="18" height="12" x="3" y="8" rx="2" />
    <path d="M5.5 8V5.5A1.5 1.5 0 0 1 7 4h9M3 13h18" />
  </Svg>
);

export const TrendingUpIcon = (props) => (
  <Svg {...props}>
    <path d="M3 17v4h18M3 14l4.5-4.5 3 3L17 6" />
    <path d="M13 6h4v4" />
  </Svg>
);

export const SunIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
  </Svg>
);

export const MoonIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Svg>
);
