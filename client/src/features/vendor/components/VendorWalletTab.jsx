import { motion } from "framer-motion";
import { Panel, EmptyState, VendorButton } from "./VendorUi.jsx";
import { formatCurrency } from "../../../utils/formatters.js";

const VendorWalletTab = ({ restaurant, wallet, requestPayout, requestingPayout, onRefresh }) => {
  if (!restaurant) return <EmptyState title="Store Not Ready" description="Please complete your store profile to access financials." tone="info" />;

  const { balance = 0, totalEarnings = 0, pendingSettlement = 0, history = [] } = wallet || {};

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
      <div className="space-y-6">
        <Panel tone="dark" className="p-8 border-emerald-500/20 bg-gradient-to-br from-[#0a0a0a] to-emerald-950/10 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Available for Withdrawal</p>
              <h2 className="text-6xl font-black text-white drop-shadow-md">{formatCurrency(balance)}</h2>
              <p className="text-sm font-bold text-slate-400 mt-4">Lifetime Earnings: <span className="text-white">{formatCurrency(totalEarnings)}</span></p>
            </div>
            <div className="text-right">
               <VendorButton 
                 tone="success" 
                 className="!px-8 !py-4 shadow-xl"
                 loading={requestingPayout}
                 onClick={() => {
                   if(balance < 500) alert("Minimum withdrawal is ₹500");
                   else if(window.confirm(`Withdraw ${formatCurrency(balance)} to bank?`)) requestPayout(balance);
                 }}
               >
                 Transfer to Bank
               </VendorButton>
               <p className="text-[10px] font-bold text-slate-500 mt-3">Usually settled in 2-4 hours</p>
            </div>
          </div>
        </Panel>

        <Panel tone="dark" className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-white">Recent Transactions</h3>
            <button onClick={onRefresh} className="text-xs font-bold text-zinc-500 hover:text-white">Refresh</button>
          </div>
          
          {history.length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-bold">No recent transactions.</div>
          ) : (
            <div className="space-y-4">
              {history.map((txn, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${txn.type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {txn.type === 'CREDIT' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="font-bold text-white">{txn.description || "Order Settlement"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(txn.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-black text-lg ${txn.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel tone="dark" className="p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-4">Pending Settlement</h3>
          <p className="text-4xl font-black text-white mb-2">{formatCurrency(pendingSettlement)}</p>
          <p className="text-xs text-slate-400 leading-relaxed">This amount is currently in clearing and will be added to your available balance within 24 hours.</p>
        </Panel>
        <Panel tone="dark" className="p-6">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Bank Details</h3>
           <div className="bg-[#111] p-4 rounded-xl border border-white/5">
             <p className="text-xs text-slate-500 mb-1">Account Number</p>
             <p className="font-bold text-white tracking-widest">XXXX XXXX 4921</p>
             <p className="text-xs text-slate-500 mt-3 mb-1">Bank Name</p>
             <p className="font-bold text-white">HDFC Bank (Ludhiana Branch)</p>
           </div>
           <VendorButton tone="secondary" className="w-full mt-4">Update Bank Details</VendorButton>
        </Panel>
      </div>
    </div>
  );
};
export default VendorWalletTab;
