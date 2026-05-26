const Input = ({ label, hint = "", className = "", inputClassName = "", ...props }) => (
  <label className={`block ${className}`}>
    {label ? (
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
          {label}
        </span>
        {hint ? <span className="text-xs font-semibold text-gray-400">{hint}</span> : null}
      </div>
    ) : null}
    <input
      className={`w-full rounded-[20px] border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-900 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.55)] outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${inputClassName}`}
      {...props}
    />
  </label>
);

export default Input;
