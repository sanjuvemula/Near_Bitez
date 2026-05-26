import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Loader from "../../components/Loader.jsx";
import { appRoutes, getCustomerOrderRoute } from "../../app/routes.jsx";
import { LIVE_ORDER_STATUSES } from "../customer/customerShared.js";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import { formatCurrency, formatDateTime } from "../../utils/formatters.js";

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  BRONZE:   { color: "#b45309", bg: "#fef3c7", border: "#fde68a", emoji: "🥉", label: "Bronze"   },
  SILVER:   { color: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb", emoji: "🥈", label: "Silver"   },
  GOLD:     { color: "#d97706", bg: "#fffbeb", border: "#fde68a", emoji: "🥇", label: "Gold"     },
  PLATINUM: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", emoji: "💎", label: "Platinum" },
};

const STATUS_DOT = {
  DELIVERED: "#16a34a",
  PENDING:   "#d97706",
  CONFIRMED: "#2563eb",
  PREPARING: "#7c3aed",
  READY:     "#0891b2",
  PICKED_UP: "#ea580c",
  REJECTED:  "#dc2626",
};

const NEO_STAT_STYLE = {
  background: "#f4f1ec",
  border: "1.5px solid #e5dccf",
  borderRadius: 14,
  boxShadow:
    "inset 7px 7px 14px rgba(139,120,96,0.14), inset -7px -7px 14px rgba(255,255,255,0.92), 0 1px 2px rgba(65,54,43,0.05)",
};

const NEO_LABEL_STYLE = {
  fontSize: 11,
  color: "#9ca3af",
  fontWeight: 800,
  letterSpacing: 0,
  lineHeight: 1,
  marginBottom: 8,
  textTransform: "uppercase",
};

const NEO_VALUE_STYLE = {
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1,
};

const ProfileNeoStat = ({ label, value }) => (
  <div style={{ ...NEO_STAT_STYLE, padding: "13px 18px", textAlign: "center", minWidth: 78 }}>
    <p style={NEO_LABEL_STYLE}>{label}</p>
    <p style={NEO_VALUE_STYLE}>{value}</p>
  </div>
);

// ─── Small field card ─────────────────────────────────────────────────────────
const InfoCard = ({ label, value, icon }) => (
  <div style={{
    background: "#f9fafb",
    border: "1.5px solid #f3f4f6",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  }}>
    {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{value || "—"}</p>
    </div>
  </div>
);

// ─── Loyalty Card ─────────────────────────────────────────────────────────────
const LoyaltyCard = ({ loyalty }) => {
  if (!loyalty) return (
    <div style={{ background: "#f9fafb", border: "1.5px solid #f3f4f6", borderRadius: 18, padding: "20px", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading loyalty info...</p>
    </div>
  );

  const tier = TIER_CONFIG[loyalty.tier] || TIER_CONFIG.BRONZE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: `linear-gradient(135deg, ${tier.bg} 0%, #fff 100%)`,
        border: `1.5px solid ${tier.border}`,
        borderRadius: 18,
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100,
        borderRadius: "50%",
        background: `${tier.color}12`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: tier.color, marginBottom: 4 }}>
            {tier.emoji} {tier.label} Member
          </p>
          <div style={{ ...NEO_STAT_STYLE, padding: "13px 18px", minWidth: 148, marginTop: 8 }}>
            <p style={NEO_LABEL_STYLE}>XP</p>
            <p style={NEO_VALUE_STYLE}>{loyalty.points.toLocaleString()}</p>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            = <span style={{ fontWeight: 700, color: tier.color }}>₹{loyalty.discountValue}</span> redeemable discount
          </p>
        </div>
        <div style={{
          background: tier.color,
          color: "#fff",
          borderRadius: 12,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {loyalty.totalPointsEarned.toLocaleString()} lifetime
        </div>
      </div>

      {loyalty.nextTier && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
              {loyalty.pointsToNext} XP to {loyalty.nextTier[0] + loyalty.nextTier.slice(1).toLowerCase()}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: tier.color }}>{loyalty.tierProgress}%</span>
          </div>
          <div style={{
            height: 10,
            background: "#f4f1ec",
            border: "1px solid #e5dccf",
            borderRadius: 100,
            overflow: "hidden",
            boxShadow: "inset 5px 5px 10px rgba(139,120,96,0.14), inset -5px -5px 10px rgba(255,255,255,0.9)",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${loyalty.tierProgress}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              style={{ height: "100%", background: tier.color, borderRadius: 100 }}
            />
          </div>
        </div>
      )}

      <div style={{
        marginTop: 14,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.7)",
        borderRadius: 10,
        fontSize: 11,
        color: "#6b7280",
        fontWeight: 500,
      }}>
        💡 Earn 1 point for every ₹10 spent. Redeem 10 pts = ₹1 off.
      </div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name:    user?.name    || "",
    phone:   user?.phone   || "",
    address: user?.address || "",
  });
  const [orders, setOrders]           = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loyalty, setLoyalty]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState("info");

  useEffect(() => {
    setForm({
      name:    user?.name    || "",
      phone:   user?.phone   || "",
      address: user?.address || "",
    });
  }, [user]);

  useEffect(() => {
    let active = true;

    // Load recent orders
    api.get("/orders")
      .then((r) => { if (active) setOrders((r?.data ?? r)?.slice(0, 6) ?? []); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingOrders(false); });

    // Load loyalty
    api.get("/orders/loyalty")
      .then((r) => { if (active) setLoyalty(r.data); })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  const profileCompletion = useMemo(() => {
    const fields = [form.name.trim(), form.phone.trim(), form.address.trim()];
    return Math.round((fields.filter(Boolean).length / 3) * 100);
  }, [form]);

  const hasChanges =
    form.name    !== (user?.name    || "") ||
    form.phone   !== (user?.phone   || "") ||
    form.address !== (user?.address || "");

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => LIVE_ORDER_STATUSES.includes(o.status)).length,
    [orders]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated ✓");
    } catch (err) {
      toast.error(err.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter = (user?.name || user?.email || "U")[0].toUpperCase();
  const tierCfg = TIER_CONFIG[loyalty?.tier] || TIER_CONFIG.BRONZE;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#fafaf8", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .prof-input {
          width: 100%;
          background: #f9fafb;
          border: 1.5px solid #f0f0f0;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .prof-input::placeholder { color: #d1d5db; }
        .prof-input:focus {
          border-color: #ea580c;
          box-shadow: 0 0 0 3px rgba(234,88,12,0.08);
          background: #fff;
        }

        .tab-btn {
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          background: transparent;
          color: #9ca3af;
          font-family: inherit;
        }
        .tab-btn.active {
          background: #ea580c;
          color: #fff;
          box-shadow: 0 4px 12px rgba(234,88,12,0.25);
        }
        .tab-btn:hover:not(.active) {
          background: #f3f4f6;
          color: #374151;
        }

        .order-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 14px;
          background: #f9fafb;
          border: 1.5px solid #f3f4f6;
          text-decoration: none;
          transition: all 0.15s;
        }
        .order-row:hover {
          border-color: #fed7aa;
          background: #fff7ed;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(234,88,12,0.08);
        }

        .readiness-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#fff",
          border: "1.5px solid #f3f4f6",
          borderRadius: 22,
          padding: "24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="76" height="76" style={{ position: "absolute", top: -6, left: -6, transform: "rotate(-90deg)" }}>
            <circle cx="38" cy="38" r="34" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
            <circle
              cx="38" cy="38" r="34"
              fill="none" stroke="#ea580c" strokeWidth="3.5"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - profileCompletion / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div style={{
            width: 60, height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ea580c, #f97316)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900,
            color: "white",
            boxShadow: "0 4px 16px rgba(234,88,12,0.3)",
          }}>
            {avatarLetter}
          </div>
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", marginBottom: 3 }}>
            {user?.name || "Your Account"}
          </p>
          <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{user?.email}</p>
          {loyalty && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              padding: "3px 10px",
              background: tierCfg.bg,
              border: `1px solid ${tierCfg.border}`,
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              color: tierCfg.color,
            }}>
              {tierCfg.emoji} {tierCfg.label}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Profile",  value: `${profileCompletion}%` },
            { label: "Active",   value: activeOrdersCount },
            { label: "Orders",   value: orders.length },
          ].map((s) => (
            <ProfileNeoStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: 4,
        background: "#fff",
        border: "1.5px solid #f3f4f6",
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
        width: "fit-content",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        {[
          { id: "info",    label: "Profile Info" },
          { id: "loyalty", label: "🏆 Rewards"   },
          { id: "orders",  label: "Recent Orders" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Info Tab ────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

              {/* Edit form */}
              <div style={{
                background: "#fff",
                border: "1.5px solid #f3f4f6",
                borderRadius: 20,
                padding: "22px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ea580c", marginBottom: 18 }}>
                  Personal Details
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { key: "name",    label: "Full Name",               placeholder: "Your name",             type: "text" },
                    { key: "phone",   label: "Phone Number",            placeholder: "+91 xxxxx xxxxx",       type: "tel"  },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 7 }}>
                        {label}
                      </label>
                      <input
                        className="prof-input"
                        type={type}
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 7 }}>
                      Default Delivery Address
                    </label>
                    <textarea
                      className="prof-input"
                      placeholder="Your delivery address..."
                      rows={3}
                      style={{ resize: "none", lineHeight: 1.6 }}
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    style={{
                      flex: 1,
                      padding: "11px 20px",
                      background: hasChanges && !saving ? "#ea580c" : "#f3f4f6",
                      color: hasChanges && !saving ? "#fff" : "#9ca3af",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: hasChanges && !saving ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setForm({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" })}
                    style={{
                      padding: "11px 18px",
                      background: "#f9fafb",
                      color: "#6b7280",
                      border: "1.5px solid #f3f4f6",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Account info */}
                <div style={{
                  background: "#fff",
                  border: "1.5px solid #f3f4f6",
                  borderRadius: 20,
                  padding: "22px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ea580c", marginBottom: 14 }}>
                    Account Info
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <InfoCard label="Email"        value={user?.email}                                    icon="📧" />
                    <InfoCard label="Member Since" value={user?.createdAt ? formatDateTime(user.createdAt) : "Recently joined"} icon="📅" />
                  </div>
                </div>

                {/* Checkout readiness */}
                <div style={{
                  background: "#fff",
                  border: "1.5px solid #f3f4f6",
                  borderRadius: 20,
                  padding: "22px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ea580c", marginBottom: 14 }}>
                    Checkout Readiness
                  </p>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Profile complete</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: profileCompletion === 100 ? "#16a34a" : "#ea580c" }}>{profileCompletion}%</span>
                    </div>
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 100, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${profileCompletion}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                          height: "100%",
                          background: profileCompletion === 100
                            ? "linear-gradient(90deg, #16a34a, #22c55e)"
                            : "linear-gradient(90deg, #ea580c, #f97316)",
                          borderRadius: 100,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Name added",    done: Boolean(form.name.trim())    },
                      { label: "Phone added",   done: Boolean(form.phone.trim())   },
                      { label: "Address saved", done: Boolean(form.address.trim()) },
                    ].map((item) => (
                      <div key={item.label} className="readiness-row">
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{item.label}</span>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          background: item.done ? "#dcfce7" : "#fef3c7",
                          color: item.done ? "#16a34a" : "#d97706",
                        }}>
                          {item.done ? "✓ Ready" : "Needed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Loyalty Tab ─────────────────────────────────── */}
        {activeTab === "loyalty" && (
          <motion.div
            key="loyalty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              <LoyaltyCard loyalty={loyalty} />

              {/* How it works */}
              <div style={{
                background: "#fff",
                border: "1.5px solid #f3f4f6",
                borderRadius: 20,
                padding: "22px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ea580c", marginBottom: 16 }}>
                  How It Works
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: "🛍️", title: "Place an order",       desc: "Earn 1 point for every ₹10 spent"              },
                    { icon: "📈", title: "Climb the tiers",       desc: "500 → Silver · 1500 → Gold · 4000 → Platinum"  },
                    { icon: "🎁", title: "Redeem anytime",        desc: "10 pts = ₹1 discount at checkout"              },
                  ].map((step) => (
                    <div key={step.title} style={{
                      display: "flex",
                      gap: 14,
                      padding: "12px 14px",
                      background: "#f9fafb",
                      borderRadius: 12,
                      border: "1px solid #f3f4f6",
                    }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{step.icon}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{step.title}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tier table */}
                <div style={{ marginTop: 18 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 }}>
                    Tier Levels
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(TIER_CONFIG).map(([key, t]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          borderRadius: 10,
                          background: loyalty?.tier === key ? t.bg : "#f9fafb",
                          border: `1.5px solid ${loyalty?.tier === key ? t.border : "#f3f4f6"}`,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: loyalty?.tier === key ? t.color : "#6b7280" }}>
                          {t.emoji} {t.label}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: loyalty?.tier === key ? t.color : "#9ca3af",
                          background: loyalty?.tier === key ? "#fff" : "transparent",
                          padding: loyalty?.tier === key ? "2px 8px" : "0",
                          borderRadius: 100,
                        }}>
                          {key === "BRONZE" ? "0 pts" : key === "SILVER" ? "500 pts" : key === "GOLD" ? "1500 pts" : "4000 pts"}
                          {loyalty?.tier === key ? " · Current" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Recent Orders Tab ───────────────────────────── */}
        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{
              background: "#fff",
              border: "1.5px solid #f3f4f6",
              borderRadius: 20,
              padding: "22px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ea580c" }}>
                  Recent Orders
                </p>
                <Link
                  to={appRoutes.customerOrders}
                  style={{ fontSize: 13, fontWeight: 700, color: "#ea580c", textDecoration: "none" }}
                >
                  View all →
                </Link>
              </div>

              {loadingOrders ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>Loading orders...</div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px" }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🍽️</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>No orders yet</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Your orders will show up after your first bite</p>
                  <Link
                    to={appRoutes.customerHome}
                    style={{
                      display: "inline-block",
                      padding: "10px 24px",
                      background: "#ea580c",
                      color: "white",
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 14,
                      textDecoration: "none",
                    }}
                  >
                    Browse Restaurants
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {orders.map((order, i) => {
                    const dotColor = STATUS_DOT[order.status] || "#9ca3af";
                    return (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                      >
                        <Link to={getCustomerOrderRoute(order._id)} className="order-row">
                          {/* Restaurant image / placeholder */}
                          <div style={{
                            width: 44, height: 44,
                            borderRadius: 10,
                            background: "#fff3ed",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, flexShrink: 0,
                            overflow: "hidden",
                          }}>
                            {order.restaurant?.imageUrl
                              ? <img src={order.restaurant.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span>{(order.restaurant?.name || "R")[0]}</span>
                            }
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {order.restaurant?.name || "Restaurant"}
                            </p>
                            <p style={{ fontSize: 12, color: "#9ca3af" }}>
                              {order.totalItems || "?"} items · {formatDateTime(order.createdAt)}
                            </p>
                          </div>

                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>
                              {formatCurrency(order.grandTotal)}
                            </p>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: dotColor,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
                              {order.status?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfile;
