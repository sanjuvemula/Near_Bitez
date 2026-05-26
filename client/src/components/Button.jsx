const variants = {
  primary:
    "border border-orange-500 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white shadow-[0_18px_35px_-18px_rgba(234,88,12,0.75)] hover:shadow-[0_22px_40px_-18px_rgba(234,88,12,0.85)]",
  secondary:
    "border border-white/70 bg-white/90 text-gray-900 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.35)] hover:border-orange-200 hover:bg-orange-50/80",
  ghost:
    "border border-transparent bg-transparent text-gray-700 hover:bg-white/80 hover:text-gray-900",
  danger:
    "border border-red-500 bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_18px_35px_-18px_rgba(239,68,68,0.65)] hover:shadow-[0_22px_40px_-18px_rgba(239,68,68,0.75)]",
};

const sizes = {
  sm: "rounded-2xl px-3.5 py-2.5 text-sm",
  md: "rounded-[20px] px-[18px] py-3 text-sm",
  lg: "rounded-[22px] px-5 py-3.5 text-base",
};

const Button = ({
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  leadingIcon = null,
  trailingIcon = null,
  children,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`group inline-flex items-center justify-center gap-2 font-black tracking-tight transition duration-200 ease-out ${
      variants[variant]
    } ${sizes[size]} ${
      disabled || loading
        ? "cursor-not-allowed opacity-60"
        : "active:scale-[0.98] hover:-translate-y-0.5"
    } ${className}`}
    {...props}
  >
    {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-current" />
    ) : leadingIcon ? (
      <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
        {leadingIcon}
      </span>
    ) : null}
    <span>{children}</span>
    {!loading && trailingIcon ? (
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">
        {trailingIcon}
      </span>
    ) : null}
  </button>
);

export default Button;
