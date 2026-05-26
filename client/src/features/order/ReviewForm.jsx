import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { api } from "../../services/api.js";

const TAGS = [
  "Fast delivery",
  "Great taste",
  "Good value",
  "Fresh food",
  "Friendly",
  "Large portion",
];

const RATING_LABELS = ["", "Poor 😕", "Fair 😐", "Good 🙂", "Great 😊", "Excellent 🤩"];

// ─── Star Button ──────────────────────────────────────────────────────────────
const StarButton = ({ value, hovered, selected, onHover, onClick }) => {
  const filled = value <= (hovered || selected);
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(value)}
      onMouseLeave={() => onHover(0)}
      onClick={() => onClick(value)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        transition: "transform 0.15s",
        transform: filled ? "scale(1.2)" : "scale(1)",
        display: "inline-flex",
      }}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill={filled ? "#f59e0b" : "none"}
        stroke={filled ? "#f59e0b" : "#d1d5db"}
        strokeWidth="1.8"
        style={{ transition: "all 0.15s" }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReviewForm = ({ orderId, restaurantName }) => {
  const [submitted, setSubmitted]           = useState(false);
  const [open, setOpen]                     = useState(false);
  const [rating, setRating]                 = useState(0);
  const [hovered, setHovered]               = useState(0);
  const [comment, setComment]               = useState("");
  const [selectedTags, setSelectedTags]     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [checking, setChecking]             = useState(true);

  // ── BUG FIX: was useState(() => {...}) — must be useEffect ──────────────────
  useEffect(() => {
    if (!orderId) return;
    setChecking(true);
    api
      .get(`/reviews/check/${orderId}`)
      .then((r) => {
        // api.js returns { success, data: { reviewed, data } }
        if (r.data?.reviewed) setAlreadyReviewed(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [orderId]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }
    setLoading(true);
    try {
      await api.post("/reviews", {
        orderId,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });
      setSubmitted(true);
      setOpen(false);
      toast.success("Thanks for your review! 🌟");
    } catch (err) {
      if (err.status === 409) {
        setAlreadyReviewed(true);
        setOpen(false);
        toast("You've already reviewed this order", { icon: "ℹ️" });
      } else {
        toast.error(err.message || "Could not submit review");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Already reviewed / submitted ──────────────────────────────────────────
  if (alreadyReviewed || submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
          border: "1.5px solid #fde68a",
          borderRadius: 20,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 32 }}>⭐</span>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#92400e", margin: 0 }}>
            {submitted ? "Review submitted!" : "Already reviewed"}
          </p>
          <p style={{ fontSize: 13, color: "#b45309", marginTop: 2 }}>
            Thank you for rating {restaurantName}
          </p>
        </div>
      </motion.div>
    );
  }

  if (checking) return null;

  return (
    <>
      <style>{`
        .rv-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .rv-modal {
          background: #fff;
          border-radius: 24px;
          padding: 28px;
          width: 100%;
          max-width: 460px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          position: relative;
        }
        .rv-modal::-webkit-scrollbar { width: 0; }
        @media (max-width: 480px) {
          .rv-modal { padding: 20px; border-radius: 20px; }
        }
      `}</style>

      {/* ── Trigger card ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#fff",
          border: "1.5px solid #f3f4f6",
          borderRadius: 20,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg,#fef3c7,#fde68a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            ⭐
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>
              How was your order?
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              Rate your experience at {restaurantName}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "10px 24px",
            background: "#ea580c",
            color: "#fff",
            border: "none",
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(234,88,12,0.3)",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#c2410c";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ea580c";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Write a review
        </button>
      </motion.div>

      {/* ── Modal via Portal-style overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="rv-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              className="rv-modal"
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 24 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ea580c", marginBottom: 4 }}>
                    Rate your experience
                  </p>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
                    {restaurantName}
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#f3f4f6", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#6b7280", flexShrink: 0, transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#e5e7eb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#f3f4f6"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stars */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <StarButton
                      key={v}
                      value={v}
                      hovered={hovered}
                      selected={rating}
                      onHover={setHovered}
                      onClick={setRating}
                    />
                  ))}
                </div>
                <p style={{
                  fontSize: 15, fontWeight: 700,
                  color: rating ? "#ea580c" : "#d1d5db",
                  minHeight: 22, transition: "color 0.15s",
                }}>
                  {RATING_LABELS[hovered || rating] || "Tap to rate"}
                </p>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 10 }}>
                  What did you like? (optional)
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: "6px 14px", borderRadius: 100,
                          fontSize: 12, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "all 0.15s",
                          border: active ? "1.5px solid #ea580c" : "1.5px solid #e5e7eb",
                          background: active ? "#fff7ed" : "#f9fafb",
                          color: active ? "#ea580c" : "#6b7280",
                        }}
                      >
                        {active ? "✓ " : ""}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>
                  Your review (optional)
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Tell others about your experience..."
                  style={{
                    width: "100%", padding: "12px 14px",
                    background: "#f9fafb", border: "1.5px solid #f0f0f0",
                    borderRadius: 12, fontSize: 14, fontWeight: 500,
                    color: "#111827", outline: "none", resize: "none",
                    fontFamily: "inherit", lineHeight: 1.6,
                    boxSizing: "border-box", transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#ea580c"}
                  onBlur={(e) => e.target.style.borderColor = "#f0f0f0"}
                />
                <p style={{ fontSize: 11, color: "#d1d5db", textAlign: "right", marginTop: 4 }}>
                  {comment.length}/500
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!rating || loading}
                style={{
                  width: "100%", padding: "14px",
                  background: !rating || loading ? "#f3f4f6" : "linear-gradient(135deg,#ea580c,#c2410c)",
                  color: !rating || loading ? "#9ca3af" : "#fff",
                  border: "none", borderRadius: 14,
                  fontSize: 15, fontWeight: 800,
                  cursor: !rating || loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", letterSpacing: "-0.01em",
                  transition: "all 0.15s",
                  boxShadow: rating && !loading ? "0 4px 16px rgba(234,88,12,0.3)" : "none",
                }}
              >
                {loading ? "Submitting..." : "Submit Review ✨"}
              </button>

              <p style={{ textAlign: "center", fontSize: 11, color: "#e5e7eb", marginTop: 12 }}>
                Your review helps others make better choices
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReviewForm;