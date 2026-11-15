import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  Receipt,
  ShoppingBag,
  Lock,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  LogOut,
  Search,
  AlertTriangle,
  Smartphone,
  Headphones,
  Wrench,
  Calendar,
  Edit3,
  X
} from 'lucide-react';
import { getSyncConfig } from '../../services/syncService';
import { formatCurrency, formatDate } from '../../services/receiptService';

const PHONE_BRANCHES = [
  { id: 'branch_phone_1', name: 'Duka la Soko Kuu', code: 'PH-01' },
  { id: 'branch_phone_2', name: 'Duka la Vunja Bei', code: 'PH-02' },
  { id: 'branch_phone_3', name: 'Duka la Makoroboi', code: 'PH-03' }
];

const STORAGE_OPTIONS = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB'];

// Tarehe kwa saa za Tanzania (local), si UTC
const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shortDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const branchLabel = (branchId?: string) => {
  if (!branchId || branchId === 'branch_phone') return 'Duka la Soko Kuu';
  return PHONE_BRANCHES.find(b => b.id === branchId)?.name || branchId;
};

const categoryLabel = (cat?: string) => {
  if (cat === 'phone') return 'Simu';
  if (cat === 'accessory') return 'Vifaa';
  if (cat === 'spare') return 'Spea';
  return 'Nyingine';
};

export const BossWebDashboard: React.FC = () => {
  const { apiUrl } = getSyncConfig();
  const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem('boss_web_api_key') || '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'salaries' | 'expenses' | 'sales'>('overview');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('month');
  // Draft (unazoweza kubadilisha) vs Applied (zinazotumwa kwa seva)
  const [customFrom, setCustomFrom] = useState(() => toLocalISO(new Date()));
  const [customTo, setCustomTo] = useState(() => toLocalISO(new Date()));
  const [appliedCustom, setAppliedCustom] = useState(() => {
    const today = toLocalISO(new Date());
    return { from: today, to: today };
  });

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inventory filters
  const [invSearch, setInvSearch] = useState('');
  const [invCat, setInvCat] = useState('all');

  // Salary form
  const [salBranch, setSalBranch] = useState('branch_phone_1');
  const [salName, setSalName] = useState('');
  const [salRole, setSalRole] = useState('Muuzaji');
  const [salAmount, setSalAmount] = useState('');
  const [salPhone, setSalPhone] = useState('');

  // Boss Expense form (free-text)
  const [expBranch, setExpBranch] = useState('branch_phone_1');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodBranch, setProdBranch] = useState('branch_phone_1');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<'phone' | 'accessory' | 'spare' | 'other'>('phone');
  const [prodCondition, setProdCondition] = useState<'new' | 'used'>('new');
  const [prodImei, setProdImei] = useState('');
  const [prodStorage, setProdStorage] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState('');
  const [prodSellingPrice, setProdSellingPrice] = useState('');
  const [prodStock, setProdStock] = useState('1');
  const [prodMinStock, setProdMinStock] = useState('1');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = toLocalISO(now);
    if (datePreset === 'today') return { from: today, to: today };
    if (datePreset === 'yesterday') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const y = toLocalISO(d);
      return { from: y, to: y };
    }
    if (datePreset === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toLocalISO(d), to: today };
    }
    if (datePreset === 'month') {
      const monthStart = `${today.slice(0, 7)}-01`;
      return { from: monthStart, to: today };
    }
    if (datePreset === 'custom') return { from: appliedCustom.from, to: appliedCustom.to };
    return { from: '', to: '' };
  }, [datePreset, appliedCustom]);

  const dateRangeLabel = useMemo(() => {
    if (datePreset === 'all') return 'Zote (bila kikomo)';
    if (!dateRange.from) return '';
    if (dateRange.from === dateRange.to) return shortDate(dateRange.from);
    return `${shortDate(dateRange.from)} — ${shortDate(dateRange.to)}`;
  }, [datePreset, dateRange]);

  const isCustomDirty = customFrom !== appliedCustom.from || customTo !== appliedCustom.to;

  const applyCustomFilter = () => {
    if (!customFrom || !customTo) return;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    setAppliedCustom({ from, to });
    setDatePreset('custom');
  };

  const prodProfit = useMemo(() => {
    const cost = Number(prodCostPrice || 0);
    const sell = Number(prodSellingPrice || 0);
    const qty = Number(prodStock || 0);
    const unit = sell - cost;
    const margin = sell > 0 ? (unit / sell) * 100 : 0;
    const hasCost = prodCostPrice !== '' && Number(prodCostPrice) > 0;
    const hasSell = prodSellingPrice !== '' && Number(prodSellingPrice) > 0;
    return {
      unit,
      margin,
      qty,
      total: unit * qty,
      hasCost,
      hasSell,
      ready: hasCost && hasSell
    };
  }, [prodCostPrice, prodSellingPrice, prodStock]);

  const fetchOverview = useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.set('branchId', selectedBranch);
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);

      const res = await fetch(`${apiUrl}/boss/overview?${params.toString()}`, {
        headers: { 'x-api-key': apiKey }
      });
      if (res.status === 401) {
        sessionStorage.removeItem('boss_web_api_key');
        setApiKey('');
        return;
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Imeshindwa kupakia taarifa.');
      setData(json);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Hitilafu ya mtandao.');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, apiUrl, selectedBranch, dateRange]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Real-time SSE auto-refresh
  useEffect(() => {
    if (!apiKey || typeof EventSource === 'undefined') return;
    const es = new EventSource(`${apiUrl}/sync/events?apiKey=${encodeURIComponent(apiKey)}`);
    es.addEventListener('sync-update', () => {
      fetchOverview();
    });
    return () => es.close();
  }, [apiKey, apiUrl, fetchOverview]);

  const submitPin = useCallback(async (pinValue: string) => {
    if (!pinValue || isLoggingIn) return;
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${apiUrl}/boss/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setLoginError(json.error || 'PIN si sahihi.');
        // Kama bado hajafikisha tarakimu 6, mruhusu kuendelea kuandika
        if (pinValue.length >= 6) setPin('');
        return;
      }
      sessionStorage.setItem('boss_web_api_key', json.apiKey);
      setApiKey(json.apiKey);
      setPin('');
    } catch {
      setLoginError('Imeshindwa kuwasiliana na seva.');
    } finally {
      setIsLoggingIn(false);
    }
  }, [apiUrl, isLoggingIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPin(pin);
  };

  // PIN inajifungua yenyewe mara tu inapofika urefu kamili (4 au 6 tarakimu)
  const handlePinChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
    setLoginError(null);
    if (digits.length === 4 || digits.length === 6) {
      submitPin(digits);
    }
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salName.trim() || !salAmount) return;
    const res = await fetch(`${apiUrl}/boss/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        branchId: salBranch,
        staffName: salName.trim(),
        role: salRole,
        monthlySalary: Number(salAmount),
        phone: salPhone.trim()
      })
    });
    if (res.ok) {
      setSalName('');
      setSalAmount('');
      setSalPhone('');
      fetchOverview();
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!confirm('Futa mfanyakazi huyu kwenye orodha ya mishahara?')) return;
    await fetch(`${apiUrl}/boss/salaries/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });
    fetchOverview();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) return;
    const res = await fetch(`${apiUrl}/boss/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        branchId: expBranch,
        title: expTitle.trim(),
        category: 'boss',
        amount: Number(expAmount),
        expenseDate: expDate
      })
    });
    if (res.ok) {
      setExpTitle('');
      setExpAmount('');
      fetchOverview();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Futa matumizi haya?')) return;
    await fetch(`${apiUrl}/boss/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });
    fetchOverview();
  };

  const exportSalesCsv = () => {
    if (!data?.sales?.length) return;
    const rows = [
      ['Tarehe', 'Tawi', 'Bidhaa Zilizouzwa', 'Njia ya Malipo', 'Mteja', 'Kiasi (TZS)'],
      ...data.sales.map((s: any) => [
        formatDate(s.createdAt),
        branchLabel(s.branchId),
        (s.items || []).map((i: any) => `${i.productName} (${i.quantity})`).join(' | '),
        s.paymentMethod,
        s.customerName || '-',
        s.finalAmount
      ])
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Maduka_Simu_Mauzo_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInventory = useMemo(() => {
    const list = data?.products || [];
    return list.filter((p: any) => {
      const matchesCat =
        invCat === 'all'
          ? true
          : invCat === 'out'
          ? Number(p.stock) === 0
          : p.category === invCat;
      const q = invSearch.toLowerCase();
      const matchesSearch =
        !q ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.imei || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [data, invCat, invSearch]);

  const openNewProductModal = () => {
    setEditingProductId(null);
    setProdBranch(selectedBranch !== 'all' ? selectedBranch : 'branch_phone_1');
    setProdName('');
    setProdCategory('phone');
    setProdCondition('new');
    setProdImei('');
    setProdStorage('');
    setProdCostPrice('');
    setProdSellingPrice('');
    setProdStock('1');
    setProdMinStock('1');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: any) => {
    setEditingProductId(p.id);
    setProdBranch(p.branchId && p.branchId !== 'branch_phone' ? p.branchId : 'branch_phone_1');
    setProdName(p.name || '');
    setProdCategory((['phone', 'accessory', 'spare', 'other'].includes(p.category) ? p.category : 'phone') as any);
    setProdCondition(p.condition === 'used' ? 'used' : 'new');
    setProdImei(p.imei || '');
    setProdStorage(p.storage || '');
    setProdCostPrice(String(p.costPrice ?? ''));
    setProdSellingPrice(String(p.sellingPrice ?? ''));
    setProdStock(String(p.stock ?? 0));
    setProdMinStock(String(p.minStock ?? 1));
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodSellingPrice) return;
    const stockNum = Number(prodStock || 0);
    const minStockNum = Number(prodMinStock || 0);
    if (minStockNum > stockNum) {
      alert(`Tahadhari ya stoo chache (${minStockNum}) haiwezi kuzidi idadi ya bidhaa (${stockNum}).`);
      return;
    }
    setIsSavingProduct(true);
    try {
      const res = await fetch(`${apiUrl}/boss/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          id: editingProductId || undefined,
          branchId: prodBranch,
          name: prodName.trim(),
          category: prodCategory,
          condition: prodCondition,
          imei: prodImei.trim(),
          storage: prodStorage.trim(),
          costPrice: Number(prodCostPrice || 0),
          sellingPrice: Number(prodSellingPrice),
          stock: Number(prodStock || 0),
          minStock: Number(prodMinStock || 1)
        })
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Imeshindwa kuhifadhi bidhaa.');
        return;
      }
      setIsProductModalOpen(false);
      await fetchOverview();
    } catch {
      alert('Hitilafu ya mtandao wakati wa kuhifadhi bidhaa.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Una uhakika unataka kufuta "${name}"?`)) return;
    await fetch(`${apiUrl}/boss/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });
    fetchOverview();
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white">Ofisi ya Boss (Web)</h1>
            <p className="text-sm text-slate-400">Usimamizi wa Maduka 3 ya Simu — Mtaji, Faida & Mishahara</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm text-center font-semibold">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Weka PIN ya Boss:</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={pin}
              onChange={e => handlePinChange(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-center tracking-[0.5em] font-black text-white focus:outline-none focus:border-amber-500"
            />
            <p className="mt-2 text-[11px] text-slate-400 text-center">
              {isLoggingIn ? 'Inahakiki PIN...' : 'Itajifungua yenyewe — hakuna haja ya kubonyeza kitufe.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn || !pin}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? 'Inahakiki...' : 'Ingia Ofisi ya Boss'}
          </button>
        </form>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white">Boss Web Dashboard — Maduka ya Simu</h1>
              <p className="text-xs text-slate-400">Mtaji, Faida Halisi, Mishahara, Matumizi & Stoo (Live)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOverview}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Onyesha Upya</span>
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('boss_web_api_key');
                setApiKey('');
              }}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Toka</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-5">
        {/* Branch & Date Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          {/* Row 1: Maduka (fixed height, haihama) */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px]">
            <button
              onClick={() => setSelectedBranch('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedBranch === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Maduka Yote 3
            </button>
            {PHONE_BRANCHES.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranch(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedBranch === b.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Row 2: Tarehe (fixed height — vitufe havihami wala kushuka) */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] border-t border-slate-800 pt-2.5">
            <Calendar className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
            {[
              { id: 'today', label: 'Leo' },
              { id: 'yesterday', label: 'Jana' },
              { id: 'week', label: 'Wiki' },
              { id: 'month', label: 'Mwezi Huu' },
              { id: 'all', label: 'Zote' },
              { id: 'custom', label: 'Tarehe Maalum' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => {
                  if (d.id === 'custom') {
                    setCustomFrom(appliedCustom.from);
                    setCustomTo(appliedCustom.to);
                  }
                  setDatePreset(d.id as any);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  datePreset === d.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
            {dateRangeLabel && (
              <span className="ml-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300">
                {dateRangeLabel}
              </span>
            )}
          </div>

          {/* Row 3: Tarehe Maalum (inaonekana tu ikichaguliwa — haisukumi vitufe vingine) */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] border-t border-slate-800 pt-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Kuanzia</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <span className="text-xs text-slate-400">hadi</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <button
                type="button"
                onClick={applyCustomFilter}
                disabled={!customFrom || !customTo}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                  isCustomDirty
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-pulse'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tumia Filter</span>
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'overview', label: 'Muhtasari & Faida', icon: TrendingUp },
              { id: 'inventory', label: 'Stoo & Mtaji', icon: Package },
              { id: 'salaries', label: 'Mishahara ya Wafanyakazi', icon: Users },
              { id: 'expenses', label: 'Matumizi & Kodi', icon: Receipt },
              { id: 'sales', label: 'Orodha ya Mauzo', icon: ShoppingBag }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === t.id
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={openNewProductModal}
            className="px-4 py-2.5 rounded-2xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Bidhaa</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 space-y-1">
                <div className="text-xs font-bold text-amber-300 uppercase">Mtaji wa Stoo (Kununua)</div>
                <div className="text-2xl font-black text-white">{formatCurrency(summary.stockCapital || 0)}</div>
                <div className="text-xs text-slate-400">
                  Thamani ya Kuuza: <b className="text-amber-200">{formatCurrency(summary.stockRetailValue || 0)}</b>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900 border border-blue-500/30 space-y-1">
                <div className="text-xs font-bold text-blue-400 uppercase">Mauzo ya Duka</div>
                <div className="text-2xl font-black text-white">
                  {formatCurrency(summary.salesRevenue || 0)}
                </div>
                <div className="text-xs text-slate-400">
                  Idadi ya Mauzo: {summary.salesCount || 0}
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900 border border-rose-500/30 space-y-1">
                <div className="text-xs font-bold text-rose-400 uppercase">Mishahara & Matumizi</div>
                <div className="text-2xl font-black text-rose-300">
                  -{formatCurrency((summary.totalSalaries || 0) + (summary.totalExpenses || 0))}
                </div>
                <div className="text-xs text-slate-400">
                  Mishahara: {formatCurrency(summary.totalSalaries || 0)} • Matumizi: {formatCurrency(summary.totalExpenses || 0)}
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-1">
                <div className="text-xs font-bold text-emerald-400 uppercase">Faida Halisi (Net Profit)</div>
                <div className={`text-2xl font-black ${(summary.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(summary.netProfit || 0)}
                </div>
                <div className="text-xs text-slate-400">
                  Faida Ghafi: {formatCurrency(summary.grossProfit || 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Sales with REAL product names */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
                <h2 className="text-sm font-black text-white">Mauzo ya Hivi Karibuni</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(data?.sales || []).slice(0, 15).map((s: any) => (
                    <div key={s.id} className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                          <span className="truncate">
                            {(s.items || []).map((i: any) => `${i.productName} (${i.quantity})`).join(', ') || s.saleNumber}
                          </span>
                          {s.status === 'returned' && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                              Imerudishwa
                            </span>
                          )}
                          {s.status === 'edited' && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Imehaririwa
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {branchLabel(s.branchId)} • {formatDate(s.createdAt)} • {String(s.paymentMethod || '').toUpperCase()}
                          {s.returnNote ? ` • ${s.returnNote}` : ''}
                        </div>
                      </div>
                      <div className="font-black text-sm text-blue-400 shrink-0">{formatCurrency(s.finalAmount)}</div>
                    </div>
                  ))}
                  {(!data?.sales || data.sales.length === 0) && (
                    <p className="text-xs text-slate-400 py-6 text-center">Hakuna mauzo kwa kipindi hiki.</p>
                  )}
                </div>
              </div>

              {/* Low/Out of stock alerts */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
                <h2 className="text-sm font-black text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Bidhaa Zilizoisha au Karibu Kuisha</span>
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(data?.products || [])
                    .filter((p: any) => Number(p.stock) <= Number(p.minStock || 1))
                    .map((p: any) => (
                      <div key={p.id} className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{p.name}</div>
                          <div className="text-xs text-slate-400">
                            {branchLabel(p.branchId)} • {categoryLabel(p.category)} • Kikomo: {Number(p.minStock || 1)}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold shrink-0 whitespace-nowrap ${
                          Number(p.stock) === 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {Number(p.stock) === 0 ? 'Imeisha' : `Zimebaki ${p.stock}`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY & CAPITAL */}
        {activeTab === 'inventory' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tafuta bidhaa au IMEI..."
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Zote' },
                  { id: 'phone', label: 'Simu', icon: Smartphone },
                  { id: 'accessory', label: 'Vifaa', icon: Headphones },
                  { id: 'spare', label: 'Spea', icon: Wrench },
                  { id: 'other', label: 'Nyingine' },
                  { id: 'out', label: 'Zilizoisha' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setInvCat(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      invCat === c.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="py-2.5 pr-3">Bidhaa</th>
                    <th className="py-2.5 pr-3">Tawi</th>
                    <th className="py-2.5 pr-3">Kundi</th>
                    <th className="py-2.5 pr-3">Kununua</th>
                    <th className="py-2.5 pr-3">Kuuza</th>
                    <th className="py-2.5 pr-3">Stoo</th>
                    <th className="py-2.5 pr-3 text-right">Mtaji</th>
                    <th className="py-2.5 text-right">Vitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredInventory.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 pr-3 font-bold text-white">{p.name}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{branchLabel(p.branchId)}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{categoryLabel(p.category)}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{formatCurrency(p.costPrice)}</td>
                      <td className="py-2.5 pr-3 text-blue-400 font-bold">{formatCurrency(p.sellingPrice)}</td>
                      <td className="py-2.5 pr-3">
                        {(() => {
                          const stock = Number(p.stock || 0);
                          const minStock = Number(p.minStock || 1);
                          if (stock === 0) {
                            return (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Imeisha
                              </span>
                            );
                          }
                          if (stock <= minStock) {
                            return (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                Zimebaki {stock}
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200">
                              {stock}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-bold text-amber-300">
                        {formatCurrency(Number(p.costPrice || 0) * Number(p.stock || 0))}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEditProductModal(p)}
                          title="Hariri / Ongeza Stoo"
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15 inline-flex items-center mr-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="Futa Bidhaa"
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 inline-flex items-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF & SALARIES */}
        {activeTab === 'salaries' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <form onSubmit={handleAddSalary} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 h-fit">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Sajili Mfanyakazi / Mshahara</span>
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Duka:</label>
                <select
                  value={salBranch}
                  onChange={e => setSalBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  {PHONE_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Jina la Mfanyakazi *:</label>
                <input
                  type="text"
                  required
                  value={salName}
                  onChange={e => setSalName(e.target.value)}
                  placeholder="mfano: Juma Ramadhani"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Cheo:</label>
                  <select
                    value={salRole}
                    onChange={e => setSalRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Muuzaji">Muuzaji</option>
                    <option value="Fundi Simu">Fundi Simu</option>
                    <option value="Meneja">Meneja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Simu:</label>
                  <input
                    type="tel"
                    value={salPhone}
                    onChange={e => setSalPhone(e.target.value)}
                    placeholder="07..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mshahara wa Mwezi (TZS) *:</label>
                <input
                  type="number"
                  required
                  value={salAmount}
                  onChange={e => setSalAmount(e.target.value)}
                  placeholder="250000"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
              >
                Hifadhi Mshahara
              </button>
            </form>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white">Orodha ya Wafanyakazi & Mishahara</h2>
                <span className="text-sm font-black text-rose-400">Jumla: {formatCurrency(summary.totalSalaries || 0)}</span>
              </div>
              <div className="space-y-2">
                {(data?.salaries || []).map((s: any) => (
                  <div key={s.id} className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{s.staff_name} <span className="text-xs text-amber-300">({s.role})</span></div>
                      <div className="text-xs text-slate-400">{branchLabel(s.branch_id)} {s.phone ? `• ${s.phone}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-white">{formatCurrency(s.monthly_salary)}</span>
                      <button
                        onClick={() => handleDeleteSalary(s.id)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!data?.salaries || data.salaries.length === 0) && (
                  <p className="text-xs text-slate-400 py-8 text-center">Bado hujasajili mishahara ya wafanyakazi.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXPENSES (BOSS CAN RECORD HIS OWN LIKE RENT + VIEW ALL OFFICE EXPENSES) */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <form onSubmit={handleAddExpense} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 h-fit">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                <span>Andika Matumizi ya Boss</span>
              </h2>
              <p className="text-xs text-slate-400">Mfano: Kodi ya fremu, leseni, au gharama yoyote unayolipa mwenyewe.</p>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Duka:</label>
                <select
                  value={expBranch}
                  onChange={e => setExpBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  {PHONE_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Andika Matumizi *:</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="Andika hapa (mfano: Kodi ya Fremu Novemba)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tarehe:</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kiasi (TZS) *:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm"
              >
                Hifadhi Matumizi
              </button>
            </form>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-black text-white">Matumizi Yote (Boss & Ofisini)</h2>
                  <p className="text-xs text-slate-400">Yaliyowekwa na Boss pamoja na yaliyorekodiwa na wafanyakazi ofisini.</p>
                </div>
                <span className="text-sm font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                  Jumla: {formatCurrency(summary.totalExpenses || 0)}
                </span>
              </div>
              <div className="space-y-2">
                {(data?.expenses || []).map((e: any) => (
                  <div key={e.id} className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{e.title}</div>
                      <div className="text-xs text-slate-400">
                        {branchLabel(e.branchId || e.branch_id)} • {formatDate(e.createdAt || e.expense_date)}
                        {e.recordedBy ? ` • Aliyeweka: ${e.recordedBy}` : ''}
                      </div>
                      {e.notes && <div className="text-xs text-slate-500 mt-0.5 truncate">{e.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-sm text-rose-300">-{formatCurrency(e.amount)}</span>
                      {e.source === 'boss' && (
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          title="Futa"
                          className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(!data?.expenses || data.expenses.length === 0) && (
                  <p className="text-xs text-slate-400 py-8 text-center">Hakuna matumizi yaliyorekodiwa kwa kipindi hiki.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SALES & REPAIRS */}
        {activeTab === 'sales' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-white">Orodha Kamili ya Mauzo ({data?.sales?.length || 0})</h2>
              <button
                onClick={exportSalesCsv}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Pakua Excel (CSV)</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="py-2.5 pr-3">Tarehe</th>
                    <th className="py-2.5 pr-3">Tawi</th>
                    <th className="py-2.5 pr-3">Bidhaa Zilizouzwa</th>
                    <th className="py-2.5 pr-3">Malipo</th>
                    <th className="py-2.5 text-right">Jumla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(data?.sales || []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{branchLabel(s.branchId)}</td>
                      <td className="py-2.5 pr-3 font-bold text-white">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{(s.items || []).map((i: any) => `${i.productName} (${i.quantity})`).join(', ') || s.saleNumber}</span>
                          {s.status === 'returned' && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Imerudishwa
                            </span>
                          )}
                          {s.status === 'edited' && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Imehaririwa
                            </span>
                          )}
                        </div>
                        {s.returnNote && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{s.returnNote}</div>}
                      </td>
                      <td className="py-2.5 pr-3 uppercase text-xs text-slate-300">{s.paymentMethod}</td>
                      <td className="py-2.5 text-right font-black text-blue-400">{formatCurrency(s.finalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingProductId ? 'Hariri Bidhaa / Ongeza Stoo' : 'Ongeza Bidhaa Mpya'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Duka / Tawi</label>
                <select
                  value={prodBranch}
                  onChange={e => setProdBranch(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  {PHONE_BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kundi (Category)</label>
                <select
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="phone">Simu</option>
                  <option value="accessory">Vifaa (Accessories)</option>
                  <option value="spare">Spea</option>
                  <option value="other">Nyingine</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Jina la Bidhaa *</label>
              <input
                type="text"
                required
                placeholder="Mfano: Samsung A15 / Charger Original"
                value={prodName}
                onChange={e => setProdName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Hali</label>
                <select
                  value={prodCondition}
                  onChange={e => setProdCondition(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="new">Mpya</option>
                  <option value="used">Mtumba (Used)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Storage (Hiari)</label>
                <select
                  value={prodStorage}
                  onChange={e => setProdStorage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="">-- Chagua --</option>
                  {STORAGE_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {prodStorage && !STORAGE_OPTIONS.includes(prodStorage) && (
                    <option value={prodStorage}>{prodStorage}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">IMEI (Hiari)</label>
                <input
                  type="text"
                  placeholder="IMEI..."
                  value={prodImei}
                  onChange={e => setProdImei(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bei ya Kununua / Mtaji (TZS)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="250000"
                  value={prodCostPrice}
                  onChange={e => setProdCostPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bei ya Kuuza (TZS) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="320000"
                  value={prodSellingPrice}
                  onChange={e => setProdSellingPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            {/* Faida papo hapo chini ya bei */}
            <div
              className={`rounded-2xl border p-3 space-y-1.5 ${
                !prodProfit.ready
                  ? 'bg-slate-800/50 border-slate-700'
                  : prodProfit.unit >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-rose-500/10 border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className={`w-3.5 h-3.5 ${prodProfit.ready && prodProfit.unit < 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                  <span>Faida kwa Bidhaa Moja</span>
                </span>
                <span
                  className={`text-base font-black ${
                    !prodProfit.ready
                      ? 'text-slate-400'
                      : prodProfit.unit >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {!prodProfit.ready
                    ? '—'
                    : `${prodProfit.unit < 0 ? '-' : ''}${formatCurrency(Math.abs(prodProfit.unit))}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>
                  Margin:{' '}
                  <b className={prodProfit.ready && prodProfit.unit < 0 ? 'text-rose-300' : 'text-emerald-300'}>
                    {prodProfit.ready ? `${prodProfit.margin.toFixed(1)}%` : '—'}
                  </b>
                </span>
                <span>
                  Faida ya Stoo ({prodProfit.qty || 0} pcs):{' '}
                  <b className={prodProfit.ready && prodProfit.total < 0 ? 'text-rose-300' : 'text-emerald-300'}>
                    {prodProfit.ready
                      ? `${prodProfit.total < 0 ? '-' : ''}${formatCurrency(Math.abs(prodProfit.total))}`
                      : '—'}
                  </b>
                </span>
              </div>
              {!prodProfit.ready && (
                <p className="text-[11px] text-amber-300">
                  Jaza bei ya kununua na bei ya kuuza — faida itaonekana hapa papo hapo.
                </p>
              )}
              {prodProfit.ready && prodProfit.unit < 0 && (
                <p className="text-[11px] text-rose-300 font-bold">
                  Onyo: unauza kwa hasara (bei ya kuuza iko chini ya mtaji).
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Idadi / Stoo</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={prodStock}
                  onChange={e => setProdStock(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tahadhari Stoo Chache</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, Number(prodStock || 0))}
                  value={prodMinStock}
                  onChange={e => setProdMinStock(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Ghairi
              </button>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black disabled:opacity-60"
              >
                {isSavingProduct ? 'Inahifadhi...' : editingProductId ? 'Sasisha Bidhaa' : 'Hifadhi Bidhaa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
