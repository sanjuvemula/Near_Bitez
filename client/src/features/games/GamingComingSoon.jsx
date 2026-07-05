import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { appRoutes } from "../../app/routes.jsx";

const GamingComingSoon = () => (
  <div className="grid min-h-[70vh] place-items-center bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#ecfeff)] px-4 py-10 text-stone-950">
    <Motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/80 bg-white/88 p-7 text-center shadow-[0_34px_100px_-66px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-10"
    >
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-orange-50 text-xl font-black text-orange-700">
        NB
      </div>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
        Gaming Zone
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
        Coming soon.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-stone-600">
        We are pausing games for now while the next version is prepared.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to={appRoutes.customerHome}
          className="rounded-[18px] bg-orange-600 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-orange-700"
        >
          Back to food
        </Link>
        <Link
          to={appRoutes.customerOrders}
          className="rounded-[18px] border border-orange-100 bg-white px-5 py-3 text-sm font-black text-orange-700 no-underline transition hover:bg-orange-50"
        >
          View orders
        </Link>
      </div>
    </Motion.section>
  </div>
);

export default GamingComingSoon;
