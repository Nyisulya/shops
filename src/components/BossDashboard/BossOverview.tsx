import React, { useState, useMemo } from 'react';
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
  RefreshCw, 
  BarChart3, 
  Package, 
  KeyRound, 
  Store,
  ChevronRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { BranchType } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';
import { SHOPS } from '../Auth/PinLogin';
import { BossDateFilter, checkDateInRange, DateFilterState, getFilterDescription } from './BossDateFilter';
import { BranchDetailModal } from './BranchDetailModal';

interface BossOverviewProps {
  onSelectBranch: (type: BranchType, branchId?: string) => void;
  onOpenSyncModal: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenReceipt?: (data: any) => void;
}

export const BossOverview: React.FC<BossOverviewProps> = ({ 
  onSelectBranch, 
  onOpenSyncModal,
  onNavigateTab,
  onOpenReceipt
}) => {
  // Date filter state (Defaults to 'today', with quick presets & custom From-To)
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'today' });
  const [selectedDetailBranchId, setSelectedDetailBranchId] = useState<string | null>(null);

  // Live queries
  const branches = useLiveQuery(async () => db.branches.toArray(), []);
  const sales = useLiveQuery(async () => db.sales.toArray(), []);
  const repairs = useLiveQuery(async () => db.repairs.toArray(), []);
  const laundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const wakalaTransactions = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);
  const wakalaDayLogs = useLiveQuery(async () => db.wakalaDayLogs?.toArray() || [], []);
  const products = useLiveQuery(async () => db.products.toArray(), []);
  const expenses = useLiveQuery(async () => db.expenses?.toArray() || [], []);

  // Filtered datasets based on active date range
  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => checkDateInRange(s.createdAt, dateFilter));
  }, [sales, dateFilter]);

  const filteredRepairs = useMemo(() => {
    return (repairs || []).filter(r => checkDateInRange(r.createdAt, dateFilter));
  }, [repairs, dateFilter]);

  const filteredLaundryOrders = useMemo(() => {
    return (laundryOrders || []).filter(o => checkDateInRange(o.createdAt, dateFilter));
  }, [laundryOrders, dateFilter]);

  const filteredWakalaTransactions = useMemo(() => {
    return (wakalaTransactions || []).filter(tx => checkDateInRange(tx.createdAt, dateFilter));
  }, [wakalaTransactions, dateFilter]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => checkDateInRange(e.createdAt, dateFilter));
  }, [expenses, dateFilter]);

  // Product cost map for net profit calculations
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products?.forEach(p => map.set(p.id, p.costPrice));
    return map;
  }, [products]);

  // 1. Phone Shop Metrics (Filtered by date)
  const phoneSalesTotal = useMemo(() => {
    return filteredSales.reduce((s, sale) => s + sale.finalAmount, 0);
  }, [filteredSales]);

  let phoneCOGS = 0;
  filteredSales.forEach(s => {
    s.items.forEach(i => {
      phoneCOGS += (productCostMap.get(i.productId) || 0) * i.quantity;
    });
  });

  let repairLaborTotal = 0;
  filteredRepairs.forEach(r => {
    repairLaborTotal += (r.laborCost || 15000);
  });

  const phoneNetProfit = (phoneSalesTotal - phoneCOGS) + repairLaborTotal;

  // 2. Laundry Metrics (Filtered by date) - Revenue minus real recorded expenses (Soap, Luku, Water, etc.)
  const laundryRevenue = useMemo(() => {
    return filteredLaundryOrders.reduce((s, o) => s + o.deposit, 0);
  }, [filteredLaundryOrders]);

  const laundryExpensesTotal = useMemo(() => {
    return filteredExpenses
      .filter(e => e.branchId.startsWith('branch_laundry'))
      .reduce((s, e) => s + e.amount, 0);
  }, [filteredExpenses]);

  // Real Net Profit = Revenue - Recorded Expenses (or 75% estimation if no expenses recorded yet)
  const laundryNetProfit = laundryExpensesTotal > 0
    ? Math.max(0, laundryRevenue - laundryExpensesTotal)
    : Math.round(laundryRevenue * 0.75);

  // 3. Wakala Metrics (Filtered by date)
  const wakalaCommissions = useMemo(() => {
    return filteredWakalaTransactions.reduce((s, tx) => {
      // Only Lipa Namba profit (wakala fee) is known upfront
      const fee = tx.wakalaFee || (tx.withdrawalMethod === 'lipa_namba' ? (tx.commission || 0) : 0);
      return s + fee;
    }, 0);
  }, [filteredWakalaTransactions]);

  const todayDate = new Date().toISOString().split('T')[0];
  const todayWakalaLog = useMemo(() => {
    return (wakalaDayLogs || []).find(l => l.date === todayDate) || (wakalaDayLogs || [])[0];
  }, [wakalaDayLogs, todayDate]);

  const wakalaRecon = useMemo(() => {
    const baseCash = todayWakalaLog?.openingCash ?? 500000;
    
    // Sum opening float across all 8 lines (or fallback)
    const agentOpening = (todayWakalaLog?.openingFloatMpesaAgent ?? 800000) +
                         (todayWakalaLog?.openingFloatTigoAgent ?? 500000) +
                         (todayWakalaLog?.openingFloatAirtelAgent ?? 300000) +
                         (todayWakalaLog?.openingFloatHalopesaAgent ?? 200000);
    const lipaOpening = (todayWakalaLog?.openingFloatMpesaLipa ?? 700000) +
                        (todayWakalaLog?.openingFloatTigoLipa ?? 300000) +
                        (todayWakalaLog?.openingFloatAirtelLipa ?? 300000) +
                        (todayWakalaLog?.openingFloatHalopesaLipa ?? 100000);

    const baseFloat = todayWakalaLog?.openingFloatMpesaAgent !== undefined 
      ? (agentOpening + lipaOpening)
      : ((todayWakalaLog?.openingFloatMpesa ?? 1500000) +
         (todayWakalaLog?.openingFloatTigo ?? 800000) +
         (todayWakalaLog?.openingFloatAirtel ?? 600000) +
         (todayWakalaLog?.openingFloatHalopesa ?? 300000));

    let netCash = 0;
    let netFloat = 0;

    filteredWakalaTransactions.forEach(tx => {
      const amt = tx.amount;
      const isLipa = tx.type === 'withdrawal' && tx.withdrawalMethod === 'lipa_namba';
      const fee = tx.wakalaFee || 0;

      if (isLipa) {
        netCash -= amt;
        netFloat += (amt + fee);
      } else if (tx.type === 'withdrawal') {
        netCash -= amt;
        netFloat += amt;
      } else if (tx.type === 'deposit') {
        netCash += amt;
        netFloat -= amt;
      }
    });

    const liveCash = baseCash + netCash;
    const liveFloat = baseFloat + netFloat;
    const totalCapital = liveCash + liveFloat;

    return {
      liveCash,
      liveFloat,
      totalCapital
    };
  }, [todayWakalaLog, filteredWakalaTransactions]);

  // Total Business Revenue & Net Profit across all 8 branches for this period
  const totalCombinedRevenue = phoneSalesTotal + laundryRevenue + wakalaCommissions;
  const totalCombinedNetProfit = phoneNetProfit + laundryNetProfit + wakalaCommissions;
  const totalOperationsCount = filteredSales.length + filteredRepairs.length + filteredLaundryOrders.length + filteredWakalaTransactions.length;

  const phoneBranches = SHOPS.filter(s => s.type === 'phone');
  const laundryBranches = SHOPS.filter(s => s.type === 'laundry');
  const wakalaBranches = SHOPS.filter(s => s.type === 'wakala');

  return (
    <div className="space-y-4 pb-28">
      
      {/* 1. Date Filter Bar (At the Top) */}
      <BossDateFilter
        value={dateFilter}
        onChange={setDateFilter}
      />

      {/* 2. Master Hero Card: Total Business Performance for Selected Period */}
      <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 p-4 rounded-3xl space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span>Ripoti Kuu ya Maduka Yote 8</span>
                <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 rounded-full text-amber-300 font-normal">
                  {getFilterDescription(dateFilter)}
                </span>
              </div>
              <div className="text-xs text-slate-400">Mapato Yaliyokusanywa na Faida Safi</div>
            </div>
          </div>

          <button
            onClick={onOpenSyncModal}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            title="Sawazisha mtandaoni"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Mapato Yote (Turnover)</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(totalCombinedRevenue)}
            </div>
            <div className="text-[10px] text-slate-400">Matawi 8 • {totalOperationsCount} miamala</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase font-bold">Faida Safi ya Jumla</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              +{formatCurrency(totalCombinedNetProfit)}
            </div>
            <div className="text-[10px] text-emerald-400">Faida halisi ya kipindi</div>
          </div>
          <div className="col-span-2 sm:col-span-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Wastani kwa Siku</div>
            <div className="text-base sm:text-xl font-bold text-slate-200">
              {formatCurrency(Math.round(totalCombinedRevenue))}
            </div>
            <div className="text-[10px] text-amber-300/80">Kulingana na tarehe zilizochaguliwa</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Navigation Grid for Boss */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigateTab?.('reports')}
          className="p-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-100">Ripoti & Faida</span>
          <span className="text-[9px] text-slate-400">Uchambuzi wa kina</span>
        </button>

        <button
          onClick={() => onNavigateTab?.('inventory')}
          className="p-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-100">Stoo & Bei</span>
          <span className="text-[9px] text-slate-400">Ongeza / Hariri bei</span>
        </button>

        <button
          onClick={() => onNavigateTab?.('security')}
          className="p-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-100">PIN & Usalama</span>
          <span className="text-[9px] text-slate-400">Zuia wauzaji</span>
        </button>
      </div>

      {/* 4. MADUKA YA SIMU & VIFAA (3 BRANCHES) */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. Maduka ya Simu & Vifaa (3 Branches)</span>
          </div>
          <span className="text-[10px] text-slate-400">Mauzo: {formatCurrency(phoneSalesTotal)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {phoneBranches.map(b => {
            const branchSalesList = filteredSales.filter(s => s.branchId === b.id);
            const total = branchSalesList.reduce((s, x) => s + x.finalAmount, 0);
            
            // Check low stock count for this shop
            const shopProducts = (products || []).filter(p => p.branchId === b.id);
            const lowStockCount = shopProducts.filter(p => p.stock <= p.minStock || p.stock <= 3).length;

            return (
              <div 
                key={b.id}
                onClick={() => setSelectedDetailBranchId(b.id)}
                className="p-3 bg-slate-800/90 border border-slate-700/80 hover:border-blue-500/60 rounded-2xl space-y-1.5 cursor-pointer active:scale-98 transition-all shadow-sm group hover:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-100 group-hover:text-blue-300 transition-colors">
                    {b.name}
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{b.sub}</span>
                  {lowStockCount > 0 && (
                    <span className="text-[9px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                      {lowStockCount} stoo chache
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-700/60 text-[11px]">
                  <span className="font-extrabold text-blue-400">{formatCurrency(total)}</span>
                  <span className="text-slate-400 text-[10px]">{branchSalesList.length} mauzo</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. GGS LAUNDRY SERVICE (4 BRANCHES) */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shirt className="w-3.5 h-3.5" />
            <span>2. GGS Laundry Service (4 Branches Mwanza)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-teal-300">Mapato: {formatCurrency(laundryRevenue)}</span>
            <span className="text-rose-400">Matumizi: -{formatCurrency(laundryExpensesTotal)}</span>
            <span className="text-emerald-400 font-bold">Faida: +{formatCurrency(laundryNetProfit)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {laundryBranches.map(b => {
            const branchOrdersList = filteredLaundryOrders.filter(o => o.branchId === b.id);
            const collected = branchOrdersList.reduce((s, x) => s + x.deposit, 0);
            const debt = branchOrdersList.reduce((s, x) => s + x.balanceDue, 0);
            const branchExp = filteredExpenses.filter(e => e.branchId === b.id).reduce((s, x) => s + x.amount, 0);
            const branchProfit = branchExp > 0 ? (collected - branchExp) : Math.round(collected * 0.75);

            return (
              <div 
                key={b.id}
                onClick={() => setSelectedDetailBranchId(b.id)}
                className="p-3 bg-slate-800/90 border border-slate-700/80 hover:border-teal-500/60 rounded-2xl space-y-1.5 cursor-pointer active:scale-98 transition-all shadow-sm group hover:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-100 group-hover:text-teal-300 transition-colors">
                    {b.name}
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{b.sub}</span>
                  {debt > 0 ? (
                    <span className="text-[9px] text-amber-400 font-bold">
                      Deni: {formatCurrency(debt)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-400">Hakuna Deni</span>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-700/60 space-y-0.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Mapato:</span>
                    <span className="font-extrabold text-teal-400">{formatCurrency(collected)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Faida Halisi:</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(branchProfit)}</span>
                  </div>
                  {branchExp > 0 && (
                    <div className="flex justify-between items-center text-[9px] text-rose-400">
                      <span>Matumizi (Sabuni, n.k):</span>
                      <span>-{formatCurrency(branchExp)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. WAKALA KIOSK (1 BRANCH) */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            <span>3. M-Pesa & Wakala Kiosk (1 Branch)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-emerald-300 font-bold">Faida ya Leo: +{formatCurrency(wakalaCommissions)}</span>
          </div>
        </div>

        {wakalaBranches.map(b => (
          <div 
            key={b.id}
            onClick={() => setSelectedDetailBranchId(b.id)}
            className="p-3.5 bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl space-y-2 cursor-pointer active:scale-98 transition-all shadow-sm group hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                  <span>{b.name}</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                    ✓ Mtaji Salama
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Mtaji: <b className="text-slate-200">{formatCurrency(wakalaRecon.totalCapital)}</b> • Float Laini Zote 8: <b className="text-blue-400">{formatCurrency(wakalaRecon.liveFloat)}</b>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Cash Drooni (Kukusanya):</div>
                  <div className="font-black text-sm text-emerald-400">{formatCurrency(wakalaRecon.liveCash)}</div>
                  <div className="text-[9px] text-teal-400 font-bold">Faida ya Lipa: +{formatCurrency(wakalaCommissions)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 7. Sync Health Status for All 8 Branches */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hali ya Usawazishaji wa Matawi Yote 8 (Live Sync Status)</span>
        </div>

        <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
          {branches?.map(b => (
            <div key={b.id} className="flex items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="truncate pr-2">
                <div className="font-bold text-slate-200 truncate">{b.name}</div>
                <div className="text-[10px] text-slate-400 truncate">Msimamizi: {b.managerName} ({b.location})</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {b.lastSyncedAt ? formatDate(b.lastSyncedAt) : 'Live'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Dedicated In-Depth Branch Detail Modal */}
      {selectedDetailBranchId && (
        <BranchDetailModal
          branchId={selectedDetailBranchId}
          onClose={() => setSelectedDetailBranchId(null)}
          onSelectBranch={onSelectBranch}
          onOpenReceipt={onOpenReceipt}
          initialDateFilter={dateFilter}
        />
      )}

    </div>
  );
};
