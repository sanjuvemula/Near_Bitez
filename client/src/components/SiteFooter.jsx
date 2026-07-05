import { Link } from "react-router-dom";
import { appRoutes } from "../app/routes.jsx";
import { useAuth } from "../hooks/useAuth.js";

const adminEmail = "nearbitez@gmail.com";

const SiteFooter = ({ compact = false }) => {
  const { user } = useAuth();
  const inCustomerApp = user?.role === "customer" || user?.role === "admin";
  const contactHref = inCustomerApp ? appRoutes.customerContact : appRoutes.contact;
  const feedbackHref = inCustomerApp ? appRoutes.customerFeedback : appRoutes.feedback;

  return (
    <footer
      className={[
        "mt-12 border-t border-[#eee7dc] bg-white/82 backdrop-blur",
        compact ? "px-4 py-6" : "px-4 py-9 sm:px-6 lg:px-8",
      ].join(" ")}
    >
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[minmax(0,1fr),auto] md:items-center">
        <div className="min-w-0">
          <p className="text-lg font-black text-stone-950">
            Near<span className="text-orange-600">Bitez</span>
          </p>
          <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-stone-500">
            Need order, account, or vendor help? Message the admin team and we will check it properly.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            <a className="text-orange-700 underline-offset-4 hover:underline" href={`mailto:${adminEmail}`}>
              {adminEmail}
            </a>
            <span className="text-stone-300">/</span>
            <span className="text-stone-500">Krish Taliyan</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-500">Sanju Sri</span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 md:justify-end">
          <Link
            to={contactHref}
            className="rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-black text-orange-700 no-underline transition hover:border-orange-200 hover:bg-orange-100"
          >
            Contact admin
          </Link>
          <Link
            to={feedbackHref}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-black text-white no-underline transition hover:bg-stone-800"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default SiteFooter;
