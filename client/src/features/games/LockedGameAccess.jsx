import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { appRoutes } from "../../app/routes.jsx";

const LockedGameAccess = ({ message = "Place an order to unlock games.", compact = false }) => (
  <div className="grid min-h-[70vh] place-items-center bg-[linear-gradient(135deg,#fff7ed,#f0fdfa_48%,#eef2ff)] px-4 py-10 text-stone-950">
    <Motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={[
        "relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/80 bg-white/85 p-6 text-center shadow-[0_34px_100px_-66px_rgba(14,116,144,0.55)] backdrop-blur-xl",
        compact ? "sm:p-8" : "sm:p-10",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(45,212,191,0.22),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(244,114,182,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.2),transparent_34%)]" />
      <div className="relative">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] border border-orange-200 bg-orange-50 text-lg font-black text-orange-700">
          XP
        </div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-teal-600">
          Order reward locked
        </p>
        <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
          Games unlock after a real order.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-stone-600">
          {message} Once you place an order, the arcade opens for fun rounds,
          live battles, and bot matches. Rewards are being prepared and will come soon.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={appRoutes.customerHome}
            className="rounded-[18px] bg-orange-600 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-orange-700"
          >
            Order food
          </Link>
          <Link
            to={appRoutes.customerOrders}
            className="rounded-[18px] border border-orange-100 bg-white px-5 py-3 text-sm font-black text-orange-700 no-underline transition hover:bg-orange-50"
          >
            View orders
          </Link>
        </div>
      </div>
    </Motion.section>
  </div>
);

export default LockedGameAccess;
