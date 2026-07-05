import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import { appRoutes } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";

const adminEmail = "nearbitez@gmail.com";

const feedbackTypes = [
  { value: "SUGGESTION", label: "Suggestion" },
  { value: "BUG_REPORT", label: "Bug report" },
  { value: "FEATURE_REQUEST", label: "Feature request" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "RESTAURANT_ISSUE", label: "Restaurant issue" },
];

const inputClass =
  "w-full rounded-[18px] border border-[#ece4d7] bg-[#fcfbf8] px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white";

const statusClass = {
  OPEN: "bg-orange-50 text-orange-700",
  IN_REVIEW: "bg-sky-50 text-sky-700",
  PLANNED: "bg-violet-50 text-violet-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-stone-100 text-stone-600",
};

const SupportPage = ({ mode = "contact" }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: "SUGGESTION",
    title: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const isFeedback = mode === "feedback";
  const canSubmit = Boolean(user);

  useEffect(() => {
    if (!canSubmit || !isFeedback) return;
    setLoadingTickets(true);
    api
      .get("/feedback")
      .then((response) => setTickets(Array.isArray(response.data) ? response.data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [canSubmit, isFeedback]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await api.post("/feedback", form);
      setTickets((current) => [response.data, ...current].filter(Boolean));
      setForm({ type: "SUGGESTION", title: "", message: "" });
      toast.success("Feedback sent to admin");
    } catch (error) {
      toast.error(error.message || "Unable to send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#fff7ed,#ffffff_52%,#ecfeff)] p-6 shadow-[0_30px_90px_-62px_rgba(15,23,42,0.42)] sm:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">
          {isFeedback ? "Feedback" : "Contact us"}
        </p>
        <h1 className="mt-2 text-4xl font-black text-stone-950">
          {isFeedback ? "Tell admin what to improve." : "Contact NearBitez admin."}
        </h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
              Email
            </p>
            <a className="mt-2 block truncate text-sm font-black text-orange-700" href={`mailto:${adminEmail}`}>
              {adminEmail}
            </a>
          </div>
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
              Team
            </p>
            <p className="mt-2 text-sm font-black text-stone-950">Krish Taliyan</p>
          </div>
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
              Team
            </p>
            <p className="mt-2 text-sm font-black text-stone-950">Sanju Sri</p>
          </div>
        </div>
      </section>

      {isFeedback ? (
        canSubmit ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),340px]">
            <Card className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-stone-900">Type</span>
                  <select className={inputClass} value={form.type} onChange={updateForm("type")}>
                    {feedbackTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-stone-900">Title</span>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={updateForm("title")}
                    placeholder="Short summary"
                    maxLength={120}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-stone-900">Details</span>
                  <textarea
                    className={`${inputClass} min-h-[160px] resize-y`}
                    value={form.message}
                    onChange={updateForm("message")}
                    placeholder="Write the issue, idea, or request"
                    maxLength={2000}
                    required
                  />
                </label>
                <Button type="submit" loading={submitting} disabled={!form.title.trim() || !form.message.trim()}>
                  Send feedback
                </Button>
              </form>
            </Card>

            <aside className="space-y-3">
              <h2 className="text-lg font-black text-stone-950">Your recent feedback</h2>
              {loadingTickets ? (
                <Card className="p-4 text-sm font-bold text-stone-500">Loading...</Card>
              ) : tickets.length ? (
                tickets.slice(0, 5).map((ticket) => (
                  <Card key={ticket._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-stone-950">
                        {ticket.title}
                      </p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass[ticket.status] || statusClass.OPEN}`}>
                        {String(ticket.status || "OPEN").replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-stone-500">
                      {ticket.message}
                    </p>
                  </Card>
                ))
              ) : (
                <Card className="p-4 text-sm font-bold text-stone-500">
                  No feedback sent yet.
                </Card>
              )}
            </aside>
          </div>
        ) : (
          <Card className="p-6 text-center">
            <h2 className="text-2xl font-black text-stone-950">Login to send feedback</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-stone-500">
              Direct admin contact is always open by email. In-app feedback needs an account so admin can reply to the right user.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to={appRoutes.customerLogin}
                className="rounded-[18px] bg-orange-600 px-5 py-3 text-sm font-black text-white no-underline"
              >
                Customer login
              </Link>
              <Link
                to={appRoutes.vendorLogin}
                className="rounded-[18px] border border-[#eee7dc] bg-white px-5 py-3 text-sm font-black text-stone-700 no-underline"
              >
                Vendor login
              </Link>
            </div>
          </Card>
        )
      ) : (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-stone-950">Need admin help?</h2>
              <p className="mt-2 text-sm font-semibold text-stone-500">
                Send order, account, vendor, or partnership queries to the admin email.
              </p>
            </div>
            <a
              href={`mailto:${adminEmail}`}
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-stone-950 px-5 text-sm font-black text-white no-underline transition hover:bg-stone-800"
            >
              Email admin
            </a>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SupportPage;
