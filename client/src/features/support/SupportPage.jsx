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
  { label: "Admin email", value: adminEmail, href: `mailto:${adminEmail}`, tone: "orange" },
  { label: "Owner", value: "Krish Taliyan", tone: "sky" },
  { label: "Support", value: "Sanju Sri", tone: "emerald" },
];

const supportTopics = [
  {
    title: "Order help",
    text: "Share order ID, restaurant name, and what went wrong.",
    tone: "orange",
  },
  {
    title: "Account help",
    text: "Send the registered email or phone number linked to the account.",
    tone: "sky",
  },
  {
    title: "Vendor help",
    text: "Mention restaurant name, owner email, and dashboard issue.",
    tone: "emerald",
  },
];

const inputClass =
  "w-full rounded-[18px] border border-[#ece4d7] bg-[#fcfbf8] px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100";

const statusClass = {
  OPEN: "bg-orange-50 text-orange-700",
  IN_REVIEW: "bg-sky-50 text-sky-700",
  PLANNED: "bg-violet-50 text-violet-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-stone-100 text-stone-600",
};

const toneMap = {
  orange: {
    dot: "bg-orange-500",
    soft: "border-orange-100 bg-orange-50 text-orange-700",
    panel: "border-orange-100 bg-[linear-gradient(135deg,#fff,#fff7ed)]",
  },
  sky: {
    dot: "bg-sky-500",
    soft: "border-sky-100 bg-sky-50 text-sky-700",
    panel: "border-sky-100 bg-[linear-gradient(135deg,#fff,#f0f9ff)]",
  },
  emerald: {
    dot: "bg-emerald-500",
    soft: "border-emerald-100 bg-emerald-50 text-emerald-700",
    panel: "border-emerald-100 bg-[linear-gradient(135deg,#fff,#f0fdf4)]",
  },
};

const Icon = ({ children, className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ArrowIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </Icon>
);

const MailIcon = (props) => (
  <Icon {...props}>
    <path d="M4 6h16v12H4z" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);

const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="m5 12 4 4L19 6" />
  </Icon>
);

const ContactTile = ({ item }) => {
  const tone = toneMap[item.tone] || toneMap.orange;
  const content = (
    <>
      <span className={`mb-4 inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">{item.label}</p>
      <p className="mt-2 truncate text-sm font-black text-stone-950">{item.value}</p>
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className={`block min-w-0 rounded-[22px] border p-4 no-underline shadow-[0_18px_44px_-38px_rgba(15,23,42,0.5)] ${tone.panel}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`min-w-0 rounded-[22px] border p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.5)] ${tone.panel}`}>
      {content}
    </div>
  );
};

const SupportHero = ({ isFeedback, feedbackHref }) => (
  <section className="relative overflow-hidden rounded-[32px] border border-[#eadfd4] bg-[#fffaf5] p-6 shadow-[0_30px_90px_-62px_rgba(15,23,42,0.42)] sm:p-8">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_11%_12%,rgba(251,146,60,0.2),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_78%_86%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,247,237,0.88))]" />
    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr),minmax(340px,0.95fr)] lg:items-center">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
          {isFeedback ? "Feedback" : "Contact"}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
          {isFeedback ? "Send the team a clear signal." : "Get help without hunting around."}
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-stone-600 sm:text-base">
          {isFeedback
            ? "Ideas, bugs, restaurant issues, and complaints go straight into the admin feedback queue."
            : "Use one clean contact route for orders, accounts, vendors, and partnership questions."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`mailto:${adminEmail}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-orange-600 px-5 text-sm font-black text-white no-underline shadow-[0_18px_35px_-20px_rgba(234,88,12,0.75)] transition hover:bg-orange-700"
          >
            <MailIcon />
            Email admin
          </a>
          <Link
            to={feedbackHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-[#eadfd4] bg-white px-5 text-sm font-black text-stone-800 no-underline transition hover:border-orange-200 hover:text-orange-700"
          >
            Open feedback
            <ArrowIcon />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {contactCards.map((item) => (
          <ContactTile key={item.label} item={item} />
        ))}
      </div>
    </div>
  </section>
);

const TopicCard = ({ topic }) => {
  const tone = toneMap[topic.tone] || toneMap.orange;

  return (
    <div className={`rounded-[20px] border p-4 ${tone.soft}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/82">
          <CheckIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black">{topic.title}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-stone-600">{topic.text}</p>
        </div>
      </div>
    </div>
  );
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
    <div className="mx-auto max-w-6xl space-y-8">
      <SupportHero isFeedback={isFeedback} feedbackHref={feedbackHref} />

      {isFeedback ? (
        canSubmit ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]">
            <Card className="border-orange-100 bg-[linear-gradient(135deg,#ffffff,#fff7ed)] p-5 sm:p-6">
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
                    className={`${inputClass} min-h-[170px] resize-y`}
                    value={form.message}
                    onChange={updateForm("message")}
                    placeholder="Write the issue, idea, or request"
                    maxLength={2000}
                    required
                  />
                </label>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={!form.title.trim() || !form.message.trim()}
                  trailingIcon={<ArrowIcon />}
                >
                  Send feedback
                </Button>
              </form>
            </Card>

            <aside className="space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">Activity</p>
                <h2 className="mt-1 text-xl font-black text-stone-950">Your recent feedback</h2>
              </div>
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
          <Card className="border-orange-100 bg-[linear-gradient(135deg,#ffffff,#fff7ed)] p-6 text-center">
            <h2 className="text-2xl font-black text-stone-950">Login to send trackable feedback</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-stone-500">
              Direct admin contact stays open by email. In-app feedback needs an account so admin can reply to the right user.
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
        <div className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr]">
          <Card className="border-orange-100 bg-[linear-gradient(135deg,#ffffff,#fff7ed)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
              Fastest route
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-stone-950">Email admin directly</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">
              Add the order ID, registered email, or restaurant name so the team can find the exact record quickly.
            </p>
            <div className="mt-6 rounded-[20px] border border-orange-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Send to</p>
              <a className="mt-2 block truncate text-lg font-black text-orange-700" href={`mailto:${adminEmail}`}>
                {adminEmail}
              </a>
            </div>
            <a
              href={`mailto:${adminEmail}`}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-stone-950 px-5 text-sm font-black text-white no-underline transition hover:bg-stone-800"
            >
              <MailIcon />
              Email admin
            </a>
          </Card>

          <Card className="border-sky-100 bg-[linear-gradient(135deg,#ffffff,#f0f9ff)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">
              Message checklist
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-stone-950">Include the right details</h2>
            <div className="mt-5 space-y-3">
              {supportTopics.map((topic) => (
                <TopicCard key={topic.title} topic={topic} />
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Card className="border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4,#ffffff)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Feedback queue</p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">Want to suggest a feature or report a product issue?</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">
                    Logged-in users can send feedback that stays attached to their account.
                  </p>
                </div>
                <Link
                  to={feedbackHref}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[16px] bg-emerald-600 px-4 text-sm font-black text-white no-underline transition hover:bg-emerald-700"
                >
                  Open feedback
                  <ArrowIcon />
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
