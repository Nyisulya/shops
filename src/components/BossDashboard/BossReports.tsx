import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart3, 
  TrendingUp, 
  Smartphone, 
  Shirt, 
  Wallet, 
  Calendar, 
  Download, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Percent, 
  ShoppingBag, 
  AlertCircle,
  CheckCircle2,
  PieChart,
  Layers,
  ChevronRight,
  Package,
  Store
} from 'lucide-react';
import { db } from '../../db/dexie';
import { formatCurrency, formatDate } from '../../services/receiptService';
import { SHOPS } from '../Auth/PinLogin';

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'all';
type ShopCategoryFilter = 'all' | 'phone' | 'laundry' | 'wakala';

export const BossReports: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [categoryFilter, setCategoryFilter] = useState<ShopCategoryFilter>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Load database tables
  const branches = useLiveQuery(async () => db.branches.toArray(), []);
  const sales = useLiveQuery(async () => db.sales.toArray(), []);
  const repairs = useLiveQuery(async () => db.repairs.toArray(), []);
  const laundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []);
  const wakalaTxs = useLiveQuery(async () => db.wakalaTransactions.toArray(), []);
  const products = useLiveQuery(async () => db.products.toArray(), []);

  // Filter helper by date
  const isDateInFilter = (dateStr: string) => {
    if (!dateStr) return false;
    if (dateFilter === 'all') return true;

    const itemDate = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (dateFilter) {
      case 'today':
        return itemDate >= todayStart;
      case 'yesterday':
        return itemDate >= yesterdayStart && itemDate < todayStart;
      case 'week':
        return itemDate >= weekStart;
      case 'month':
        return itemDate >= monthStart;
      default:
        return true;
    }
  };

  // 1. Phone Shop Analytics (Filter by specific phone branch if selected)
  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      const matchesDate = isDateInFilter(s.createdAt);
      const matchesBranch = selectedBranchId === 'all' || s.branchId === selectedBranchId;
      return matchesDate && matchesBranch;
    });
  }, [sales, dateFilter, selectedBranchId]);

  const filteredRepairs = useMemo(() => {
    return (repairs || []).filter(r => {
      const matchesDate = isDateInFilter(r.createdAt);
      const matchesBranch = selectedBranchId === 'all' || r.branchId === selectedBranchId;
      return matchesDate && matchesBranch;
    });
  }, [repairs, dateFilter, selectedBranchId]);

  // Product Map for quick Cost Price lookup
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    (products || []).forEach(p => {
      map.set(p.id, p.costPrice);
    });
    return map;
  }, [products]);

  // Calculate Phone Profit & Costs
  const phoneCalculations = useMemo(() => {
    let grossSales = 0;
    let costOfGoodsSold = 0;
    let totalDiscount = 0;
    const itemSalesSummary = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    const paymentMethods: Record<string, number> = {};

    filteredSales.forEach(sale => {
      grossSales += sale.finalAmount;
      totalDiscount += sale.discount || 0;

      const method = sale.paymentMethod || 'cash';
      paymentMethods[method] = (paymentMethods[method] || 0) + sale.finalAmount;

      sale.items.forEach(it => {
        const itemCost = (productCostMap.get(it.productId) || 0) * it.quantity;
        costOfGoodsSold += itemCost;
        const itemProfit = it.totalPrice - itemCost;

        const current = itemSalesSummary.get(it.productId) || { name: it.productName, qty: 0, revenue: 0, profit: 0 };
        current.qty += it.quantity;
        current.revenue += it.totalPrice;
        current.profit += itemProfit;
        itemSalesSummary.set(it.productId, current);
      });
    });

    const retailNetProfit = grossSales - costOfGoodsSold;

    // Repairs Profit
    let repairsRevenue = 0;
    let repairsLaborProfit = 0;
    let repairsSpareCost = 0;

    filteredRepairs.forEach(rep => {
      repairsRevenue += rep.deposit || (rep.status === 'delivered' ? rep.totalCost : 0);
      repairsLaborProfit += rep.laborCost || 0;
      repairsSpareCost += rep.sparePartsCost || 0;
    });

    const totalPhoneProfit = retailNetProfit + repairsLaborProfit;
    const totalPhoneRevenue = grossSales + repairsRevenue;

    const topSellingItems = Array.from(itemSalesSummary.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      grossSales,
      costOfGoodsSold,
      retailNetProfit,
      repairsRevenue,
      repairsLaborProfit,
      repairsSpareCost,
      totalPhoneProfit,
      totalPhoneRevenue,
      totalDiscount,
      topSellingItems,
      paymentMethods,
      salesCount: filteredSales.length,
      repairsCount: filteredRepairs.length
    };
  }, [filteredSales, filteredRepairs, productCostMap]);

  // 2. Laundry Analytics (Filter by specific laundry branch if selected)
  const filteredLaundry = useMemo(() => {
    return (laundryOrders || []).filter(o => {
      const matchesDate = isDateInFilter(o.createdAt);
      const matchesBranch = selectedBranchId === 'all' || o.branchId === selectedBranchId;
      return matchesDate && matchesBranch;
    });
  }, [laundryOrders, dateFilter, selectedBranchId]);

  const laundryCalculations = useMemo(() => {
    let totalOrderValue = 0;
    let collectedRevenue = 0;
    let outstandingDebt = 0;
    let totalPieces = 0;
    const stageCounts: Record<string, number> = {
      received: 0,
      washing: 0,
      ironing: 0,
      ready: 0,
      delivered: 0
    };

    filteredLaundry.forEach(order => {
      totalOrderValue += order.totalAmount;
      collectedRevenue += order.deposit || 0;
      outstandingDebt += order.balanceDue || 0;

      if (order.stage && stageCounts[order.stage] !== undefined) {
        stageCounts[order.stage]++;
      }

      order.items?.forEach(i => {
        totalPieces += i.quantity || 1;
      });
    });

    const estimatedExpenses = collectedRevenue * 0.25;
    const estimatedNetProfit = collectedRevenue - estimatedExpenses;

    return {
      totalOrderValue,
      collectedRevenue,
      outstandingDebt,
      totalPieces,
      ordersCount: filteredLaundry.length,
      stageCounts,
      estimatedNetProfit
    };
  }, [filteredLaundry]);

  // 3. Wakala Analytics
  const filteredWakala = useMemo(() => {
    return (wakalaTxs || []).filter(tx => {
      const matchesDate = isDateInFilter(tx.createdAt);
      const matchesBranch = selectedBranchId === 'all' || tx.branchId === selectedBranchId || tx.branchId === 'branch_wakala';
      return matchesDate && matchesBranch;
    });
  }, [wakalaTxs, dateFilter, selectedBranchId]);

  const wakalaCalculations = useMemo(() => {
    let totalCommission = 0;
    let totalLipaFee = 0;
    let totalVolume = 0;
    let withdrawalsVolume = 0;
    let depositsVolume = 0;

    const providerBreakdown: Record<string, { volume: number; commission: number; count: number }> = {};

    filteredWakala.forEach(tx => {
      const fee = tx.wakalaFee || (tx.withdrawalMethod === 'lipa_namba' ? (tx.commission || 0) : 0);
      totalLipaFee += fee;
      totalCommission += fee;
      totalVolume += tx.amount;

      if (tx.type === 'withdrawal') {
        withdrawalsVolume += tx.amount;
      } else {
        depositsVolume += tx.amount;
      }

      const p = tx.provider || 'other';
      if (!providerBreakdown[p]) {
        providerBreakdown[p] = { volume: 0, commission: 0, count: 0 };
      }
      providerBreakdown[p].volume += tx.amount;
      providerBreakdown[p].commission += fee;
      providerBreakdown[p].count += 1;
    });

    const totalWakalaProfit = totalLipaFee;

    return {
      totalCommission,
      totalLipaFee,
      totalWakalaProfit,
      totalVolume,
      withdrawalsVolume,
      depositsVolume,
      txCount: filteredWakala.length,
      providerBreakdown
    };
  }, [filteredWakala]);

  // Consolidated Master Financials
  const masterFinancials = useMemo(() => {
    let totalRevenue = 0;
    let totalNetProfit = 0;
    let totalTransactions = 0;

    if (categoryFilter === 'all' || categoryFilter === 'phone') {
      totalRevenue += phoneCalculations.totalPhoneRevenue;
      totalNetProfit += phoneCalculations.totalPhoneProfit;
      totalTransactions += phoneCalculations.salesCount + phoneCalculations.repairsCount;
    }
    if (categoryFilter === 'all' || categoryFilter === 'laundry') {
      totalRevenue += laundryCalculations.collectedRevenue;
      totalNetProfit += laundryCalculations.estimatedNetProfit;
      totalTransactions += laundryCalculations.ordersCount;
    }
    if (categoryFilter === 'all' || categoryFilter === 'wakala') {
      totalRevenue += wakalaCalculations.totalWakalaProfit;
      totalNetProfit += wakalaCalculations.totalWakalaProfit;
      totalTransactions += wakalaCalculations.txCount;
    }

    const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      totalRevenue,
      totalNetProfit,
      totalTransactions,
      profitMargin
    };
  }, [phoneCalculations, laundryCalculations, wakalaCalculations, categoryFilter]);

  const handlePrint = () => {
    window.print();
  };

  // Available individual branches for the selected category
  const branchOptions = useMemo(() => {
    const list = SHOPS.filter(s => s.type !== 'boss');
    if (categoryFilter === 'all') return list;
    return list.filter(s => s.type === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="space-y-4 pb-28">
      
      {/* Date Filter & Export Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Ripoti Kuu ya Faida & Mauzo (Maduka 7)</h2>
              <div className="text-[10px] text-slate-400">Tathmini halisi ya mapato na faida safi ya kila tawi</div>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Toa / Chapa Ripoti</span>
          </button>
        </div>

        {/* Date Filters Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'today', label: 'Leo' },
            { id: 'yesterday', label: 'Jana' },
            { id: 'week', label: 'Siku 7 Zilizopita' },
            { id: 'month', label: 'Mwezi Huu' },
            { id: 'all', label: 'Muda Wote (All)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as DateFilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                dateFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter Tabs */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80 text-center">
          {[
            { id: 'all', label: 'Maduka Yote (8)', icon: Layers, color: 'text-amber-400' },
            { id: 'phone', label: 'Simu (3)', icon: Smartphone, color: 'text-blue-400' },
            { id: 'laundry', label: 'Laundry (4)', icon: Shirt, color: 'text-teal-400' },
            { id: 'wakala', label: 'Wakala (1)', icon: Wallet, color: 'text-emerald-400' },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCategoryFilter(tab.id as ShopCategoryFilter);
                  setSelectedBranchId('all');
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-slate-800 border border-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Specific Branch Sub-filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-slate-800/60">
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedBranchId === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Matawi Yote
          </button>
          {branchOptions.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                selectedBranchId === b.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* MASTER KPI HIGHLIGHTS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Net Profit Card */}
        <div className="p-3.5 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Faida Safi (Net Profit)</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(masterFinancials.totalNetProfit)}
          </div>
          <div className="text-[10px] text-slate-400">
            Margin: ~{masterFinancials.profitMargin}% ya mauzo
          </div>
        </div>

        {/* Total Revenue Collected */}
        <div className="p-3.5 bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border border-blue-500/40 rounded-3xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-blue-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Mauzo / Mapato</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(masterFinancials.totalRevenue)}
          </div>
          <div className="text-[10px] text-slate-400">
            {masterFinancials.totalTransactions} miamala
          </div>
        </div>
      </div>

      {/* 1. DUKA LA SIMU & VIFAA DETAILED REPORT */}
      {(categoryFilter === 'all' || categoryFilter === 'phone') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">1. Maduka ya Simu & Vifaa (Soko Kuu, Vunja Bei, Makoroboi)</h3>
                <span className="text-[10px] text-slate-400">Uchambuzi wa bidhaa, bei ya kununua na kuuza</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-blue-400">
                +{formatCurrency(phoneCalculations.totalPhoneProfit)}
              </span>
              <div className="text-[9px] text-slate-400">Faida Halisi</div>
            </div>
          </div>

          {/* Stats Grid for Phone Shop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Mauzo ya Bidhaa</div>
              <div className="text-sm font-extrabold text-slate-100 mt-0.5">{formatCurrency(phoneCalculations.grossSales)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-amber-400 font-bold uppercase">Mtaji / Kununua</div>
              <div className="text-sm font-extrabold text-amber-300 mt-0.5">{formatCurrency(phoneCalculations.costOfGoodsSold)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Faida ya Mauzo</div>
              <div className="text-sm font-extrabold text-emerald-300 mt-0.5">+{formatCurrency(phoneCalculations.retailNetProfit)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-blue-400 font-bold uppercase">Faida ya Matengenezo</div>
              <div className="text-sm font-extrabold text-blue-300 mt-0.5">+{formatCurrency(phoneCalculations.repairsLaborProfit)}</div>
            </div>
          </div>

          {/* Top Selling & Profitable Items in Phone Shop */}
          {phoneCalculations.topSellingItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Bidhaa Zinazoongoza kwa Faida:
              </div>
              <div className="space-y-1.5">
                {phoneCalculations.topSellingItems.map((it, idx) => (
                  <div key={idx} className="p-2 bg-slate-800/60 rounded-xl border border-slate-750 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 font-semibold truncate">{it.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({it.qty} pcs)</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-bold">+{formatCurrency(it.profit)} faida</div>
                      <div className="text-[9px] text-slate-400">Mauzo: {formatCurrency(it.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Methods breakdown */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
            <span className="text-slate-400 font-bold">Njia za Malipo:</span>
            {Object.entries(phoneCalculations.paymentMethods).map(([meth, amount]) => (
              <span key={meth} className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300 uppercase font-mono">
                {meth}: <b>{formatCurrency(amount)}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. GGS LAUNDRY SERVICE DETAILED REPORT */}
      {(categoryFilter === 'all' || categoryFilter === 'laundry') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                <Shirt className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">2. GGS Laundry Service (Machinjioni, Mahina kati, Nyasaka, Sahwa)</h3>
                <span className="text-[10px] text-slate-400">Mapato, madeni na maendeleo ya usafi wa nguo</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-teal-400">
                {formatCurrency(laundryCalculations.collectedRevenue)}
              </span>
              <div className="text-[9px] text-slate-400">Zilizokusanywa</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Thamani ya Maagizo</div>
              <div className="text-sm font-extrabold text-slate-100 mt-0.5">{formatCurrency(laundryCalculations.totalOrderValue)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-teal-400 font-bold uppercase">Pesa Zilizopokelewa</div>
              <div className="text-sm font-extrabold text-teal-300 mt-0.5">{formatCurrency(laundryCalculations.collectedRevenue)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-rose-400 font-bold uppercase">Madeni Yanayodaiwa</div>
              <div className="text-sm font-extrabold text-rose-400 mt-0.5">{formatCurrency(laundryCalculations.outstandingDebt)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Faida Inayokadiriwa</div>
              <div className="text-sm font-extrabold text-emerald-300 mt-0.5">+{formatCurrency(laundryCalculations.estimatedNetProfit)}</div>
            </div>
          </div>

          {/* Laundry Stats Summary */}
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-750 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              Idadi ya Nguo Zilizofanyiwa Kazi: <b className="text-teal-400 font-black">{laundryCalculations.totalPieces} nguo</b>
            </span>
            <span className="text-slate-400 font-medium">
              Jumla ya Wateja: <b className="text-slate-200 font-bold">{laundryCalculations.ordersCount}</b>
            </span>
          </div>
        </div>
      )}

      {/* 3. M-PESA & WAKALA KIOSK DETAILED REPORT */}
      {(categoryFilter === 'all' || categoryFilter === 'wakala') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">3. M-Pesa & Wakala Kiosk (Kinondoni Manyanya)</h3>
                <span className="text-[10px] text-slate-400">Tume zilizopatikana, mzunguko na ada ya Lipa Namba</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-emerald-400">
                +{formatCurrency(wakalaCalculations.totalWakalaProfit)}
              </span>
              <div className="text-[9px] text-slate-400">Tume / Faida Safi</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Mzunguko (Volume)</div>
              <div className="text-sm font-extrabold text-slate-100 mt-0.5">{formatCurrency(wakalaCalculations.totalVolume)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Faida ya Lipa Namba</div>
              <div className="text-sm font-extrabold text-emerald-300 mt-0.5">+{formatCurrency(wakalaCalculations.totalLipaFee)}</div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-cyan-400 font-bold uppercase">Kutoa / Kuweka</div>
              <div className="text-[10px] font-bold text-slate-200 mt-0.5 truncate">
                Kutoa: {formatCurrency(wakalaCalculations.withdrawalsVolume)}
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-blue-400 font-bold uppercase">Miamala Yote</div>
              <div className="text-sm font-extrabold text-blue-300 mt-0.5">{wakalaCalculations.txCount} txs</div>
            </div>
          </div>

          {/* Provider Share Grid */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Faida ya Lipa kwa Kila Mtandao:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(wakalaCalculations.providerBreakdown).map(([provider, data]) => (
                <div key={provider} className="p-2 bg-slate-800/60 rounded-xl border border-slate-750">
                  <div className="flex justify-between items-center uppercase font-bold text-slate-200 text-[11px]">
                    <span>{provider}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{data.count} txs</span>
                  </div>
                  <div className="text-emerald-400 font-extrabold mt-1">+{formatCurrency(data.commission)}</div>
                  <div className="text-[9px] text-slate-400">Vol: {formatCurrency(data.volume)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
