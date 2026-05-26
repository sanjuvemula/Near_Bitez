import { formatStatusLabel } from "../../../utils/formatters.js";
import {
  CUSTOMER_ORDER_STEPS,
  getCustomerStatusClassName,
  getOrderProgressIndex,
} from "../customerShared.js";

export const CustomerPanel = ({ className = "", children }) => (
  <section
    className={`rounded-[34px] border border-white/80 bg-white/95 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.5)] ${className}`}
  >
    {children}
  </section>
);

export const CustomerHero = ({
  eyebrow,
  title,
  description,
  stats = [],
  action = null,
}) => (
  <section className="rounded-[38px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),transparent_30%),linear-gradient(145deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_40px_90px_-55px_rgba(15,23,42,0.38)] md:p-8">
    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600">
          {description}
        </p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[24px] border border-white/80 bg-white/90 px-4 py-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-black text-gray-950">{stat.value}</p>
            {stat.detail ? (
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                {stat.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const CustomerEmptyState = ({ title, description, action }) => (
  <CustomerPanel className="p-12 text-center">
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-dashed border-orange-200 bg-orange-50 text-3xl font-black text-orange-500">
      <span>+</span>
    </div>
    <h2 className="mt-6 text-3xl font-black tracking-tight text-gray-950">{title}</h2>
    <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-gray-500">
      {description}
    </p>
    {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
  </CustomerPanel>
);

export const CustomerStatusBadge = ({ status }) => (
  <span
    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${getCustomerStatusClassName(
      status
    )}`}
  >
    {formatStatusLabel(status)}
  </span>
);

export const OrderProgressStrip = ({ status }) => {
  if (status === "REJECTED") {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600">
        This order was not accepted by the restaurant.
      </div>
    );
  }

  const activeIndex = getOrderProgressIndex(status);

  return (
    <div className="grid gap-2 md:grid-cols-6">
      {CUSTOMER_ORDER_STEPS.map((step, index) => {
        const reached = activeIndex >= index;

        return (
          <div
            key={step}
            className={`rounded-[20px] px-3 py-3 ${
              reached ? "bg-orange-50 text-orange-700" : "bg-slate-50 text-gray-400"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em]">
              Step {index + 1}
            </p>
            <p className="mt-1 text-sm font-black">{formatStatusLabel(step)}</p>
          </div>
        );
      })}
    </div>
  );
};
