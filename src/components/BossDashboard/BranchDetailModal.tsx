import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  X, 
  Smartphone, 
  Shirt, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  ArrowRight, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  Package, 
  Wrench, 
  Sparkles, 
  Phone, 
  ShieldCheck, 
  ShoppingBag, 
  BarChart3, 
  Layers,
  ArrowUpRight,
  MessageSquare,
  Receipt,
  Tag,
  Store,
  Scale,
  Banknote
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { BranchType, Product, Sale, LaundryOrder, WakalaTransaction, RepairOrder, Expense } from '../../types';
import { formatCurrency, formatDate, generateWhatsAppLink } from '../../services/receiptService';
import { SHOPS } from '../Auth/PinLogin';
import { BossDateFilter, checkDateInRange, DateFilterState, getFilterDescription } from './BossDateFilter';
import { LaundryExpenseModal, EXPENSE_CATEGORIES } from '../Laundry/LaundryExpenseModal';

interface BranchDetailModalProps {
  branchId: string;
  onClose: () => void;
  onSelectBranch: (type: BranchType, branchId?: string) => void;
  onOpenReceipt?: (data: any) => void;
  initialDateFilter?: DateFilterState;
}

export const BranchDetailModal: React.FC<BranchDetailModalProps> = ({
  branchId,
  onClose,
  onSelectBranch,
  onOpenReceipt,
  initialDateFilter = { preset: 'today' }
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterState>(initialDateFilter);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Load Database Tables
  const branches = useLiveQuery(async () => db.branches.toArray(), []);
  const allSales = useLiveQuery(async () => db.sales.toArray(), []);
  const allRepairs = useLiveQuery(async () => db.repairs.toArray(), []);
  const allLaundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const allWakalaTxs = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);
  const allWakalaDayLogs = useLiveQuery(async () => db.wakalaDayLogs?.toArray() || [], []);
  const allProducts = useLiveQuery(async () => db.products.toArray(), []);
  const allExpenses = useLiveQuery(async () => db.expenses?.toArray() || [], []);

  // Find branch details
  const branchMeta = SHOPS.find(s => s.id === branchId) || {
    id: branchId,
    type: (branchId.includes('phone') ? 'phone' : branchId.includes('laundry') ? 'laundry' : 'wakala') as BranchType,
    name: 'Duka',
    sub: 'Mwanza',
    defaultPin: '1234',
    icon: Store,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    bgGradient: 'from-blue-600 to-indigo-700',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/40'
  };

  const branchDb = branches?.find(b => b.id === branchId);
  const branchName = branchDb?.name || branchMeta.name;
  const branchLocation = branchDb?.location || branchMeta.sub;
  const branchPhone = branchDb?.phone || '+255 700 000 000';
  const branchCode = branchDb?.code || '';
  const managerName = branchDb?.managerName || 'Msimamizi';

  const IconComponent = branchMeta.icon;

  // Filter Data for this specific branch & date range
  const branchProducts = useMemo(() => {
    return (allProducts || []).filter(p => p.branchId === branchId);
  }, [allProducts, branchId]);

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    (allProducts || []).forEach(p => map.set(p.id, p.costPrice));
    return map;
  }, [allProducts]);

  const branchSales = useMemo(() => {
    return (allSales || []).filter(s => {
      const matchBranch = s.branchId === branchId;
      const matchDate = checkDateInRange(s.createdAt, dateFilter);
      return matchBranch && matchDate;
    });
  }, [allSales, branchId, dateFilter]);

  const branchRepairs = useMemo(() => {
    return (allRepairs || []).filter(r => {
      const matchBranch = r.branchId === branchId;
      const matchDate = checkDateInRange(r.createdAt, dateFilter);
      return matchBranch && matchDate;
    });
  }, [allRepairs, branchId, dateFilter]);

  const branchLaundryOrders = useMemo(() => {
    return (allLaundryOrders || []).filter(o => {
      const matchBranch = o.branchId === branchId;
      const matchDate = checkDateInRange(o.createdAt, dateFilter);
      return matchBranch && matchDate;
    });
  }, [allLaundryOrders, branchId, dateFilter]);

  const branchWakalaTxs = useMemo(() => {
    return (allWakalaTxs || []).filter(tx => {
      const matchBranch = tx.branchId === branchId || tx.branchId === 'branch_wakala';
      const matchDate = checkDateInRange(tx.createdAt, dateFilter);
      return matchBranch && matchDate;
    });
  }, [allWakalaTxs, branchId, dateFilter]);

  // Financial calculations
  const phoneCalculations = useMemo(() => {
    let salesTotal = 0;
    let cogs = 0;
    const itemSales = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();

    branchSales.forEach(s => {
      salesTotal += s.finalAmount;
      s.items.forEach(it => {
        const cost = (productCostMap.get(it.productId) || 0) * it.quantity;
        cogs += cost;
        const cur = itemSales.get(it.productId) || { name: it.productName, qty: 0, revenue: 0, profit: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.totalPrice;
        cur.profit += (it.totalPrice - cost);
        itemSales.set(it.productId, cur);
      });
    });

    let repairLabor = 0;
    branchRepairs.forEach(r => {
      repairLabor += (r.laborCost || 15000);
    });

    const netProfit = (salesTotal - cogs) + repairLabor;
    const topProducts = Array.from(itemSales.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Low stock items for this phone shop
    const lowStockItems = branchProducts.filter(p => p.stock <= p.minStock || p.stock <= 3);

    return {
      salesTotal,
      cogs,
      netProfit,
      repairsCount: branchRepairs.length,
      repairLabor,
      topProducts,
      lowStockItems,
      totalTx: branchSales.length + branchRepairs.length
    };
  }, [branchSales, branchRepairs, branchProducts, productCostMap]);

  // Filter Expenses for this specific branch & date range
  const branchExpenses = useMemo(() => {
    return (allExpenses || []).filter(e => {
      const matchBranch = e.branchId === branchId;
      const matchDate = checkDateInRange(e.createdAt, dateFilter);
      return matchBranch && matchDate;
    });
  }, [allExpenses, branchId, dateFilter]);

  const laundryExpensesTotal = useMemo(() => {
    return branchExpenses.reduce((s, e) => s + e.amount, 0);
  }, [branchExpenses]);

  const laundryExpenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    branchExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [branchExpenses]);

  const laundryCalculations = useMemo(() => {
    let collectedRevenue = 0;
    let totalDebt = 0;
    let totalValue = 0;
    const stageCounts = { received: 0, washing: 0, ironing: 0, ready: 0, delivered: 0 };

    branchLaundryOrders.forEach(o => {
      collectedRevenue += o.deposit;
      totalDebt += o.balanceDue;
      totalValue += o.totalAmount;
      if (stageCounts[o.stage] !== undefined) {
        stageCounts[o.stage]++;
      }
    });

    // Net Profit: Real Revenue minus Real Recorded Expenses (Soap, Power, Water, etc.)
    const netProfit = laundryExpensesTotal > 0
      ? (collectedRevenue - laundryExpensesTotal)
      : Math.round(collectedRevenue * 0.75);

    const unpaidOrders = branchLaundryOrders.filter(o => o.balanceDue > 0);

    return {
      collectedRevenue,
      totalExpenses: laundryExpensesTotal,
      totalDebt,
      totalValue,
      netProfit,
      stageCounts,
      unpaidOrders,
      ordersCount: branchLaundryOrders.length,
      expensesCount: branchExpenses.length
    };
  }, [branchLaundryOrders, laundryExpensesTotal, branchExpenses.length]);

  const wakalaCalculations = useMemo(() => {
    let totalCommissions = 0;
    let totalVolume = 0;
    let totalLipaFee = 0;
    let withdrawals = 0;
    let deposits = 0;
    const providers: Record<string, { volume: number; commission: number; count: number }> = {};

    branchWakalaTxs.forEach(tx => {
      const fee = tx.wakalaFee || (tx.withdrawalMethod === 'lipa_namba' ? (tx.commission || 0) : 0);
      totalCommissions += fee;
      totalVolume += tx.amount;
      totalLipaFee += fee;

      if (tx.type === 'withdrawal') withdrawals += tx.amount;
      else deposits += tx.amount;

      const p = tx.provider || 'mpesa';
      if (!providers[p]) providers[p] = { volume: 0, commission: 0, count: 0 };
      providers[p].volume += tx.amount;
      providers[p].commission += fee;
      providers[p].count += 1;
    });

    return {
      totalCommissions,
      totalVolume,
      totalLipaFee,
      withdrawals,
      deposits,
      providers,
      txCount: branchWakalaTxs.length
    };
  }, [branchWakalaTxs]);

  const todayDate = new Date().toISOString().split('T')[0];
  const todayWakalaDayLog = useMemo(() => {
    return (allWakalaDayLogs || []).find(l => l.date === todayDate) || (allWakalaDayLogs || [])[0];
  }, [allWakalaDayLogs, todayDate]);

  const wakalaReconciliation = useMemo(() => {
    const baseOpeningCash = todayWakalaDayLog?.openingCash ?? 500000;

    // 4 Agent Lines
    const baseMpesaAgent = todayWakalaDayLog?.openingFloatMpesaAgent ?? todayWakalaDayLog?.openingFloatMpesa ?? 800000;
    const baseTigoAgent = todayWakalaDayLog?.openingFloatTigoAgent ?? todayWakalaDayLog?.openingFloatTigo ?? 500000;
    const baseAirtelAgent = todayWakalaDayLog?.openingFloatAirtelAgent ?? todayWakalaDayLog?.openingFloatAirtel ?? 300000;
    const baseHalopesaAgent = todayWakalaDayLog?.openingFloatHalopesaAgent ?? todayWakalaDayLog?.openingFloatHalopesa ?? 200000;

    // 4 Lipa Lines
    const baseMpesaLipa = todayWakalaDayLog?.openingFloatMpesaLipa ?? 700000;
    const baseTigoLipa = todayWakalaDayLog?.openingFloatTigoLipa ?? 300000;
    const baseAirtelLipa = todayWakalaDayLog?.openingFloatAirtelLipa ?? 300000;
    const baseHalopesaLipa = todayWakalaDayLog?.openingFloatHalopesaLipa ?? 100000;

    let netCashChange = 0;
    let netMpesaAgentChange = 0;
    let netTigoAgentChange = 0;
    let netAirtelAgentChange = 0;
    let netHalopesaAgentChange = 0;

    let netMpesaLipaChange = 0;
    let netTigoLipaChange = 0;
    let netAirtelLipaChange = 0;
    let netHalopesaLipaChange = 0;

    branchWakalaTxs.forEach(tx => {
      const amt = tx.amount;
      const isLipa = tx.type === 'withdrawal' && tx.withdrawalMethod === 'lipa_namba';
      const fee = tx.wakalaFee || 0;

      if (isLipa) {
        netCashChange -= amt;
        const lipaReceived = amt + fee;
        if (tx.provider === 'mpesa') netMpesaLipaChange += lipaReceived;
        else if (tx.provider === 'tigo') netTigoLipaChange += lipaReceived;
        else if (tx.provider === 'airtel') netAirtelLipaChange += lipaReceived;
        else if (tx.provider === 'halopesa') netHalopesaLipaChange += lipaReceived;
      } else if (tx.type === 'withdrawal') {
        netCashChange -= amt;
        if (tx.provider === 'mpesa') netMpesaAgentChange += amt;
        else if (tx.provider === 'tigo') netTigoAgentChange += amt;
        else if (tx.provider === 'airtel') netAirtelAgentChange += amt;
        else if (tx.provider === 'halopesa') netHalopesaAgentChange += amt;
      } else if (tx.type === 'deposit') {
        netCashChange += amt;
        if (tx.provider === 'mpesa') netMpesaAgentChange -= amt;
        else if (tx.provider === 'tigo') netTigoAgentChange -= amt;
        else if (tx.provider === 'airtel') netAirtelAgentChange -= amt;
        else if (tx.provider === 'halopesa') netHalopesaAgentChange -= amt;
      }
    });

    const liveCash = baseOpeningCash + netCashChange;

    const liveMpesaAgent = baseMpesaAgent + netMpesaAgentChange;
    const liveTigoAgent = baseTigoAgent + netTigoAgentChange;
    const liveAirtelAgent = baseAirtelAgent + netAirtelAgentChange;
    const liveHalopesaAgent = baseHalopesaAgent + netHalopesaAgentChange;
    const totalLiveAgentFloat = liveMpesaAgent + liveTigoAgent + liveAirtelAgent + liveHalopesaAgent;

    const liveMpesaLipa = baseMpesaLipa + netMpesaLipaChange;
    const liveTigoLipa = baseTigoLipa + netTigoLipaChange;
    const liveAirtelLipa = baseAirtelLipa + netAirtelLipaChange;
    const liveHalopesaLipa = baseHalopesaLipa + netHalopesaLipaChange;
    const totalLiveLipaFloat = liveMpesaLipa + liveTigoLipa + liveAirtelLipa + liveHalopesaLipa;

    const totalLiveFloat = totalLiveAgentFloat + totalLiveLipaFloat;
    const totalOpeningFloat = (baseMpesaAgent + baseTigoAgent + baseAirtelAgent + baseHalopesaAgent) +
      (baseMpesaLipa + baseTigoLipa + baseAirtelLipa + baseHalopesaLipa);
    const totalOpeningCapital = baseOpeningCash + totalOpeningFloat;
    const totalLiveCapital = liveCash + totalLiveFloat;
    const capitalDifference = totalLiveCapital - totalOpeningCapital;

    return {
      openingCash: baseOpeningCash,
      openingFloat: totalOpeningFloat,
      openingCapital: totalOpeningCapital,
      liveCash,
      // 4 Agent lines
      liveMpesaAgent,
      liveTigoAgent,
      liveAirtelAgent,
      liveHalopesaAgent,
      totalLiveAgentFloat,
      // 4 Lipa lines
      liveMpesaLipa,
      liveTigoLipa,
      liveAirtelLipa,
      liveHalopesaLipa,
      totalLiveLipaFloat,
      // Total
      totalLiveFloat,
      totalLiveCapital,
      capitalDifference,
      hasRecordedMorning: !!todayWakalaDayLog
    };
  }, [todayWakalaDayLog, branchWakalaTxs]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
        
        {/* Sticky Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${branchMeta.bgGradient} flex items-center justify-center shadow-lg text-white shrink-0`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-100 truncate">{branchName}</h2>
                {branchCode && (
                  <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-md text-amber-400 border border-slate-700">
                    {branchCode}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-2">
                <span>📍 {branchLocation}</span>
                <span>•</span>
                <span>👤 {managerName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title="Chapa ripoti ya tawi hili"
            >
              <Printer className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={() => onSelectBranch(branchMeta.type, branchMeta.id)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Ingia kwenye duka hili kama muuzaji"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ingia Dukani</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* 1. Date Filter Controls */}
          <BossDateFilter
            value={dateFilter}
            onChange={setDateFilter}
          />

          {/* 2. Primary KPI Cards */}
          {branchMeta.type === 'wakala' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Card 1: Cash Drooni ya Kukusanya */}
              <div className="p-3 bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-500/50 rounded-2xl space-y-1 shadow-sm">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash Drooni (Kukusanya)</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-300">
                  {formatCurrency(wakalaReconciliation.liveCash)}
                </div>
                <div className="text-[9px] text-slate-400">
                  Pesa taslimu ya kuchukua jioni
                </div>
              </div>

              {/* Card 2: Faida ya Lipa Namba */}
              <div className="p-3 bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/40 rounded-2xl space-y-1 shadow-sm">
                <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Faida ya Lipa Namba</span>
                </div>
                <div className="text-base sm:text-lg font-black text-teal-300">
                  +{formatCurrency(wakalaCalculations.totalLipaFee)}
                </div>
                <div className="text-[9px] text-teal-400/80 font-bold">
                  Faida halisi iliyoingia leo
                </div>
              </div>

              {/* Card 3: Float kwenye Laini Zote */}
              <div className="p-3 bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/40 rounded-2xl space-y-1 shadow-sm">
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Float ya Laini Zote</span>
                </div>
                <div className="text-base sm:text-lg font-black text-blue-300">
                  {formatCurrency(wakalaReconciliation.totalLiveFloat)}
                </div>
                <div className="text-[9px] text-slate-400">
                  Salio kwenye laini 4 za simu
                </div>
              </div>

              {/* Card 4: Usalama wa Mtaji (Reconciliation) */}
              <div className="p-3 bg-gradient-to-br from-slate-800/90 to-slate-850 border border-slate-700/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Hali ya Mtaji wa Leo</span>
                </div>
                <div className="text-base sm:text-lg font-black text-amber-300">
                  {formatCurrency(wakalaReconciliation.totalLiveCapital)}
                </div>
                <div className="text-[9px] font-bold">
                  {wakalaReconciliation.capitalDifference === 0 ? (
                    <span className="text-emerald-400">✓ Mtaji Uko Salama (0 Short)</span>
                  ) : wakalaReconciliation.capitalDifference > 0 ? (
                    <span className="text-teal-400">+{formatCurrency(wakalaReconciliation.capitalDifference)} Ziada</span>
                  ) : (
                    <span className="text-rose-400">⚠️ Upungufu: {formatCurrency(wakalaReconciliation.capitalDifference)}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Revenue Card */}
              <div className="p-3 bg-gradient-to-br from-slate-800/90 to-slate-850 border border-slate-700/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Mapato Yaliyopokelewa
                </div>
                <div className="text-base sm:text-lg font-black text-slate-100">
                  {formatCurrency(
                    branchMeta.type === 'phone' ? phoneCalculations.salesTotal :
                    laundryCalculations.collectedRevenue
                  )}
                </div>
                <div className="text-[9px] text-slate-400">
                  Kipindi: {getFilterDescription(dateFilter)}
                </div>
              </div>

              {/* Net Profit Card */}
              <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-1 shadow-sm">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Faida Halisi Safi</div>
                <div className="text-base sm:text-lg font-black text-emerald-400">
                  +{formatCurrency(
                    branchMeta.type === 'phone' ? phoneCalculations.netProfit :
                    laundryCalculations.netProfit
                  )}
                </div>
                <div className="text-[9px] text-emerald-400/80 font-bold">
                  {branchMeta.type === 'phone' ? 'Mauzo & Matengenezo' : 
                   (laundryExpensesTotal > 0 ? 'Mapato - Matumizi' : 'Bila makato ya matumizi')}
                </div>
              </div>

              {/* Third Metric Card: Laundry shows Matumizi ya Tawi; Phone shows Transactions */}
              {branchMeta.type === 'laundry' ? (
                <div className="p-3 bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl space-y-1">
                  <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Matumizi ya Tawi</div>
                  <div className="text-base sm:text-lg font-black text-rose-400">
                    -{formatCurrency(laundryExpensesTotal)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {branchExpenses.length} rekodi (Sabuni, Luku, Maji...)
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Miamala / Mauzo</div>
                  <div className="text-base sm:text-lg font-black text-amber-400">
                    {phoneCalculations.totalTx}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {branchSales.length} mauzo, {branchRepairs.length} repair
                  </div>
                </div>
              )}

              {/* Context Metric Card (Stock/Debt) */}
              <div className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {branchMeta.type === 'phone' ? 'Bidhaa Zilizobaki Chache' : 'Madeni Yanayodaiwa'}
                </div>
                <div className={`text-base sm:text-lg font-black ${
                  branchMeta.type === 'phone' && phoneCalculations.lowStockItems.length > 0 ? 'text-rose-400' :
                  branchMeta.type === 'laundry' && laundryCalculations.totalDebt > 0 ? 'text-amber-400' :
                  'text-slate-100'
                }`}>
                  {branchMeta.type === 'phone' ? `${phoneCalculations.lowStockItems.length} bidhaa` :
                   formatCurrency(laundryCalculations.totalDebt)}
                </div>
                <div className="text-[9px] text-slate-400">
                  {branchMeta.type === 'phone' ? 'Zinazohitaji kuagizwa' :
                   `${laundryCalculations.unpaidOrders.length} wateja wanadaiwa`}
                </div>
              </div>
            </div>
          )}

          {/* 3. PHONE SHOP SPECIFIC SECTIONS */}
          {branchMeta.type === 'phone' && (
            <div className="space-y-4">
              
              {/* LOW STOCK ALERT SECTION */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${phoneCalculations.lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Bidhaa Zinazoelekea Kuisha Stoo ({phoneCalculations.lowStockItems.length})
                    </h3>
                  </div>
                  {phoneCalculations.lowStockItems.length > 0 ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Inahitaji Kuagizwa
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Stoo Iko Salama
                    </span>
                  )}
                </div>

                {phoneCalculations.lowStockItems.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-300 font-medium">
                    ✓ Bidhaa zote katika tawi hili zipo juu ya kiwango cha chini cha stoo!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {phoneCalculations.lowStockItems.map(p => (
                      <div key={p.id} className="p-2.5 bg-slate-800/90 border border-rose-500/30 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Kiwango cha chini: {p.minStock} pcs</span>
                            <span>•</span>
                            <span>Bei: {formatCurrency(p.sellingPrice)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                            p.stock <= 1 ? 'bg-rose-500 text-white shadow-sm' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            Imebaki: {p.stock} pcs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOP SELLING PRODUCTS */}
              {phoneCalculations.topProducts.length > 0 && (
                <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Bidhaa Zinazoongoza kwa Mauzo
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    {phoneCalculations.topProducts.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-800/80 rounded-xl flex items-center justify-between border border-slate-700/60 text-xs">
                        <div className="truncate pr-2">
                          <div className="font-bold text-slate-100 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400">Zilizouzwa: {item.qty} pcs</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-200">{formatCurrency(item.revenue)}</div>
                          <div className="text-[10px] text-emerald-400 font-bold">Faida: +{formatCurrency(item.profit)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RECENT SALES LIST */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Mauzo ya Hivi Karibuni ({branchSales.length})
                    </h3>
                  </div>
                </div>

                {branchSales.length === 0 ? (
                  <div className="p-4 bg-slate-800/50 rounded-xl text-center text-xs text-slate-400">
                    Hakuna mauzo yaliyofanyika kwa kipindi hiki ulichochagua.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                    {branchSales.slice(0, 10).map(s => (
                      <div key={s.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            <span>{s.saleNumber}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{s.customerName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(s.createdAt)} • {s.items.length} bidhaa • {s.paymentMethod.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div className="font-black text-xs text-blue-400">{formatCurrency(s.finalAmount)}</div>
                          {onOpenReceipt && (
                            <button
                              onClick={() => onOpenReceipt({
                                type: 'phone_sale',
                                title: 'Risiti ya Mauzo',
                                branchName,
                                branchPhone,
                                branchLocation,
                                receiptNumber: s.saleNumber,
                                createdAt: s.createdAt,
                                customerName: s.customerName,
                                customerPhone: s.customerPhone,
                                items: s.items.map(i => ({ name: i.productName, qty: i.quantity, price: i.unitPrice, total: i.totalPrice, imei: i.imei })),
                                totalAmount: s.totalAmount,
                                discount: s.discount,
                                paidAmount: s.finalAmount,
                                paymentMethod: s.paymentMethod,
                                cashierName: s.cashierName
                              })}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                              title="Tazama Risiti"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 4. LAUNDRY SPECIFIC SECTIONS */}
          {branchMeta.type === 'laundry' && (
            <div className="space-y-4">

              {/* UNPAID LAUNDRY DEBT SECTION */}
              {laundryCalculations.unpaidOrders.length > 0 && (
                <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                        Madeni Yanayodaiwa ({laundryCalculations.unpaidOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] text-amber-400 font-black">
                      {formatCurrency(laundryCalculations.totalDebt)}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {laundryCalculations.unpaidOrders.map(o => (
                      <div key={o.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                        <div className="truncate">
                          <div className="font-bold text-slate-100">{o.customerName} ({o.tagNumber})</div>
                          <div className="text-[10px] text-slate-400">{o.customerPhone}</div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div className="font-black text-amber-400">{formatCurrency(o.balanceDue)}</div>
                          {o.customerPhone && (
                            <a
                              href={generateWhatsAppLink(o.customerPhone, `Habari ${o.customerName}, unakumbushwa kuwa una baki ya ${formatCurrency(o.balanceDue)} ya nguo zako katika ofisi ya ${branchName}. Asante.`)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs"
                              title="Tuma WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RECENT ORDERS LIST */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Maagizo ya Hivi Karibuni ({branchLaundryOrders.length})
                    </h3>
                  </div>
                </div>

                {branchLaundryOrders.length === 0 ? (
                  <div className="p-4 bg-slate-800/50 rounded-xl text-center text-xs text-slate-400">
                    Hakuna maagizo ya nguo kwa kipindi hiki ulichochagua.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                    {branchLaundryOrders.slice(0, 10).map(o => (
                      <div key={o.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            <span>Tag: {o.tagNumber}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{o.customerName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(o.createdAt)} • Hatua: <b className="capitalize text-teal-300">{o.stage}</b>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <div className="font-black text-xs text-teal-400">{formatCurrency(o.deposit)}</div>
                            {o.balanceDue > 0 && (
                              <div className="text-[9px] text-rose-400 font-bold">Deni: {formatCurrency(o.balanceDue)}</div>
                            )}
                          </div>
                          {onOpenReceipt && (
                            <button
                              onClick={() => onOpenReceipt({
                                type: 'laundry_order',
                                title: 'Tag ya Nguo',
                                branchName,
                                branchPhone,
                                branchLocation,
                                receiptNumber: o.orderNumber,
                                tagNumber: o.tagNumber,
                                createdAt: o.createdAt,
                                customerName: o.customerName,
                                customerPhone: o.customerPhone,
                                items: o.items.map(i => ({ name: i.itemType, qty: i.quantity, price: i.pricePerItem, total: i.totalPrice })),
                                totalAmount: o.totalAmount,
                                discount: o.discount,
                                paidAmount: o.deposit,
                                balanceDue: o.balanceDue,
                                promisedDate: o.promisedDate,
                                notes: o.notes
                              })}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                              title="Tazama Risiti"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* EXPENSES BREAKDOWN SECTION (Sabuni, Luku, Maji, Mifuko n.k.) */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Matumizi ya Tawi kwa Kipindi Hiki ({branchExpenses.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>+ Rekodi Matumizi</span>
                  </button>
                </div>

                {/* Expense category breakdown cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/70">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>🧼</span>
                      <span>Sabuni & Kemikali</span>
                    </div>
                    <div className="text-xs font-black text-rose-300 mt-1">
                      {formatCurrency(laundryExpenseBreakdown['sabuni_kemikali'] || 0)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/70">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>⚡</span>
                      <span>Umeme wa LUKU</span>
                    </div>
                    <div className="text-xs font-black text-rose-300 mt-1">
                      {formatCurrency(laundryExpenseBreakdown['umeme_luku'] || 0)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/70">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>💧</span>
                      <span>Maji & Madumu</span>
                    </div>
                    <div className="text-xs font-black text-rose-300 mt-1">
                      {formatCurrency(laundryExpenseBreakdown['maji'] || 0)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/70">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>🛍️</span>
                      <span>Mifuko & Mengi</span>
                    </div>
                    <div className="text-xs font-black text-rose-300 mt-1">
                      {formatCurrency(
                        (laundryExpenseBreakdown['mifuko_packaging'] || 0) +
                        (laundryExpenseBreakdown['posho_mshahara'] || 0) +
                        (laundryExpenseBreakdown['matengenezo'] || 0) +
                        (laundryExpenseBreakdown['other'] || 0)
                      )}
                    </div>
                  </div>
                </div>

                {/* Recorded expenses list */}
                {branchExpenses.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                    {branchExpenses.map(exp => (
                      <div key={exp.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 truncate">{exp.title}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(exp.createdAt)} {exp.notes ? `• ${exp.notes}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-rose-400">-{formatCurrency(exp.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/40 rounded-xl text-center text-xs text-slate-400">
                    Hakuna matumizi ya sabuni, umeme au maji yaliyorekodiwa kwa tarehe hizi. Bonyeza "+ Rekodi Matumizi" hapo juu kuweka gharama halisi.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 5. WAKALA SPECIFIC SECTIONS */}
          {branchMeta.type === 'wakala' && (
            <div className="space-y-4">
              
              {/* CAPITAL RECONCILIATION SUMMARY (USAWA WA MTAJI) */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Uhakiki wa Mtaji (Usalama wa Fedha za Boss)
                    </h3>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    wakalaReconciliation.capitalDifference >= 0 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {wakalaReconciliation.capitalDifference >= 0 ? '✓ Mtaji Uko Salama' : '⚠️ Short / Upungufu'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-between">
                      <span>1. Asubuhi (Kuanzia Kazi)</span>
                      <span className="text-[9px] bg-slate-700 px-1.5 py-0.2 rounded text-slate-300">Opening</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cash Drooni:</span>
                      <b className="text-white">{formatCurrency(wakalaReconciliation.openingCash)}</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Float ya Laini:</span>
                      <b className="text-white">{formatCurrency(wakalaReconciliation.openingFloat)}</b>
                    </div>
                    <div className="pt-1.5 border-t border-slate-700 flex justify-between text-amber-300 font-extrabold">
                      <span>Jumla ya Mtaji Asubuhi:</span>
                      <span>{formatCurrency(wakalaReconciliation.openingCapital)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-emerald-500/30 space-y-1.5">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center justify-between">
                      <span>2. Sasa Hivi (Mubashara)</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">Live Now</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cash Drooni Sasa:</span>
                      <b className="text-emerald-400">{formatCurrency(wakalaReconciliation.liveCash)}</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Float ya Laini Sasa:</span>
                      <b className="text-blue-400">{formatCurrency(wakalaReconciliation.totalLiveFloat)}</b>
                    </div>
                    <div className="pt-1.5 border-t border-slate-700 flex justify-between text-emerald-400 font-black">
                      <span>Jumla ya Mtaji Sasa:</span>
                      <span>{formatCurrency(wakalaReconciliation.totalLiveCapital)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE FLOAT PER NETWORK (LAINI ZOTE 8) */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Salio Lililopo Kwenye Kila Laini ya Simu (Laini Zote 8)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Jumla ya Float: <b className="text-white">{formatCurrency(wakalaReconciliation.totalLiveFloat)}</b></span>
                </div>

                {/* 1. Laini 4 za Wakala Kawaida */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider flex items-center justify-between">
                    <span>📱 1. Laini 4 za Wakala Kawaida (Kumuwekea Mteja)</span>
                    <span className="text-slate-400 font-normal">Jumla: {formatCurrency(wakalaReconciliation.totalLiveAgentFloat)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-red-500/30">
                      <div className="text-[10px] text-red-400 uppercase font-black truncate">Vodacom Wakala</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveMpesaAgent)}</div>
                      <div className="text-[9px] text-slate-400">Float ya Wakala</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-blue-500/30">
                      <div className="text-[10px] text-blue-400 uppercase font-black truncate">Tigo Wakala</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveTigoAgent)}</div>
                      <div className="text-[9px] text-slate-400">Float ya Wakala</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-rose-500/30">
                      <div className="text-[10px] text-rose-400 uppercase font-black truncate">Airtel Wakala</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveAirtelAgent)}</div>
                      <div className="text-[9px] text-slate-400">Float ya Wakala</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-amber-500/30">
                      <div className="text-[10px] text-amber-400 uppercase font-black truncate">Halotel Wakala</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveHalopesaAgent)}</div>
                      <div className="text-[9px] text-slate-400">Float ya Wakala</div>
                    </div>
                  </div>
                </div>

                {/* 2. Laini 4 za Lipa Namba */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider flex items-center justify-between">
                    <span>🏷️ 2. Laini 4 za Lipa Namba (Kupokea Mteja Anayetoa Lipa)</span>
                    <span className="text-slate-400 font-normal">Jumla: {formatCurrency(wakalaReconciliation.totalLiveLipaFloat)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-red-500/30">
                      <div className="text-[10px] text-red-400 uppercase font-black truncate">Vodacom Lipa</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveMpesaLipa)}</div>
                      <div className="text-[9px] text-slate-400">Salio la Lipa</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-blue-500/30">
                      <div className="text-[10px] text-blue-400 uppercase font-black truncate">Tigo Lipa</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveTigoLipa)}</div>
                      <div className="text-[9px] text-slate-400">Salio la Lipa</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-rose-500/30">
                      <div className="text-[10px] text-rose-400 uppercase font-black truncate">Airtel Lipa</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveAirtelLipa)}</div>
                      <div className="text-[9px] text-slate-400">Salio la Lipa</div>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-amber-500/30">
                      <div className="text-[10px] text-amber-400 uppercase font-black truncate">Halotel Lipa</div>
                      <div className="text-sm font-black text-slate-100 mt-1">{formatCurrency(wakalaReconciliation.liveHalopesaLipa)}</div>
                      <div className="text-[9px] text-slate-400">Salio la Lipa</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT TRANSACTIONS */}
              <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Miamala ya Hivi Karibuni ({branchWakalaTxs.length})
                    </h3>
                  </div>
                </div>

                {branchWakalaTxs.length === 0 ? (
                  <div className="p-4 bg-slate-800/50 rounded-xl text-center text-xs text-slate-400">
                    Hakuna miamala kwa kipindi hiki ulichochagua.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                    {branchWakalaTxs.slice(0, 10).map(tx => (
                      <div key={tx.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span>{tx.transactionNumber}</span>
                            <span className="text-[10px] uppercase font-bold text-emerald-400">
                              ({tx.provider} - {tx.withdrawalMethod === 'lipa_namba' ? 'Kutoa kwa Lipa' : tx.type === 'withdrawal' ? 'Kutoa Cash' : 'Kuweka Cash'})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{formatDate(tx.createdAt)} {tx.customerPhone ? `• ${tx.customerPhone}` : ''}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-200">{formatCurrency(tx.amount)}</div>
                          {tx.withdrawalMethod === 'lipa_namba' && (tx.wakalaFee || tx.commission) ? (
                            <div className="text-[10px] text-emerald-400 font-bold">Faida: +{formatCurrency(tx.wakalaFee || tx.commission)}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Laundry Expense Recording Modal */}
      {showExpenseModal && (
        <LaundryExpenseModal
          branchId={branchId}
          branchName={branchName}
          onClose={() => setShowExpenseModal(false)}
        />
      )}
    </div>
  );
};
