import { formatCurrency } from "../../../utils/formatters.js";
import { EmptyState, Panel } from "./VendorUi.jsx";

const VendorAnalyticsTab = ({ overview, restaurant }) => {
  if (!restaurant) return <EmptyState title="Analytics Locked" description="Set up your store to unlock insights." tone="info" />;

  const stats = overview?.stats || {};
  const trend = overview?.salesTrend || [];
  const maxOrders = Math.max(1, ...trend.map(e => Number(e.orders || 0)));

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.deliveredRevenue || 0), color: "text-emerald-400", tone: "positive" },
          { label: "Completed Orders", value: stats.completedOrders || 0, color: "text-blue-400", tone: "info" },
          { label: "Acceptance Rate", value: `${stats.acceptanceRate || 0}%`, color: "text-amber-400", tone: "urgent" },
          { label: "Rejected Orders", value: stats.rejectedOrders || 0, color: "text-rose-400", tone: "dark" },
        ].map((s, i) => (
          <Panel key={i} tone={s.tone} className="p-8">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`mt-3 text-4xl font-black ${s.color}`}>{s.value}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Panel tone="dark" className="lg:col-span-2 p-8">
          <h3 className="text-xl font-black text-white mb-8 border-b border-white/10 pb-4">Last 7 Days Trend</h3>
          {trend.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-500 font-bold text-lg border-2 border-dashed border-white/10 rounded-2xl">No sales data yet</div>
          ) : (
            <div className="flex items-end justify-between h-72 gap-3 pt-10">
              {trend.map(entry => {
                const heightPct = Math.max(10, (Number(entry.orders || 0) / maxOrders) * 100);
                return (
                  <div key={entry.date} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111] rounded-xl p-3 text-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-white/10 z-10 pointer-events-none min-w-[80px]">
                       <p className="text-sm font-black text-amber-500">{entry.orders} orders</p>
                       <p className="text-[11px] font-bold text-white mt-1">{formatCurrency(entry.revenue)}</p>
                    </div>
                    <div 
                      className="w-full max-w-[48px] rounded-t-2xl bg-gradient-to-t from-amber-600/20 to-amber-400 transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
                      style={{ height: `${heightPct}%` }}
                    />
                    <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">{entry.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel tone="dark" className="p-8">
          <h3 className="text-xl font-black text-white mb-8 border-b border-white/10 pb-4">Menu Coverage</h3>
          <div className="flex h-64 items-center justify-center">
            <div className="relative h-56 w-56 rounded-full border-[12px] border-white/5 flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] bg-[#0a0a0a]">
               <div className="text-center z-10">
                 <p className="text-5xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">{stats.activeMenuItems || 0}</p>
                 <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">Active Items</p>
               </div>
               <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
                  <circle cx="50%" cy="50%" r="46%" className="stroke-emerald-500 fill-transparent" strokeWidth="8%" strokeDasharray="300" strokeDashoffset={300 - (300 * (stats.activeMenuItems || 0) / Math.max(1, stats.totalMenuItems || 1))} strokeLinecap="round" />
               </svg>
            </div>
          </div>
          <p className="text-center text-sm font-black text-slate-500 mt-6 bg-white/5 p-3 rounded-xl border border-white/5">Out of <span className="text-white">{stats.totalMenuItems || 0}</span> total created items</p>
        </Panel>
      </div>
    </div>
  );
};

export default VendorAnalyticsTab;