import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  TrendingUp, 
  Smartphone, 
  Headphones, 
  Wrench, 
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { Product, ProductCategory } from '../../types';
import { formatCurrency } from '../../services/receiptService';

export const PHONE_BRANCHES = [
  { id: 'branch_phone_1', name: 'Soko Kuu', fullName: 'Duka la Soko Kuu (PH-01)' },
  { id: 'branch_phone_2', name: 'Vunja Bei', fullName: 'Duka la Vunja Bei (PH-02)' },
  { id: 'branch_phone_3', name: 'Makoroboi', fullName: 'Duka la Makoroboi (PH-03)' },
];

export const BossInventoryControl: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [targetBranchId, setTargetBranchId] = useState<string>('branch_phone_1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('phone');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [imei, setImei] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(1);
  const [minStock, setMinStock] = useState<number | ''>(1);
  const [warrantyMonths, setWarrantyMonths] = useState<number | ''>(12);

  const products = useLiveQuery(
    async () => {
      const all = await db.products.toArray();
      const phoneProds = all.filter(p => {
        const isPhone = p.branchId.startsWith('branch_phone');
        if (!isPhone) return false;
        if (selectedBranch === 'all') return true;
        if (selectedBranch === 'branch_phone_1') return p.branchId === 'branch_phone_1' || p.branchId === 'branch_phone';
        return p.branchId === selectedBranch;
      });
      return phoneProds.filter(p => {
        const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.imei && p.imei.includes(searchQuery)) ||
                              (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCat && matchesSearch;
      });
    },
    [searchQuery, categoryFilter, selectedBranch]
  );

  const handleOpenAddModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setTargetBranchId(prod.branchId === 'branch_phone' ? 'branch_phone_1' : prod.branchId);
      setName(prod.name);
      setCategory(prod.category);
      setModel(prod.model || '');
      setStorage(prod.storage || '128GB');
      setCondition(prod.condition || 'new');
      setImei(prod.imei || '');
      setCostPrice(prod.costPrice);
      setSellingPrice(prod.sellingPrice);
      setStock(prod.stock);
      setMinStock(prod.minStock);
      setWarrantyMonths(prod.warrantyMonths || '');
    } else {
      setEditingProduct(null);
      setTargetBranchId(selectedBranch !== 'all' ? selectedBranch : 'branch_phone_1');
      setName('');
      setCategory('phone');
      setModel('');
      setStorage('128GB');
      setCondition('new');
      setImei('');
      setCostPrice('');
      setSellingPrice('');
      setStock(1);
      setMinStock(1);
      setWarrantyMonths(12);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice || !costPrice) {
      alert('Tafadhali jaza jina la bidhaa, bei ya kununua na bei ya kuuza.');
      return;
    }

    try {
      if (editingProduct) {
        // Update product
        const updated: Partial<Product> = {
          branchId: targetBranchId,
          name: name.trim(),
          category,
          model: model.trim() || undefined,
          storage: category === 'phone' ? storage : undefined,
          condition: category === 'phone' ? condition : undefined,
          imei: category === 'phone' ? imei.trim() || undefined : undefined,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 1,
          warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
          updatedAt: new Date().toISOString(),
          isSynced: false
        };

        await db.products.update(editingProduct.id, updated);
        await queueSync('products', editingProduct.id, 'update', updated);
      } else {
        // Create new product
        const newId = generateUniqueId('prod');
        const newProd: Product = {
          id: newId,
          branchId: targetBranchId,
          name: name.trim(),
          category,
          model: model.trim() || undefined,
          storage: category === 'phone' ? storage : undefined,
          condition: category === 'phone' ? condition : undefined,
          imei: category === 'phone' ? imei.trim() || undefined : undefined,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 1,
          warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
          updatedAt: new Date().toISOString(),
          isSynced: false
        };

        await db.products.put(newProd);
        await queueSync('products', newId, 'create', newProd);
      }

      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Imeshindwa kuhifadhi bidhaa.');
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (confirm(`Ukiwa kama Boss, je, una uhakika unataka kufuta bidhaa "${prodName}" kwenye stoo kabisa?`)) {
      await db.products.delete(id);
      await queueSync('products', id, 'delete', { id });
    }
  };

  // Quick stats
  const totalStockValuation = products?.reduce((sum, p) => sum + p.costPrice * p.stock, 0) || 0;
  const potentialRevenue = products?.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0) || 0;
  const potentialProfit = potentialRevenue - totalStockValuation;
  const totalItemsCount = products?.reduce((sum, p) => sum + p.stock, 0) || 0;
  const lowStockCount = products?.filter(p => p.stock <= p.minStock && p.stock > 0).length || 0;

  return (
    <div className="space-y-3 pb-28">
      
      {/* Header & Stats */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Usimamizi wa Stoo & Bei (Boss Only)</h2>
              <div className="text-[10px] text-slate-400">Ongeza bidhaa, rekebisha bei na faida kwa asilimia</div>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="py-2 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Ongeza Bidhaa</span>
          </button>
        </div>

        {/* Valuation Summary Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Mtaji wa Stoo</div>
            <div className="text-xs font-black text-slate-100 mt-0.5 truncate">{formatCurrency(totalStockValuation)}</div>
            <div className="text-[9px] text-slate-400">{totalItemsCount} pcs stoo</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] text-blue-400 font-bold uppercase">Thamani ya Kuuza</div>
            <div className="text-xs font-black text-blue-300 mt-0.5 truncate">{formatCurrency(potentialRevenue)}</div>
            <div className="text-[9px] text-slate-400">Mauzo yakikamilika</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Matarajio ya Faida</div>
            <div className="text-xs font-black text-emerald-300 mt-0.5 truncate">+{formatCurrency(potentialProfit)}</div>
            <div className="text-[9px] text-emerald-400 font-bold">Faida ghafi</div>
          </div>
        </div>
      </div>

      {/* Action Bar: Search & Category filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta jina la bidhaa, model au IMEI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Branches (3 Phone Shops) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedBranch('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedBranch === 'all'
                ? 'bg-blue-600 text-white shadow-md font-extrabold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
            }`}
          >
            Maduka Yote ya Simu (3)
          </button>
          {PHONE_BRANCHES.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedBranch === b.id
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Zote' },
            { id: 'phone', label: 'Simu Tu' },
            { id: 'accessory', label: 'Vifaa (Accessories)' },
            { id: 'spare', label: 'Spea & Matengenezo' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === c.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items List with Boss Edit / Delete Controls */}
      <div className="space-y-2">
        {products?.map(prod => {
          const profitPerUnit = prod.sellingPrice - prod.costPrice;
          const marginPct = prod.costPrice > 0 ? Math.round((profitPerUnit / prod.costPrice) * 100) : 0;
          const isLow = prod.stock <= prod.minStock && prod.stock > 0;
          const isOut = prod.stock === 0;

          return (
            <div 
              key={prod.id}
              className="p-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-2 hover:border-slate-600 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    prod.category === 'phone' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : prod.category === 'accessory' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {prod.category === 'phone' ? <Smartphone className="w-4 h-4" /> : prod.category === 'accessory' ? <Headphones className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-100 truncate">{prod.name}</div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 mt-0.5">
                      <span>Kununua: <b className="text-slate-300">{formatCurrency(prod.costPrice)}</b></span>
                      <span>Kuuza: <b className="text-blue-400">{formatCurrency(prod.sellingPrice)}</b></span>
                      <span className="text-emerald-400 font-bold">Faida: +{formatCurrency(profitPerUnit)} ({marginPct}%)</span>
                    </div>
                    <div className="text-[9px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        {prod.branchId === 'branch_phone_2' ? '📍 Vunja Bei' : prod.branchId === 'branch_phone_3' ? '📍 Makoroboi' : '📍 Soko Kuu'}
                      </span>
                      {prod.imei && (
                        <span className="font-mono">IMEI: {prod.imei}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Tag */}
                <div className="text-right shrink-0">
                  <div className={`text-xs font-extrabold px-2 py-0.5 rounded-lg inline-block ${
                    isOut 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : isLow 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {prod.stock} {prod.stock === 1 ? 'pc' : 'pcs'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Min: {prod.minStock}</div>
                </div>
              </div>

              {/* Action Buttons for Boss */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/60 text-xs">
                <span className="text-[10px] text-slate-400">
                  Thamani ya stoo: <b className="text-slate-200">{formatCurrency(prod.costPrice * prod.stock)}</b>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenAddModal(prod)}
                    className="py-1 px-2.5 bg-slate-700 hover:bg-slate-650 text-slate-200 rounded-lg flex items-center gap-1 font-semibold text-xs active:scale-95"
                    title="Hariri Taarifa / Bei / Stoo"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hariri Bei</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 rounded-lg active:scale-95 transition-all"
                    title="Futa Bidhaa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                {editingProduct ? 'Hariri Bidhaa na Bei (Boss)' : 'Ongeza Bidhaa Mpya Stoo (Boss)'}
              </span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Target Phone Branch Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Duka Linalowekwa Bidhaa Hii *:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PHONE_BRANCHES.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setTargetBranchId(b.id)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center text-center transition-all ${
                        targetBranchId === b.id
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/30 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Aina ya Bidhaa:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'phone', label: 'Simu', icon: Smartphone },
                    { id: 'accessory', label: 'Kifaa (Accessory)', icon: Headphones },
                    { id: 'spare', label: 'Spea / Repair', icon: Wrench },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        category === c.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <c.icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Jina la Bidhaa *:</label>
                <input
                  type="text"
                  required
                  placeholder="mfano: Samsung A15 au Oraimo Fast Charger 20W"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Phone Specific fields */}
              {category === 'phone' && (
                <div className="p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Model / Aina:</label>
                      <input
                        type="text"
                        placeholder="Galaxy A15"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Ukubwa (Storage):</label>
                      <select
                        value={storage}
                        onChange={e => setStorage(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Simu ya Tochi (N/A)">Simu ya Tochi / Kawaida (N/A)</option>
                        <option value="16MB / 32MB">16MB / 32MB</option>
                        <option value="16GB">16GB</option>
                        <option value="32GB">32GB</option>
                        <option value="64GB">64GB</option>
                        <option value="128GB">128GB</option>
                        <option value="256GB">256GB</option>
                        <option value="512GB">512GB</option>
                        <option value="1TB">1TB</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Namba ya IMEI (Hiari):</label>
                    <input
                      type="text"
                      placeholder="15-digit IMEI ya simu"
                      value={imei}
                      onChange={e => setImei(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Hali:</label>
                      <select
                        value={condition}
                        onChange={e => setCondition(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                      >
                        <option value="new">Mpya (Brand New)</option>
                        <option value="used">Iliyotumika (Used / Ex-UK)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Warranty (Miezi):</label>
                      <input
                        type="number"
                        placeholder="12"
                        value={warrantyMonths}
                        onChange={e => setWarrantyMonths(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Bei ya Kununua (Cost TZS) *:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="380,000"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Bei ya Kuuza (Selling TZS) *:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="430,000"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Preview */}
              {costPrice !== '' && sellingPrice !== '' && Number(costPrice) > 0 && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-300">Faida kwa Kila Kimoja:</span>
                  <span className="text-emerald-400 font-black">
                    +{formatCurrency(Number(sellingPrice) - Number(costPrice))} ({Math.round(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100)}% Markup)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Idadi ya Stoo (Stock):</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tahadhari ya Kuisha (Min):</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Sasisha Bidhaa' : 'Hifadhi Bidhaa Kwenye Stoo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
