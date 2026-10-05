import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, TrendingUp, Smartphone, Shirt, Wallet } from 'lucide-react';
import { db } from '../../db/dexie';
import { formatCurrency } from '../../services/receiptService';

export const BranchComparison: React.FC = () => {
  const sales = useLiveQuery(async () => db.sales.toArray(), []);
  const laundry = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const wakala = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);

  const phoneTotal = sales?.reduce((s, x) => s + x.finalAmount, 0) || 0;
  const laundryTotal = laundry?.reduce((s, x) => s + x.totalAmount, 0) || 0;
  const wakalaCommission = wakala?.reduce((s, x) => s + x.commission, 0) || 0;

  const total = phoneTotal + laundryTotal + wakalaCommission || 1;

  const phonePct = Math.round((phoneTotal / total) * 100);
  const laundryPct = Math.round((laundryTotal / total) * 100);
  const wakalaPct = Math.round((wakalaCommission / total) * 100);

  return (
    <div className="space-y-4 pb-24">
      
      {/* Visual Percentage Bar */}
      <div className="p-4 bg-slate-800/90 border border-slate-700/80 rounded-3xl space-y-3 shadow-md">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>Mchango wa Kila Tawi Kwenye Mapato (% Share)</span>
        </div>

        {/* Multi-color Progress Bar */}
        <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
          <div style={{ width: `${phonePct}%` }} className="h-full bg-blue-500 transition-all duration-500" title={`Duka la Simu: ${phonePct}%`} />
          <div style={{ width: `${laundryPct}%` }} className="h-full bg-teal-500 transition-all duration-500" title={`Laundry: ${laundryPct}%`} />
          <div style={{ width: `${wakalaPct}%` }} className="h-full bg-emerald-500 transition-all duration-500" title={`Wakala: ${wakalaPct}%`} />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <span className="text-slate-300">Simu ({phonePct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 shrink-0" />
            <span className="text-slate-300">Laundry ({laundryPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-300">Wakala ({wakalaPct}%)</span>
          </div>
        </div>
      </div>

      {/* Comparison Detail Cards */}
      <div className="space-y-2">
        <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">Duka la Simu & Vifaa</div>
              <div className="text-[10px] text-slate-400">{sales?.length || 0} mauzo yaliyofanyika</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-blue-400">{formatCurrency(phoneTotal)}</div>
            <div className="text-[10px] text-slate-400">{phonePct}% ya jumla</div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">GGS Laundry Service</div>
              <div className="text-[10px] text-slate-400">{laundry?.length || 0} maagizo ya wateja</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-teal-400">{formatCurrency(laundryTotal)}</div>
            <div className="text-[10px] text-slate-400">{laundryPct}% ya jumla</div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">M-Pesa & Wakala Kiosk</div>
              <div className="text-[10px] text-slate-400">{wakala?.length || 0} miamala ya leo</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-emerald-400">+{formatCurrency(wakalaCommission)}</div>
            <div className="text-[10px] text-slate-400">{wakalaPct}% ya jumla</div>
          </div>
        </div>
      </div>
    </div>
  );
};
