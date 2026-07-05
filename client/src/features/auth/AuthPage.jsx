import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import { appRoutes } from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import { getApiUrl } from "../../config/runtime.js";
import { formatCurrency } from "../../utils/formatters.js";

const roleCopy = {
  customer: {
    title: "Order from real local restaurants",
    subtitle: "Browse live menus, manage your cart, and track every order status in real time.",
    accent: "Customer",
    accentClass: "text-orange-600",
    redirect: appRoutes.customerHome,
    panelTitle: "Everything you need to order fast",
    panelDescription: "Discovery, favorites, cart sync, and order tracking all stay connected to live backend state.",
  },
  vendor: {
    title: "Run your restaurant from one dashboard",
    subtitle: "Manage restaurant details, menu availability, and incoming orders from a single live control panel.",
    accent: "Vendor",
    accentClass: "text-red-600",
    redirect: appRoutes.vendorDashboard,
    panelTitle: "A sharper operating system for vendors",
    panelDescription: "Review incoming orders, keep dishes available, and update your storefront without touching fake data.",
  },
};

const discoveryFallback = {
  restaurants: [],
  categories: [],
  featuredRestaurants: [],
  nearestRestaurants: [],
  bestValueRestaurants: [],
  highlights: { activeRestaurantCount: 0, availableDishCount: 0, averageDeliveryTime: 0, averageQualityScore: 0 },
};

const routeMap = {
  customer: { login: appRoutes.customerLogin, register: appRoutes.customerRegister },
  vendor: { login: appRoutes.vendorLogin, register: appRoutes.vendorRegister },
};

const getRedirectTarget = (user, fallback) => {
  if (user?.role === "admin") return "/admin";
  if (user?.role === "vendor") return appRoutes.vendorDashboard;
  if (user?.role === "customer") return fallback || appRoutes.customerHome;
  return fallback || appRoutes.publicHome;
};

const toggleClassName = (active, tone = "orange") =>
  `rounded-full px-4 py-2 text-sm font-black transition ${
    active
      ? tone === "red"
        ? "bg-red-500 text-white shadow-[0_18px_35px_-20px_rgba(239,68,68,0.6)]"
        : "bg-orange-600 text-white shadow-[0_18px_35px_-20px_rgba(234,88,12,0.7)]"
      : "bg-white text-gray-600 hover:bg-orange-50 hover:text-gray-900"
  }`;

const oauthMessages = {
  google_not_configured: "Google login is not configured on the server yet.",
  google_failed: "Google login could not finish. Please try again.",
  google_role_mismatch: "This Google account is already registered as a customer. Use a different email for vendor access.",
  access_denied: "Google access was cancelled.",
};

const GoogleButton = ({ role, mode }) => {
  const params = new URLSearchParams({ role, mode });

  return (
  <a
    href={getApiUrl(`/auth/google?${params.toString()}`)}
    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
  >
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Continue with Google
  </a>
  );
};

// OTP Login Component
const OTPLogin = ({ onBack }) => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email"); // email | otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/otp/send", { email });
      setStep("otp");
      setSuccess(`OTP sent to ${email}`);
    } catch (err) {
      setError(err.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/otp/verify", { email, otp });
      const nextUser = await refreshUser();
      navigate(getRedirectTarget(nextUser), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition">
          ← Back
        </button>
        <p className="text-sm font-semibold text-gray-600">
          {step === "email" ? "Enter your email to receive OTP" : "Enter the OTP sent to your email"}
        </p>
      </div>

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Enter 6-digit OTP
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-gray-900 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); setSuccess(""); setError(""); }}
            className="w-full text-sm text-gray-400 hover:text-orange-600 transition"
          >
            Resend OTP
          </button>
        </form>
      )}
    </div>
  );
};

const AuthPage = ({ mode, role }) => {
  const { authReady, loading, login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "" });
  const [discovery, setDiscovery] = useState(discoveryFallback);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  const copy = roleCopy[role];
  const tone = role === "vendor" ? "red" : "orange";

  useEffect(() => {
    let active = true;
    const loadDiscovery = async () => {
      try {
        const response = await api.get("/restaurants/discover");
        if (active) setDiscovery(response.data || discoveryFallback);
      } catch {
        if (active) setDiscovery(discoveryFallback);
      }
    };
    loadDiscovery();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const oauth = new URLSearchParams(location.search).get("oauth");
    if (!oauth) return;
    setError(oauthMessages[oauth] || "Google login could not finish. Please try again.");
  }, [location.search]);

  const liveMetrics = useMemo(
    () => [
      { label: "Restaurants live", value: discovery.highlights.activeRestaurantCount },
      {
        label: role === "vendor" ? "Avg quality score" : "Dishes live",
        value: role === "vendor" ? `${discovery.highlights.averageQualityScore || 0}/100` : discovery.highlights.availableDishCount,
      },
      {
        label: "Avg delivery",
        value: discovery.highlights.averageDeliveryTime ? `${discovery.highlights.averageDeliveryTime} min` : "Fast",
      },
    ],
    [discovery.highlights, role]
  );

  const feedCards = role === "vendor" ? discovery.nearestRestaurants?.slice(0, 3) : discovery.featuredRestaurants?.slice(0, 3);
  const onChange = (key) => (event) => setFormData((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let nextUser = null;
      if (mode === "login") {
        nextUser = await login(role, { email: formData.email, password: formData.password });
      } else {
        nextUser = await register(role, formData);
      }
      const destination = getRedirectTarget(nextUser, location.state?.from?.pathname || copy.redirect);
      navigate(destination, { replace: true });
    } catch (apiError) {
      setError(apiError.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (authReady && !loading && user) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : user.role === "vendor" ? appRoutes.vendorDashboard : appRoutes.customerHome}
        replace
      />
    );
  }

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.12),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#f8f5f2_100%)] lg:grid-cols-[1fr,0.95fr]">
      <section className="flex items-center px-4 py-12 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-xl rounded-[36px] border border-white/70 bg-white/92 p-8 shadow-[0_35px_90px_-48px_rgba(15,23,42,0.42)] backdrop-blur xl:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="rounded-2xl bg-orange-600 p-3 text-white shadow-lg shadow-orange-600/30">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <span className="text-2xl font-black tracking-tight text-gray-900">NearBitez</span>
            </Link>
            <Link to={appRoutes.publicHome} className="text-sm font-bold text-gray-500 transition hover:text-orange-600">
              Continue browsing
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 rounded-[28px] bg-slate-50 p-2">
            {Object.entries(routeMap).map(([currentRole, routes]) => (
              <Link
                key={currentRole}
                to={mode === "login" ? routes.login : routes.register}
                className={toggleClassName(currentRole === role, currentRole === "vendor" ? "red" : "orange")}
              >
                {currentRole === "vendor" ? "Vendor" : "Customer"}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={routeMap[role].login} className={toggleClassName(mode === "login", tone)}>Login</Link>
            <Link to={routeMap[role].register} className={toggleClassName(mode === "register", tone)}>Register</Link>
          </div>

          <div className="mt-8">
            <p className={`text-xs font-black uppercase tracking-[0.25em] ${copy.accentClass}`}>{copy.accent}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">{copy.subtitle}</p>
          </div>

          {/* Google + OTP — only for customer login */}
          {!showOTP && (
            <div className="mt-6 space-y-3">
              <GoogleButton role={role} mode={mode} />
              {role === "customer" && mode === "login" ? (
                <button
                  onClick={() => setShowOTP(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Login with OTP
                </button>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400">
                  {mode === "login" ? "or use password" : "or use email"}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          )}

          {/* OTP Form */}
          {showOTP ? (
            <div className="mt-6">
              <OTPLogin onBack={() => setShowOTP(false)} />
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <Input
                    label={role === "vendor" ? "Owner name" : "Full name"}
                    value={formData.name}
                    onChange={onChange("name")}
                    placeholder={role === "vendor" ? "Restaurant owner name" : "Your full name"}
                    required
                  />
                  <Input label="Phone" value={formData.phone} onChange={onChange("phone")} placeholder="+91 98765 43210" />
                </>
              )}
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={onChange("email")}
                placeholder={role === "vendor" ? "vendor@restaurant.com" : "you@example.com"}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={onChange("password")}
                placeholder="Minimum 6 characters"
                required
              />
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full rounded-2xl py-3.5 text-base" disabled={submitting}>
                {submitting
                  ? mode === "login" ? "Signing you in..." : "Creating account..."
                  : mode === "login"
                  ? role === "vendor" ? "Login to vendor dashboard" : "Login to customer account"
                  : role === "vendor" ? "Create vendor account" : "Create customer account"}
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.25),transparent_30%),linear-gradient(160deg,#111827,#1f2937)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-300">Live data only</p>
          <h2 className="mt-6 max-w-xl text-5xl font-black leading-tight tracking-tight">{copy.title}</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">{copy.panelDescription}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {liveMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[28px] border border-white/10 bg-white/6 px-5 py-5 backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200">{metric.label}</p>
                <p className="mt-4 text-3xl font-black">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
              {role === "vendor" ? "Nearby storefronts" : "Top restaurants right now"}
            </p>
            <div className="mt-5 space-y-4">
              {feedCards.length > 0 ? feedCards.map((restaurant) => (
                <div key={restaurant._id} className="rounded-[24px] border border-white/8 bg-black/10 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-black">{restaurant.name}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-300">{restaurant.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200">
                        {role === "vendor" ? "Distance" : "Starts at"}
                      </p>
                      <p className="mt-1 text-base font-black">
                        {role === "vendor" ? `${Number(restaurant.distanceKm || 0).toFixed(1)} km` : formatCurrency(restaurant.minimumItemPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[24px] border border-white/8 bg-black/10 px-4 py-4 text-sm font-semibold text-gray-300">
                  Discovery data will appear here once restaurants are available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">Product signals</p>
            <h3 className="mt-4 text-2xl font-black tracking-tight">{copy.panelTitle}</h3>
            <div className="mt-5 space-y-3">
              {[
                `${discovery.categories.length} cuisine groups currently showing in discovery`,
                `${discovery.featuredRestaurants.length} ranked restaurants surfaced from live data`,
                role === "vendor" ? "Vendor actions update real store and order state instantly" : "Cart, favorites, and checkout stay synced with backend state",
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-white/8 bg-black/10 px-4 py-4 text-sm font-semibold text-gray-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
