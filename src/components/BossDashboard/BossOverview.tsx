import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Building2, 
  Smartphone, 
  Shirt, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  DollarSign,
  CloudCheck,
  RefreshCw
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { BranchType } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';

interface BossOverviewProps {
  onSelectBranch: (type: BranchType) => void;
  onOpenSyncModal: () => void;
}

export const BossOverview: React.FC<BossOverviewProps> = ({ onSelectBranch, onOpenSyncModal }) => {
  const branches = useLiveQuery(async () => db.branches.toArray(), []);
  const sales = useLiveQuery(async () => db.sales.toArray(), []);
  const repairs = useLiveQuery(async () => db.repairs.toArray(), []);
  const laundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const wakalaTransactions = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);
  const products = useLiveQuery(async () => db.products.toArray(), []);

  // 1. Phone Shop Metrics
  const phoneSalesTotal = sales?.reduce((s, sale) => s + sale.finalAmount, 0) || 0;
  const activeRepairsCount = repairs?.filter(r => r.status !== 'delivered').length || 0;
  const lowStockCount = products?.filter(p => p.stock <= p.minStock).length || 0;

  // 2. Laundry Metrics
  const laundryRevenue = laundryOrders?.reduce((s, o) => s + o.deposit, 0) || 0;
  const laundryDebt = laundryOrders?.reduce((s, o) => s + o.balanceDue, 0) || 0;
  const laundryReadyCount = laundryOrders?.filter(o => o.stage === 'ready').length || 0;

  // 3. Wakala Metrics
  const wakalaCommissions = wakalaTransactions?.reduce((s, tx) => s + tx.commission, 0) || 0;
  const wakalaVolume = wakalaTransactions?.reduce((s, tx) => s + tx.amount, 0) || 0;

  // Total Business Revenue
  const totalCombinedRevenue = phoneSalesTotal + laundryRevenue + wakalaCommissions;

  return (
    <div className="space-y-4 pb-24">
      
      {/* Master Hero Card: Total Business Performance */}
      <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 p-4 rounded-3xl space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Ripoti Kuu ya Biashara Zote Tatu</div>
              <div className="text-xs text-slate-400">Mapato Yaliyokusanywa Leo</div>
            </div>
          </div>

          <button
            onClick={onOpenSyncModal}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            title="Sawazisha"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCurrency(totalCombinedRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Duka la Simu ({formatCurrency(phoneSalesTotal)}) + Laundry ({formatCurrency(laundryRevenue)}) + Tume za Wakala ({formatCurrency(wakalaCommissions)})
          </div>
        </div>

        {/* Quick KPI grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Repairs Zilizopo</div>
            <div className="text-xs font-black text-blue-400 mt-0.5">{activeRepairsCount} simu</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Nguo Ziko Tayari</div>
            <div className="text-xs font-black text-teal-400 mt-0.5">{laundryReadyCount} orders</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Madeni Laundry</div>
            <div className="text-xs font-black text-rose-400 mt-0.5">{formatCurrency(laundryDebt)}</div>
          </div>
        </div>
      </div>

      {/* 3 Business Branch Performance Cards */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Hali ya Kila Tawi (Branches Breakdown)</span>
          <span className="text-[10px] text-slate-500">Bonyeza kuingia ndani</span>
        </div>

        {/* 1. Duka la Simu Card */}
        <div 
          onClick={() => onSelectBranch('phone')}
          className="p-3.5 bg-slate-800/90 border border-slate-700/80 hover:border-blue-500/50 rounded-2xl space-y-2.5 cursor-pointer active:scale-98 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-100">1. Duka la Simu & Vifaa</div>
                <div className="text-[10px] text-slate-400">Mwenge / Mlimani City Branch</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-xs text-blue-400">{formatCurrency(phoneSalesTotal)}</div>
              <div className="text-[9px] text-slate-400">{sales?.length || 0} mauzo ya leo</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px] text-slate-300">
            <span>Stoo: {products?.length || 0} bidhaa {lowStockCount > 0 && <b className="text-amber-400">({lowStockCount} zimebaki chache)</b>}</span>
            <div className="flex items-center gap-1 text-blue-400 font-bold text-xs">
              <span>Fungua POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 2. GGS Laundry Service Card */}
        <div 
          onClick={() => onSelectBranch('laundry')}
          className="p-3.5 bg-slate-800/90 border border-slate-700/80 hover:border-teal-500/50 rounded-2xl space-y-2.5 cursor-pointer active:scale-98 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-100">2. GGS Laundry Service</div>
                <div className="text-[10px] text-slate-400">Mahinakati Mwanza</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-xs text-teal-400">{formatCurrency(laundryRevenue)}</div>
              <div className="text-[9px] text-slate-400">{laundryOrders?.length || 0} orders</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px] text-slate-300">
            <span>Hatua: {laundryReadyCount} nguo ziko tayari kuchukuliwa</span>
            <div className="flex items-center gap-1 text-teal-400 font-bold text-xs">
              <span>Fungua Laundry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 3. Wakala Kiosk Card */}
        <div 
          onClick={() => onSelectBranch('wakala')}
          className="p-3.5 bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl space-y-2.5 cursor-pointer active:scale-98 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-100">3. M-Pesa & Wakala Kiosk</div>
                <div className="text-[10px] text-slate-400">Kinondoni Manyanya Branch</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-xs text-emerald-400">+{formatCurrency(wakalaCommissions)}</div>
              <div className="text-[9px] text-slate-400">{wakalaTransactions?.length || 0} miamala</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px] text-slate-300">
            <span>Mzunguko: {formatCurrency(wakalaVolume)}</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
              <span>Fungua Wakala</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Sync Health Status for All Branches */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hali ya Usawazishaji wa Matawi (Live Sync Status)</span>
        </div>

        <div className="space-y-2 text-xs">
          {branches?.map(b => (
            <div key={b.id} className="flex items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <div className="font-bold text-slate-200">{b.name}</div>
                <div className="text-[10px] text-slate-400">Msimamizi: {b.managerName}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Synced: {b.lastSyncedAt ? formatDate(b.lastSyncedAt) : 'Muda wote (Live)'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
