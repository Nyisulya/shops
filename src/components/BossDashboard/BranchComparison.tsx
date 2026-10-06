import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, TrendingUp, Smartphone, Shirt, Wallet, Award, ArrowUpRight } from 'lucide-react';
import { db } from '../../db/dexie';
import { formatCurrency } from '../../services/receiptService';
import { SHOPS } from '../Auth/PinLogin';

export const BranchComparison: React.FC = () => {
  const sales = useLiveQuery(async () => db.sales.toArray(), []);
  const laundry = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const wakala = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);

  // Calculate revenue for each of the 8 branches
  const branchesData = SHOPS.filter(s => s.type !== 'boss').map(shop => {
    let revenue = 0;
    let profit = 0;
    let count = 0;

    if (shop.type === 'phone') {
      const shopSales = (sales || []).filter(s => s.branchId === shop.id);
      revenue = shopSales.reduce((s, x) => s + x.finalAmount, 0);
      profit = revenue * 0.22; // estimated net margin
      count = shopSales.length;
    } else if (shop.type === 'laundry') {
      const shopLaundry = (laundry || []).filter(o => o.branchId === shop.id);
      revenue = shopLaundry.reduce((s, x) => s + x.deposit, 0);
      profit = revenue * 0.70;
      count = shopLaundry.length;
    } else if (shop.type === 'wakala') {
      const shopWakala = (wakala || []).filter(tx => tx.branchId === shop.id || tx.branchId === 'branch_wakala');
      revenue = shopWakala.reduce((s, x) => s + x.amount, 0);
      profit = shopWakala.reduce((s, x) => s + x.commission + (x.wakalaFee || 0), 0);
      count = shopWakala.length;
    }

    return {
      ...shop,
      revenue,
      profit,
      count
    };
  });

  const totalBusinessRevenue = branchesData.reduce((s, b) => s + (b.type === 'wakala' ? b.profit : b.revenue), 0) || 1;
  const sortedByPerformance = [...branchesData].sort((a, b) => (b.type === 'wakala' ? b.profit : b.revenue) - (a.type === 'wakala' ? a.profit : a.revenue));

  return (
    <div className="space-y-4 pb-28">
      
      {/* Top Header */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-md">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Ulinganisho wa Utendaji (Maduka Yote 8)</span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full">
            Ranking
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Uchambuzi wa duka lipi linaongoza kwa mapato na faida kati ya maduka yote 8.
        </p>
      </div>

      {/* Ranked Branches List */}
      <div className="space-y-2.5">
        {sortedByPerformance.map((branch, index) => {
          const Icon = branch.icon;
          const displayAmount = branch.type === 'wakala' ? branch.profit : branch.revenue;
          const pct = Math.round((displayAmount / totalBusinessRevenue) * 100);

          return (
            <div 
              key={branch.id}
              className="p-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-2 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    index === 0 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-700 text-slate-300'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
                      <span>{branch.name}</span>
                      {index === 0 && <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{branch.sub}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-100">{formatCurrency(displayAmount)}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    {branch.type === 'wakala' ? 'Tume ya leo' : `${pct}% ya mapato yote`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${Math.max(5, pct)}%` }} 
                  className={`h-full rounded-full transition-all duration-500 ${
                    branch.type === 'phone' ? 'bg-blue-500' : branch.type === 'laundry' ? 'bg-teal-500' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                <span>Shughuli: {branch.count} {branch.type === 'phone' ? 'mauzo' : branch.type === 'laundry' ? 'orders' : 'miamala'}</span>
                <span>Faida iliyokadiriwa: <b className="text-emerald-400">+{formatCurrency(branch.profit)}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
