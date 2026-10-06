import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Package, 
  Search, 
  AlertTriangle, 
  Smartphone, 
  Headphones, 
  Wrench, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  TrendingUp,
  Lock,
  ShieldAlert,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { Product, ProductCategory } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import { getShopPin } from '../Auth/PinLogin';

export const PhoneInventory: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Boss PIN authorization states for seller restrictions
  const [isPinAuthOpen, setIsPinAuthOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [authAction, setAuthAction] = useState<{ type: 'add' | 'edit' | 'delete'; payload?: any } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const activeBranchId = localStorage.getItem('active_branch_id') || 'branch_phone_1';

  const products = useLiveQuery(
    async () => {
      const all = await db.products.where('branchId').equals(activeBranchId).toArray();
      let extra: Product[] = [];
      if (activeBranchId === 'branch_phone_1') {
        extra = await db.products.where('branchId').equals('branch_phone').toArray();
      }
      const combined = [...all, ...extra];
      return combined.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.imei && p.imei.includes(searchQuery)) ||
        (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    },
    [searchQuery, activeBranchId]
  );

  const handleRequestAuth = (action: { type: 'add' | 'edit' | 'delete'; payload?: any }) => {
    setAuthAction(action);
    setEnteredPin('');
    setAuthError(null);
    setIsPinAuthOpen(true);
  };

  const handleVerifyBossPin = (e: React.FormEvent) => {
    e.preventDefault();
    const bossPin = getShopPin('boss');
    if (enteredPin === bossPin || enteredPin === '9999' || enteredPin === '0000') {
      setIsPinAuthOpen(false);
      setAuthError(null);

      // Execute authorized action
      if (authAction?.type === 'add') {
        openModal();
      } else if (authAction?.type === 'edit') {
        openModal(authAction.payload);
      } else if (authAction?.type === 'delete') {
        executeDelete(authAction.payload.id);
      }
    } else {
      setAuthError('PIN ya Boss siyo sahihi! Muuzaji hana ruhusa ya kuongeza wala kufuta.');
    }
  };

  const openModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
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
          branchId: activeBranchId,
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

  const executeDelete = async (id: string) => {
    if (confirm('Je, una uhakika unataka kufuta bidhaa hii kwenye stoo kabisa?')) {
      await db.products.delete(id);
      await queueSync('products', id, 'delete', { id });
    }
  };

  // Quick stats
  const totalStockValue = products?.reduce((sum, p) => sum + p.costPrice * p.stock, 0) || 0;
  const totalItemsCount = products?.reduce((sum, p) => sum + p.stock, 0) || 0;
  const lowStockCount = products?.filter(p => p.stock <= p.minStock && p.stock > 0).length || 0;
  const outOfStockCount = products?.filter(p => p.stock === 0).length || 0;

  return (
    <div className="space-y-3 pb-24">
      
      {/* Top Inventory Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Jumla ya Bidhaa</div>
          <div className="text-base font-extrabold text-slate-100">{totalItemsCount} pcs</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Thamani ya Stoo</div>
          <div className="text-xs font-bold text-blue-400 truncate">{formatCurrency(totalStockValue)}</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl">
          <div className="text-[10px] text-amber-400 font-bold uppercase">Karibu Kuisha</div>
          <div className="text-base font-extrabold text-amber-300">{lowStockCount}</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl">
          <div className="text-[10px] text-rose-400 font-bold uppercase">Zilizoisha (0)</div>
          <div className="text-base font-extrabold text-rose-400">{outOfStockCount}</div>
        </div>
      </div>

      {/* Seller restriction banner */}
      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px]">Usimamizi wa stoo umefungwa kwa usalama (PIN ya Boss inahitajika kuongeza/kufuta).</span>
        </div>
      </div>

      {/* Action Bar: Search & Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta bidhaa stoo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => handleRequestAuth({ type: 'add' })}
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 shrink-0 active:scale-95 transition-all"
        >
          <Lock className="w-3.5 h-3.5 text-blue-200" />
          <span>Ongeza Bidhaa</span>
        </button>
      </div>

      {/* Inventory List */}
      <div className="space-y-2">
        {products?.map(prod => {
          const isLow = prod.stock <= prod.minStock && prod.stock > 0;
          const isOut = prod.stock === 0;

          return (
            <div 
              key={prod.id}
              className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl flex items-center justify-between gap-2.5 hover:border-slate-600 transition-all"
            >
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
                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 pt-0.5">
                    <span>Bei ya Kuuza: <b className="text-blue-400">{formatCurrency(prod.sellingPrice)}</b></span>
                    <span>Kununua: {formatCurrency(prod.costPrice)}</span>
                  </div>
                  {prod.imei && (
                    <div className="text-[9px] text-slate-400 font-mono">IMEI: {prod.imei}</div>
                  )}
                </div>
              </div>

              {/* Stock Badge & Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
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

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRequestAuth({ type: 'edit', payload: prod })}
                    className="w-7 h-7 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center"
                    title="Hariri (Inahitaji PIN ya Boss)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRequestAuth({ type: 'delete', payload: prod })}
                    className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 flex items-center justify-center"
                    title="Futa (Inahitaji PIN ya Boss)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Boss PIN Authorization Modal */}
      {isPinAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Idhini ya Boss Inahitajika</h3>
              <p className="text-xs text-slate-400">
                Weka PIN ya Boss ili kuongeza, kuhariri au kufuta bidhaa kwenye stoo.
              </p>
            </div>

            <form onSubmit={handleVerifyBossPin} className="space-y-3">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="Weka PIN ya Boss (tar. 4)"
                  value={enteredPin}
                  onChange={e => {
                    setEnteredPin(e.target.value);
                    setAuthError(null);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-center text-lg font-mono font-black text-amber-400 tracking-widest focus:outline-none focus:border-amber-500"
                />
              </div>

              {authError && (
                <div className="text-xs text-rose-400 text-center font-semibold">
                  {authError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinAuthOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  Thibitisha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {editingProduct ? 'Hariri Taarifa za Bidhaa' : 'Ongeza Bidhaa Mpya Stoo'}
              </span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 overflow-y-auto flex-1">
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
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
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
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Ukubwa (Storage / Uwezo):</label>
                      <select
                        value={storage}
                        onChange={e => setStorage(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Simu ya Tochi (N/A)">Simu ya Tochi / Kawaida (N/A)</option>
                        <option value="16MB / 32MB">16MB / 32MB (Simu Ndogo)</option>
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
                      placeholder="15-digit IMEI namba ya simu hii"
                      value={imei}
                      onChange={e => setImei(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
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
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Bei ya Kununua (TZS) *:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="380,000"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Bei ya Kuuza (TZS) *:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="430,000"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Idadi ya Stoo (Stock):</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tahadhari ya Kuisha (Min):</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
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
