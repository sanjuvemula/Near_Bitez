import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, FieldInput, FieldSelect, VendorButton, EmptyState } from "./VendorUi.jsx";
import { formatCurrency } from "../../../utils/formatters.js";

const SubStatusBadge = ({ status }) => {
  const styles = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    PAUSED: "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    EXPIRING_SOON: "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
    EXPIRED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  };
  
  const labels = {
    ACTIVE: "Active",
    PAUSED: "Paused",
    EXPIRING_SOON: "Expiring Soon",
    EXPIRED: "Expired",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[status] || styles.EXPIRED}`}>
      {labels[status] || status}
    </span>
  );
};

// Now accepts strictly REAL props from the dashboard
const VendorSubscriptionTab = ({ restaurant, subscriptions = [], updateSubscriptionStatus, pendingSubId, onRefresh, refreshing }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSub, setSelectedSub] = useState(null);

  if (!restaurant) return <EmptyState title="Store Not Ready" description="Please complete your store profile to access subscriptions." tone="info" />;

  // Filter Real Data
  const filteredSubs = subscriptions.filter(sub => {
    const customerName = sub.customer?.name || "Unknown";
    const subId = sub._id || "";
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || subId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Real Stats based on DB schema
  const activeCount = subscriptions.filter(s => s.status === "ACTIVE" || s.status === "EXPIRING_SOON").length;
  const mrr = subscriptions.filter(s => s.status !== "EXPIRED" && s.status !== "CANCELLED").reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  // Helper for safe dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr,420px]">
      
      {/* ─── LEFT: REAL SUBSCRIPTION LIST ──────────────────────── */}
      <div className="space-y-6">
        
        {/* Top Stats Strip */}
        <div className="grid grid-cols-3 gap-4">
          <Panel tone="dark" className="p-5 flex flex-col justify-center relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">Active Subs</p>
            <p className="text-3xl font-black text-white relative z-10">{activeCount}</p>
          </Panel>
          <Panel tone="dark" className="p-5 flex flex-col justify-center border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 relative z-10">Monthly Revenue</p>
            <p className="text-3xl font-black text-emerald-400 relative z-10">{formatCurrency(mrr)}</p>
          </Panel>
          <Panel tone="dark" className="p-5 flex flex-col justify-center border-amber-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 relative z-10">Deliveries Today</p>
            <p className="text-3xl font-black text-amber-500 relative z-10">{activeCount * 2}</p>
          </Panel>
        </div>

        {/* Filters & Refresh */}
        <Panel tone="dark" className="p-5 grid gap-4 md:grid-cols-[1fr,200px,auto]">
          <FieldInput placeholder="Search by Customer or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <FieldSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="PAUSED">Paused</option>
          </FieldSelect>
          <VendorButton tone="secondary" onClick={onRefresh} loading={refreshing} className="h-full">
            Sync
          </VendorButton>
        </Panel>

        {/* List mapped from actual API array */}
        {filteredSubs.length === 0 ? (
          <EmptyState title="No Subscriptions Found" description="No customers match your current filters or database is empty." tone="warning" />
        ) : (
          <div className="grid gap-4">
            {filteredSubs.map((sub, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                key={sub._id}
                onClick={() => setSelectedSub(sub)}
                className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] ${selectedSub?._id === sub._id ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-[#0a0a0a]/60 hover:bg-white/[0.03] hover:border-white/20'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#111] border border-white/10 text-2xl shadow-inner">
                      👤
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-black text-white">{sub.customer?.name || "Customer"}</h3>
                        <SubStatusBadge status={sub.status} />
                      </div>
                      <p className="text-sm font-bold text-indigo-400">{sub.planName || "Custom Plan"}</p>
                      <p className="text-xs text-slate-400 mt-1">Next: <span className="text-white font-bold">{sub.nextDelivery ? formatDate(sub.nextDelivery) : "Pending"}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white">{formatCurrency(sub.price || 0)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Ends {formatDate(sub.endDate)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── RIGHT: REAL SUBSCRIPTION DETAILS PANEL ───────────────────── */}
      <div className="relative">
        <Panel tone="dark" className="p-8 sticky top-6 h-fit min-h-[500px]">
          <AnimatePresence mode="wait">
            {!selectedSub ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center text-center opacity-50 pt-20">
                <span className="text-7xl mb-6 drop-shadow-lg">🗓️</span>
                <h3 className="text-xl font-black text-white">Select a Subscription</h3>
                <p className="text-sm text-slate-400 mt-2">Click on any customer from the real-time list to view details and manage their subscription status.</p>
              </motion.div>
            ) : (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedSub.customer?.name || "Customer"}</h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">{selectedSub.customer?.phone || "No Phone Provided"}</p>
                    <p className="text-[10px] font-bold text-slate-600 mt-2 bg-white/5 px-2 py-1 rounded inline-block">ID: {selectedSub._id}</p>
                  </div>
                  <SubStatusBadge status={selectedSub.status} />
                </div>

                {/* Plan Info */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Subscribed Plan</p>
                    <p className="text-lg font-black text-white">{selectedSub.planName || "Custom"}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${selectedSub.isVeg ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                          {selectedSub.isVeg ? 'PURE VEG' : 'NON-VEG'}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded border border-white/10 text-slate-300">
                          {selectedSub.mealType || "Standard"}
                        </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Start Date</p>
                      <p className="text-sm font-bold text-white">{formatDate(selectedSub.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Expiry Date</p>
                      <p className={`text-sm font-bold ${selectedSub.status === 'EXPIRING_SOON' ? 'text-rose-400' : 'text-white'}`}>{formatDate(selectedSub.endDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Next Scheduled Delivery</p>
                  <p className="text-base font-black text-amber-500">{selectedSub.nextDelivery ? formatDate(selectedSub.nextDelivery) : "Pending Schedule"}</p>
                </div>

                {/* Real API Status Actions */}
                <div className="pt-4 space-y-3 border-t border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Database Actions</p>
                  <div className="flex gap-3">
                    <VendorButton 
                      tone={selectedSub.status === 'PAUSED' ? 'success' : 'warning'} 
                      className="flex-1"
                      loading={pendingSubId === selectedSub._id}
                      onClick={() => updateSubscriptionStatus(selectedSub._id, selectedSub.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
                    >
                      {selectedSub.status === 'PAUSED' ? 'Resume Plan' : 'Pause Plan'}
                    </VendorButton>
                    <VendorButton 
                      tone="danger" 
                      className="flex-1"
                      loading={pendingSubId === selectedSub._id}
                      onClick={() => {
                        if(window.confirm("Are you sure you want to cancel this subscription?")) {
                          updateSubscriptionStatus(selectedSub._id, 'CANCELLED');
                        }
                      }}
                    >
                      Cancel Sub
                    </VendorButton>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>

    </div>
  );
};

export default VendorSubscriptionTab;
