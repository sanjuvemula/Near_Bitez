import { motion } from "framer-motion";
import { Panel, EmptyState, VendorButton } from "./VendorUi.jsx";

const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={`text-xl ${i <= rating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-white/10"}`}>
        ★
      </span>
    );
  }
  return <div className="flex gap-1">{stars}</div>;
};

// Component strictly depends on REAL props passed from useVendorDashboard
const VendorReviewsTab = ({ restaurant, reviews = [], onRefresh, refreshing }) => {
  if (!restaurant) return <EmptyState title="Store Not Ready" description="Please complete your store profile to access reviews." tone="info" />;

  // Calculate Real Stats from the passed array
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / totalReviews).toFixed(1) 
    : "0.0";

  // Calculate Rating Distribution (5 stars, 4 stars, etc.)
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.floor(Number(r.rating) || 0);
    if (star >= 1 && star <= 5) distribution[star]++;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Recent";
    return new Date(dateString).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[350px,1fr]">
      
      {/* ─── LEFT: RATING SUMMARY & STATS ──────────────────────── */}
      <div className="space-y-6">
        <Panel tone="dark" className="p-8 text-center flex flex-col items-center border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Overall Rating</p>
          <div className="flex items-end gap-2 mb-2">
            <h2 className="text-6xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">{averageRating}</h2>
            <span className="text-2xl font-bold text-muted mb-1">/5</span>
          </div>
          <StarRating rating={Math.round(averageRating)} />
          <p className="text-sm font-bold text-muted mt-4">Based on <span className="text-heading">{totalReviews}</span> real reviews</p>
        </Panel>

        <Panel tone="dark" className="p-6 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-4">Rating Distribution</p>
          {[5, 4, 3, 2, 1].map(star => {
            const count = distribution[star];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted w-8 flex items-center gap-1">{star} <span className="text-amber-500 text-xs">★</span></span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${percentage}%` }} 
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${star >= 4 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : star === 3 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]'}`}
                  />
                </div>
                <span className="text-xs font-bold text-heading w-6 text-right">{count}</span>
              </div>
            );
          })}
        </Panel>

        <VendorButton tone="secondary" className="w-full" loading={refreshing} onClick={onRefresh}>
          Refresh Reviews
        </VendorButton>
      </div>

      {/* ─── RIGHT: REAL REVIEWS FEED ──────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
          <h2 className="text-xl font-black text-heading">Customer Feedback</h2>
          <span className="text-xs font-bold text-muted bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Showing Latest</span>
        </div>

        {reviews.length === 0 ? (
          <EmptyState 
            title="No Reviews Yet" 
            description="Your database is completely empty. Serve some delicious food, and customer feedback will automatically appear here." 
            tone="warning" 
          />
        ) : (
          <div className="grid gap-5">
            {reviews.map((review, i) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                key={review._id || i}
              >
                <Panel tone="dark" className="p-6 border-l-4 border-l-amber-500 hover:border-amber-500/50 hover:bg-card/[0.02] transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-lg font-black text-black shadow-lg">
                        {(review.customer?.name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-heading">{review.customer?.name || "Unknown Customer"}</h3>
                        <p className="text-xs font-bold text-muted mt-0.5">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <StarRating rating={Number(review.rating) || 0} />
                      {review.orderId && (
                        <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded mt-2 border border-indigo-500/20">
                          Order: #{review.orderId.slice(-6)}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-body leading-relaxed italic border-l-2 border-white/10 pl-4">
                    "{review.comment || "No written feedback provided."}"
                  </p>
                  
                </Panel>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default VendorReviewsTab;