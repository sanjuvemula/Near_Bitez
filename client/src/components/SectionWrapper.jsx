const SectionWrapper = ({
  eyebrow,
  title,
  subtitle,
  action,
  className = "",
  children,
  id,
}) => (
  <section id={id} className={`space-y-4 ${className}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-black text-stone-950 sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm font-semibold text-stone-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

export default SectionWrapper;
