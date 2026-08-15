import { motion } from "framer-motion";
import { ORDER_STAGES } from "../vendorShared.js";

const fastSpring = { type: "spring", stiffness: 600, damping: 35 };

/**
 * Panel tones.
 *
 * Both themes carry the tone's hue. Dark mode uses a translucent colour wash
 * layered over the card surface instead of the light pastel gradients, which
 * would turn muddy on charcoal.
 */
const panelStyles = {
  neutral:
    "border-line bg-card/95 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)] dark:bg-card dark:shadow-[0_20px_50px_-40px_rgba(0,0,0,0.75)]",
  urgent:
    "border-accent/25 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_58%,#fffaf5)] shadow-[0_26px_60px_-42px_rgba(249,115,22,0.28)] dark:border-accent/30 dark:bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(236,72,153,0.08)_58%,rgba(42,38,47,0.6))]",
  positive:
    "border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4,#dcfce7_58%,#f7fee7)] dark:border-emerald-500/30 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.17),rgba(56,189,248,0.08)_58%,rgba(42,38,47,0.6))]",
  warning:
    "border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffe4e6_58%,#fff7ed)] dark:border-rose-500/30 dark:bg-[linear-gradient(135deg,rgba(244,63,94,0.17),rgba(249,115,22,0.08)_58%,rgba(42,38,47,0.6))]",
  info:
    "border-sky-200 bg-[linear-gradient(135deg,#eff6ff,#dbeafe_58%,#f8fafc)] dark:border-sky-500/30 dark:bg-[linear-gradient(135deg,rgba(56,189,248,0.17),rgba(168,85,247,0.08)_58%,rgba(42,38,47,0.6))]",
  dark:
    "border-line bg-[linear-gradient(180deg,#ffffff,#fffaf5)] shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)] dark:bg-none dark:bg-card dark:shadow-[0_20px_50px_-40px_rgba(0,0,0,0.75)]",
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
    {/* Hairline highlight along the top edge reads as a lit surface */}
    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
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
    primary: "border-transparent bg-accent text-white shadow-sm hover:brightness-110",
    secondary: "border-line-strong bg-card text-body hover:bg-accent-soft hover:border-accent/30",
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
      pill: "border-accent/25 bg-accent-soft text-accent-text",
      dot: "bg-orange-500",
    },
    green: {
      pill: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    red: {
      pill: "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    cyan: {
      pill: "border-cyan-200 dark:border-cyan-500/25 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
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
    PLACED: "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ACCEPTED: "border-sky-200 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
    PREPARING: "border-accent/25 bg-accent-soft text-accent-text",
    READY: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    OUT_FOR_DELIVERY: "border-indigo-200 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    DELIVERED: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    REJECTED: "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
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
    neutral: "border-line bg-sunken text-body",
    urgent: "border-accent/25 bg-accent-soft text-accent",
    positive: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    info: "border-sky-200 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300",
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
  "w-full rounded-xl border border-line-strong bg-card px-4 py-3.5 text-sm font-semibold text-heading outline-none transition-all duration-150 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 placeholder:text-muted dark:bg-raised";

export const FieldInput = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    {label ? (
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted">
        {label}
      </span>
    ) : null}
    <input className={inputStyles} {...props} />
  </label>
);

export const FieldSelect = ({ label, children, className = "", ...props }) => (
  <label className={`block ${className}`}>
    {label ? (
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted">
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
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted">
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
      tile: "border-accent/25 bg-accent-soft",
      track: "bg-orange-500",
    },
    green: {
      tile: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10",
      track: "bg-emerald-500",
    },
    cyan: {
      tile: "border-cyan-200 dark:border-cyan-500/25 bg-cyan-50 dark:bg-cyan-500/10",
      track: "bg-cyan-500",
    },
  };
  const active = activeStyles[accent] || activeStyles.orange;

  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-all duration-150 ${
        checked ? active.tile : "border-line-strong bg-card hover:bg-sunken"
      }`}
    >
      <div>
        <p className="text-sm font-bold text-heading">{label}</p>
        {detail ? (
          <p className="mt-1 text-xs font-medium text-muted">{detail}</p>
        ) : null}
      </div>
      <div
        className={`relative flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ${
          checked
            ? `${active.track} border-transparent`
            : "border-line-strong bg-stone-200"
        }`}
      >
        <motion.div
          layout
          transition={fastSpring}
          className={`absolute h-5 w-5 rounded-full bg-card shadow-sm ${
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
    className="group flex w-full items-center gap-4 rounded-xl border border-line-strong bg-card px-4 py-3 text-left transition-colors duration-150 hover:border-accent/25 hover:bg-sunken"
  >
    <IconChip icon={icon} tone={tone} />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-heading transition-colors">
        {title}
      </p>
      <p className="mt-1 text-xs font-medium text-muted">{description}</p>
    </div>
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-orange-100 dark:bg-orange-500/15">
      {">"}
    </span>
  </button>
);

export const OrderProgress = ({ status }) => {
  if (status === "REJECTED") {
    return (
      <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 p-3 text-center text-[11px] font-bold text-rose-600 dark:text-rose-300">
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
              ? "border-accent/25 bg-accent-soft text-accent-text"
              : "border-line-strong bg-sunken text-muted"
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
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-2xl shadow-inner">
      +
    </div>
    <h3 className="text-lg font-bold tracking-tight text-heading">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
      {description}
    </p>
    {action ? <div className="mt-6">{action}</div> : null}
  </Panel>
);
