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

const contactCards = [
  { label: "Admin email", value: adminEmail, href: `mailto:${adminEmail}` },
  { label: "Owner", value: "Krish Taliyan" },
  { label: "Support", value: "Sanju Sri" },
];

const supportTopics = [
  {
    title: "Order help",
    text: "Share order ID, restaurant name, and the issue.",
    tone: "bg-orange-50 border-orange-100 text-orange-700",
  },
  {
    title: "Account help",
    text: "Send your registered email and what is not working.",
    tone: "bg-sky-50 border-sky-100 text-sky-700",
  },
  {
    title: "Vendor help",
    text: "Mention restaurant name, owner email, and dashboard issue.",
    tone: "bg-emerald-50 border-emerald-100 text-emerald-700",
  },
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
  const feedbackHref =
    user?.role === "customer" || user?.role === "admin"
      ? appRoutes.customerFeedback
      : appRoutes.feedback;

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
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">
            {isFeedback ? "Feedback" : "Contact"}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-stone-950">
            {isFeedback ? "Tell admin what to improve." : "We are here to help."}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">
            {isFeedback
              ? "Send product ideas, bugs, and restaurant issues directly to admin."
              : "For orders, accounts, vendors, and partnerships, reach the NearBitez admin team here."}
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {contactCards.map((item) => (
            <div key={item.label} className="rounded-[20px] border border-white/80 bg-white/86 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
                {item.label}
              </p>
              {item.href ? (
                <a className="mt-2 block truncate text-sm font-black text-orange-700" href={item.href}>
                  {item.value}
                </a>
              ) : (
                <p className="mt-2 truncate text-sm font-black text-stone-950">{item.value}</p>
              )}
            </div>
          ))}
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
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <Card className="border-orange-100 bg-[linear-gradient(135deg,#fff,#fff7ed)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
              Fastest contact
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-950">Email admin directly</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
              Add the order ID or registered email so the team can find the right account quickly.
            </p>
            <a
              href={`mailto:${adminEmail}`}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[18px] bg-stone-950 px-5 text-sm font-black text-white no-underline transition hover:bg-stone-800"
            >
              Email admin
            </a>
          </Card>

          <Card className="border-sky-100 bg-[linear-gradient(135deg,#ffffff,#f0f9ff)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">
              Good message
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-950">What to include</h2>
            <div className="mt-4 space-y-3">
              {supportTopics.map((topic) => (
                <div key={topic.title} className={`rounded-[18px] border p-4 ${topic.tone}`}>
                  <p className="text-sm font-black">{topic.title}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-stone-600">{topic.text}</p>
                </div>
              ))}
            </div>
          </Card>
          <div className="lg:col-span-2">
            <Card className="border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4,#ffffff)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-stone-950">Want to suggest a feature?</p>
                  <p className="mt-1 text-sm font-semibold text-stone-500">
                    Logged-in users can send trackable feedback from the app.
                  </p>
                </div>
                <Link
                  to={feedbackHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-[16px] bg-emerald-600 px-4 text-sm font-black text-white no-underline transition hover:bg-emerald-700"
                >
                  Open feedback
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPage;
