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
        "mt-12 border-t border-[#eee7dc] bg-white/78 backdrop-blur",
        compact ? "px-4 py-6" : "px-4 py-8 sm:px-6 lg:px-8",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-black text-stone-950">
            Near<span className="text-orange-600">Bitez</span>
          </p>
          <p className="mt-1 text-sm font-bold text-stone-500">
            Admin contact:{" "}
            <a className="text-orange-700 underline-offset-4 hover:underline" href={`mailto:${adminEmail}`}>
              {adminEmail}
            </a>
          </p>
          <p className="mt-1 text-xs font-bold text-stone-400">
            Krish Taliyan and Sanju Sri
          </p>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link
            to={contactHref}
            className="rounded-full border border-[#eee7dc] bg-white px-4 py-2 text-sm font-black text-stone-600 no-underline transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            Contact us
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
