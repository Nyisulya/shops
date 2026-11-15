import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, 
  Printer, 
  Edit3,
  RotateCcw,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { db, queueSync } from '../../db/dexie';
import type { Sale, SaleItem } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';
import { triggerBackgroundSync } from '../../services/syncService';
import { SHOPS } from '../Auth/PinLogin';

interface PhoneHistoryProps {
  onOpenReceipt: (data: any) => void;
}

export const PhoneHistory: React.FC<PhoneHistoryProps> = ({ onOpenReceipt }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const activeBranchId = localStorage.getItem('active_branch_id') || 'branch_phone_1';

  // Edit / Return Modal State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState('0');
  const [returnNote, setReturnNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const sales = useLiveQuery(
    async () => {
      const all = await db.sales.where('branchId').equals(activeBranchId).reverse().sortBy('createdAt');
      return all.filter(s => {
        const matchesSearch = s.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (s.customerPhone && s.customerPhone.includes(searchQuery)) ||
                              s.items.some(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      });
    },
    [searchQuery, activeBranchId]
  );

  const totalSalesAmount = sales?.reduce((sum, s) => sum + s.finalAmount, 0) || 0;
  const totalSalesCount = sales?.length || 0;

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditItems(sale.items.map(it => ({ ...it })));
    setEditDiscount(String(sale.discount || 0));
    setReturnNote(sale.returnNote || '');
  };

  const updateEditItemQty = (index: number, delta: number) => {
    setEditItems(prev =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const nextQty = Math.max(0, it.quantity + delta);
        return {
          ...it,
          quantity: nextQty,
          totalPrice: nextQty * it.unitPrice
        };
      })
    );
  };

  const updateEditItemPrice = (index: number, newPrice: number) => {
    const safePrice = Math.max(0, newPrice || 0);
    setEditItems(prev =>
      prev.map((it, i) =>
        i === index ? { ...it, unitPrice: safePrice, totalPrice: it.quantity * safePrice } : it
      )
    );
  };

  const applySaleEdit = async (forceFullReturn = false) => {
    if (!editingSale) return;
    setIsSavingEdit(true);
    try {
      const now = new Date().toISOString();
      const targetItems = forceFullReturn
        ? []
        : editItems.filter(it => it.quantity > 0);

      // Compute stock differences per productId (positive = returned to stock, negative = extra sold)
      const oldQtyByProd = new Map<string, number>();
      for (const it of editingSale.items) {
        oldQtyByProd.set(it.productId, (oldQtyByProd.get(it.productId) || 0) + it.quantity);
      }
      const newQtyByProd = new Map<string, number>();
      for (const it of targetItems) {
        newQtyByProd.set(it.productId, (newQtyByProd.get(it.productId) || 0) + it.quantity);
      }

      const allProdIds = new Set([...oldQtyByProd.keys(), ...newQtyByProd.keys()]);
      await db.transaction('rw', [db.products, db.sales, db.syncQueue], async () => {
        for (const prodId of allProdIds) {
          const oldQ = oldQtyByProd.get(prodId) || 0;
          const newQ = newQtyByProd.get(prodId) || 0;
          const returnedQty = oldQ - newQ; // > 0 means returned to stock
          if (returnedQty !== 0) {
            const prod = await db.products.get(prodId);
            if (prod) {
              const updatedProd = {
                ...prod,
                stock: Math.max(0, Number(prod.stock || 0) + returnedQty),
                updatedAt: now,
                isSynced: false
              };
              await db.products.put(updatedProd);
              await queueSync('products', prodId, 'update', updatedProd);
            }
          }
        }

        const newTotal = targetItems.reduce((sum, it) => sum + it.totalPrice, 0);
        const discountVal = forceFullReturn ? 0 : Math.min(newTotal, Math.max(0, Number(editDiscount || 0)));
        const newFinal = Math.max(0, newTotal - discountVal);
        const isFullReturn = targetItems.length === 0;

        const updatedSale: Sale = {
          ...editingSale,
          items: isFullReturn ? editingSale.items.map(it => ({ ...it, quantity: 0, totalPrice: 0 })) : targetItems,
          totalAmount: newTotal,
          discount: discountVal,
          finalAmount: newFinal,
          status: isFullReturn ? 'returned' : 'edited',
          editedAt: now,
          returnNote: returnNote.trim() || (isFullReturn ? 'Mteja amerudisha mzigo wote' : 'Imerekebishwa na muuzaji'),
          isSynced: false
        };

        await db.sales.put(updatedSale);
        await queueSync('sales', editingSale.id, 'update', updatedSale);
      });

      setEditingSale(null);
      triggerBackgroundSync();
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReprint = (sale: Sale) => {
    const shop = SHOPS.find(s => s.id === sale.branchId || s.id === activeBranchId);
    onOpenReceipt({
      type: 'phone_sale',
      title: 'Risiti ya Mauzo (Sales Receipt)',
      branchName: shop?.name || 'Duka la Simu & Vifaa',
      branchPhone: '+255 712 345 678',
      branchLocation: shop?.sub || 'Mwanza Branch',
      receiptNumber: sale.saleNumber,
      createdAt: sale.createdAt,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      items: sale.items.map(i => ({
        name: i.productName,
        qty: i.quantity,
        price: i.unitPrice,
        total: i.totalPrice,
        imei: i.imei
      })),
      totalAmount: sale.totalAmount,
      discount: sale.discount,
      paidAmount: sale.finalAmount,
      paymentMethod: sale.paymentMethod,
      cashierName: sale.cashierName
    });
  };

  const editSubTotal = editItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const editFinalPreview = Math.max(0, editSubTotal - Math.max(0, Number(editDiscount || 0)));

  return (
    <div className="space-y-3 pb-24">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/40 p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-xs text-blue-300 font-bold uppercase">Jumla ya Mauzo Leo</div>
          <div className="text-lg font-black text-white">{formatCurrency(totalSalesAmount)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-bold uppercase">Miamala</div>
          <div className="text-base font-extrabold text-blue-400">{totalSalesCount} risiti</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tafuta namba ya risiti, bidhaa au mteja..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Sales List */}
      <div className="space-y-2.5">
        {sales?.map(sale => (
          <div 
            key={sale.id}
            className={`p-3.5 bg-slate-800/80 border rounded-2xl space-y-2 transition-all shadow-sm ${
              sale.status === 'returned'
                ? 'border-rose-500/40'
                : sale.status === 'edited'
                ? 'border-amber-500/40'
                : 'border-slate-700/70 hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-xs text-blue-400 font-mono">{sale.saleNumber}</span>
                  <span className="text-xs text-slate-400">{formatDate(sale.createdAt)}</span>
                  {sale.status === 'returned' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Imerudishwa
                    </span>
                  )}
                  {sale.status === 'edited' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Imehaririwa
                    </span>
                  )}
                </div>
                {sale.customerName && (
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    Mteja: {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                  </div>
                )}
                {sale.returnNote && (
                  <div className="text-[11px] text-amber-300/90 mt-0.5">Sababu: {sale.returnNote}</div>
                )}
              </div>

              <div className="text-right">
                <div className={`text-sm font-black ${sale.status === 'returned' ? 'text-rose-400 line-through' : 'text-slate-100'}`}>
                  {formatCurrency(sale.finalAmount)}
                </div>
                <div className="text-xs uppercase font-bold text-slate-400">
                  {sale.paymentMethod}
                </div>
              </div>
            </div>

            {/* Items summary */}
            <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1 text-xs">
              {sale.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span className="truncate max-w-[200px]">{it.quantity}x {it.productName}</span>
                  <span className="text-slate-400">{formatCurrency(it.totalPrice)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
              <span className={`text-xs px-2 py-0.5 rounded-md ${
                sale.isSynced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {sale.isSynced ? 'Synced mtandaoni' : 'Inasubiri sync'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(sale)}
                  className="py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Hariri / Rudisha</span>
                </button>
                <button
                  onClick={() => handleReprint(sale)}
                  className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Risiti</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {sales && sales.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            Hakuna mauzo yaliyorekodiwa bado.
          </div>
        )}
      </div>

      {/* Edit Sold Items / Customer Return Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">Hariri / Rudisha Bidhaa</h3>
                <p className="text-xs text-slate-400 font-mono">{editingSale.saleNumber}</p>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {editItems.map((it, idx) => {
                const origQty = editingSale.items[idx]?.quantity || 0;
                const returned = Math.max(0, origQty - it.quantity);
                return (
                  <div key={`${it.productId}-${idx}`} className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{it.productName}</div>
                        <div className="text-[11px] text-slate-400">Awali: {origQty} pcs</div>
                      </div>
                      {returned > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-300 shrink-0">
                          +{returned} itarudi stoo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateEditItemQty(idx, -1)}
                          className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-black text-white">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateEditItemQty(idx, 1)}
                          className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Bei:</span>
                        <input
                          type="number"
                          min={0}
                          value={it.unitPrice}
                          onChange={e => updateEditItemPrice(idx, Number(e.target.value))}
                          className="w-28 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white text-right"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Punguzo (TZS)</label>
                <input
                  type="number"
                  min={0}
                  value={editDiscount}
                  onChange={e => setEditDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
                />
              </div>
              <div className="p-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Jumla Mpya</div>
                <div className="text-sm font-black text-blue-400">{formatCurrency(editFinalPreview)}</div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Sababu (Boss ataiona)</label>
              <input
                type="text"
                placeholder="Mfano: Mteja amerudisha simu / kabadilisha"
                value={returnNote}
                onChange={e => setReturnNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => applySaleEdit(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-black flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rudisha Yote Stoo</span>
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => applySaleEdit(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black disabled:opacity-60"
              >
                {isSavingEdit ? 'Inahifadhi...' : 'Hifadhi Marekebisho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
