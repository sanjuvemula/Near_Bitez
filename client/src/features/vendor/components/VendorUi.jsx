import { motion } from "framer-motion";
import { ORDER_STAGES } from "../vendorShared.js";

const fastSpring = { type: "spring", stiffness: 600, damping: 35 };

const panelStyles = {
  neutral:
    "border-[#eee7dc] bg-white/95 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)]",
  urgent:
    "border-orange-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)] shadow-[0_26px_60px_-42px_rgba(249,115,22,0.28)]",
  positive:
    "border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4,#dcfce7_58%,#f7fee7)]",
  warning:
    "border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffe4e6_58%,#fff7ed)]",
  info:
    "border-sky-200 bg-[linear-gradient(135deg,#eff6ff,#dbeafe_58%,#f8fafc)]",
  dark:
    "border-[#eee7dc] bg-[linear-gradient(180deg,#ffffff,#fffaf5)] shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)]",
};

export const Panel = ({
  className = "",
  children,
  interactive = false,
  tone = "neutral",
}) => (
  <motion.section
    transition={fastSpring}
    whileHover={interactive ? { y: -2 } : undefined}
    className={`relative overflow-hidden rounded-2xl border transition-colors duration-150 ${panelStyles[tone]} ${className}`}
  >
    <div className="relative z-10">{children}</div>
  </motion.section>
);

export const VendorButton = ({
  tone = "primary",
  className = "",
  loading,
  children,
  ...props
}) => {
  const tones = {
    primary: "border-transparent bg-orange-600 text-white hover:bg-orange-700",
    secondary: "border-[#e7ddd0] bg-white text-stone-700 hover:bg-orange-50",
    success: "border-transparent bg-emerald-500 text-white hover:bg-emerald-600",
    danger: "border-transparent bg-rose-500 text-white hover:bg-rose-600",
    info: "border-transparent bg-sky-500 text-white hover:bg-sky-600",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      disabled={loading}
      className={`relative flex min-h-[44px] items-center justify-center rounded-xl border px-6 py-2.5 text-sm font-bold tracking-tight transition-colors duration-150 ${tones[tone]} ${className} disabled:cursor-not-allowed disabled:opacity-50`}
      {...props}
    >
      {loading ? (
        <span className="flex animate-pulse items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Working
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
};

export const LiveBadge = ({ label, accent = "orange" }) => {
  const colors = {
    orange: {
      pill: "border-orange-200 bg-orange-50 text-orange-700",
      dot: "bg-orange-500",
    },
    green: {
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    },
    red: {
      pill: "border-rose-200 bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    },
    cyan: {
      pill: "border-cyan-200 bg-cyan-50 text-cyan-700",
      dot: "bg-cyan-500",
    },
  };
  const palette = colors[accent] || colors.orange;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${palette.pill}`}
    >
      <span className={`h-2 w-2 animate-pulse rounded-full ${palette.dot}`} />
      {label}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const colors = {
    PLACED: "border-amber-200 bg-amber-50 text-amber-700",
    ACCEPTED: "border-sky-200 bg-sky-50 text-sky-700",
    PREPARING: "border-orange-200 bg-orange-50 text-orange-700",
    READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
    OUT_FOR_DELIVERY: "border-indigo-200 bg-indigo-50 text-indigo-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${colors[status] || colors.PLACED}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

export const IconChip = ({
  icon,
  tone = "neutral",
  className = "",
  iconClassName = "h-5 w-5",
}) => {
  const bgColors = {
    neutral: "border-[#eee7dc] bg-[#fffaf5] text-stone-600",
    urgent: "border-orange-200 bg-orange-50 text-orange-600",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-600",
    info: "border-sky-200 bg-sky-50 text-sky-600",
  };

  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${bgColors[tone] || bgColors.neutral} ${className}`}
    >
      <span className={iconClassName}>{icon}</span>
    </span>
  );
};

const inputStyles =
  "w-full rounded-xl border border-[#e7ddd0] bg-white px-4 py-3.5 text-sm font-semibold text-stone-900 outline-none transition-all duration-150 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 placeholder:text-stone-400";

export const FieldInput = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    {label ? (
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>
    ) : null}
    <input className={inputStyles} {...props} />
  </label>
);

export const FieldSelect = ({ label, children, className = "", ...props }) => (
  <label className={`block ${className}`}>
    {label ? (
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>
    ) : null}
    <select className={`${inputStyles} cursor-pointer appearance-none`} {...props}>
      {children}
    </select>
  </label>
);

export const FieldTextarea = ({
  label,
  className = "",
  textAreaClassName = "",
  ...props
}) => (
  <label className={`block ${className}`}>
    {label ? (
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>
    ) : null}
    <textarea
      className={`${inputStyles} min-h-[100px] resize-y ${textAreaClassName}`}
      {...props}
    />
  </label>
);

export const ToggleTile = ({
  label,
  detail = "",
  checked,
  onChange,
  accent = "orange",
}) => {
  const activeStyles = {
    orange: {
      tile: "border-orange-200 bg-orange-50",
      track: "bg-orange-500",
    },
    green: {
      tile: "border-emerald-200 bg-emerald-50",
      track: "bg-emerald-500",
    },
    cyan: {
      tile: "border-cyan-200 bg-cyan-50",
      track: "bg-cyan-500",
    },
  };
  const active = activeStyles[accent] || activeStyles.orange;

  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-all duration-150 ${
        checked ? active.tile : "border-[#e7ddd0] bg-white hover:bg-[#fffaf5]"
      }`}
    >
      <div>
        <p className="text-sm font-bold text-stone-950">{label}</p>
        {detail ? (
          <p className="mt-1 text-xs font-medium text-stone-500">{detail}</p>
        ) : null}
      </div>
      <div
        className={`relative flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ${
          checked
            ? `${active.track} border-transparent`
            : "border-[#d6cfc3] bg-stone-200"
        }`}
      >
        <motion.div
          layout
          transition={fastSpring}
          className={`absolute h-5 w-5 rounded-full bg-white shadow-sm ${
            checked ? "right-1" : "left-1"
          }`}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
      </div>
    </label>
  );
};

export const ActionTile = ({
  title,
  description,
  icon,
  tone = "neutral",
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-4 rounded-xl border border-[#e7ddd0] bg-white px-4 py-3 text-left transition-colors duration-150 hover:border-orange-200 hover:bg-[#fffaf5]"
  >
    <IconChip icon={icon} tone={tone} />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-stone-950 transition-colors">
        {title}
      </p>
      <p className="mt-1 text-xs font-medium text-stone-500">{description}</p>
    </div>
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
      {">"}
    </span>
  </button>
);

export const OrderProgress = ({ status }) => {
  if (status === "REJECTED") {
    return (
      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-[11px] font-bold text-rose-600">
        ORDER REJECTED
      </div>
    );
  }

  const activeIdx = ORDER_STAGES.indexOf(status);

  return (
    <div className="mt-4 flex gap-1.5">
      {ORDER_STAGES.slice(0, 5).map((stage, index) => (
        <div
          key={stage}
          className={`flex-1 rounded-lg border py-2 text-center transition-colors duration-200 ${
            activeIdx >= index
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-[#e7ddd0] bg-[#fffaf5] text-stone-400"
          }`}
        >
          <div className="text-[9px] font-bold uppercase tracking-widest">
            {stage.slice(0, 4)}
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({
  title,
  description,
  tone = "neutral",
  action,
}) => (
  <Panel
    tone={tone}
    className="flex flex-col items-center justify-center border-dashed p-12 text-center"
  >
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-2xl shadow-inner">
      +
    </div>
    <h3 className="text-lg font-bold tracking-tight text-stone-950">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
      {description}
    </p>
    {action ? <div className="mt-6">{action}</div> : null}
  </Panel>
);
