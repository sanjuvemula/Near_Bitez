const Loader = ({ label = "Loading...", compact = false }) => (
  <div className={`flex items-center justify-center ${compact ? "min-h-[120px]" : "min-h-[260px]"}`}>
    <div className="flex items-center gap-4 rounded-full border border-white/70 bg-white/90 px-5 py-3 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-red-500" />
      </div>
      <span className="text-sm font-bold text-gray-600">{label}</span>
    </div>
  </div>
);

export default Loader;
