/**
 * Shared admin dashboard primitives.
 *
 * Extracted from AdminDashboard so new admin surfaces reuse the same controls
 * and styling instead of redefining them.
 */
import { formatDateTime } from "../../utils/formatters.js";

export const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const getData = (response, fallback) => response?.data ?? fallback;

export const displayDate = (value) => (value ? formatDateTime(value) : "N/A");

export const statusColor = (status) =>
  ({
    SCHEDULED: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    PLACED: "bg-blue-50 text-blue-700 border border-blue-100",
    ACCEPTED: "bg-amber-50 text-amber-700 border border-amber-100",
    PREPARING: "bg-orange-50 text-orange-700 border border-orange-100",
    READY: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 border border-sky-100",
    DELIVERED: "bg-green-50 text-green-700 border border-green-100",
    REJECTED: "bg-red-50 text-red-700 border border-red-100",
    ACTIVE: "bg-green-50 text-green-700 border border-green-100",
    PAUSED: "bg-amber-50 text-amber-700 border border-amber-100",
    EXPIRING_SOON: "bg-orange-50 text-orange-700 border border-orange-100",
    EXPIRED: "bg-gray-50 text-gray-600 border border-gray-100",
    CANCELLED: "bg-red-50 text-red-700 border border-red-100",
    SUPERSEDED: "bg-gray-50 text-gray-600 border border-gray-100",
    PENDING_PAYMENT: "bg-amber-50 text-amber-700 border border-amber-100",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-100",
    FAILED: "bg-red-50 text-red-700 border border-red-100",
    WAIVED: "bg-sky-50 text-sky-700 border border-sky-100",
    REFUNDED: "bg-violet-50 text-violet-700 border border-violet-100",
    REQUESTED: "bg-blue-50 text-blue-700 border border-blue-100",
    APPROVED: "bg-amber-50 text-amber-700 border border-amber-100",
    PAID: "bg-green-50 text-green-700 border border-green-100",
  }[status] || "bg-gray-50 text-gray-600 border border-gray-100");

export const roleColor = (role) =>
  ({
    admin: "bg-violet-50 text-violet-700 border border-violet-100",
    vendor: "bg-orange-50 text-orange-700 border border-orange-100",
    customer: "bg-blue-50 text-blue-700 border border-blue-100",
  }[role] || "bg-gray-50 text-gray-600 border border-gray-100");

export const Pill = ({ label, color }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
    {label}
  </span>
);

export const Btn = ({
  onClick,
  children,
  variant = "default",
  disabled,
  small,
  type = "button",
  className = "",
}) => {
  const base = "rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const size = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const styles = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    success: "border border-green-100 bg-green-50 text-green-700 hover:bg-green-100",
    ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${size} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const TextInput = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <input
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    />
  </label>
);

export const SelectInput = ({ label, children, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <select
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    >
      {children}
    </select>
  </label>
);

export const TextArea = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <textarea
      {...props}
      className="min-h-[84px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    />
  </label>
);

export const CheckboxField = ({ label, checked, onChange }) => (
  <label className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-200"
    />
    {label}
  </label>
);

export const SearchInput = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 sm:w-64"
  />
);

export const Toolbar = ({ children }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export const Panel = ({ children, className = "" }) => (
  <section className={`rounded-lg border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
    {children}
  </section>
);

export const TableShell = ({ children }) => (
  <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
    <div className="overflow-x-auto">{children}</div>
  </div>
);

export const EmptyRow = ({ colSpan, label }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center text-sm text-gray-400">
      {label}
    </td>
  </tr>
);
