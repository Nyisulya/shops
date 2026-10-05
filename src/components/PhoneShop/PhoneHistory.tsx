import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  History, 
  Search, 
  Printer, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { db, queueSync } from '../../db/dexie';
import type { Sale } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';

interface PhoneHistoryProps {
  onOpenReceipt: (data: any) => void;
}

export const PhoneHistory: React.FC<PhoneHistoryProps> = ({ onOpenReceipt }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sales = useLiveQuery(
    async () => {
      const all = await db.sales.where('branchId').equals('branch_phone').reverse().sortBy('createdAt');
      return all.filter(s => {
        const matchesSearch = s.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (s.customerPhone && s.customerPhone.includes(searchQuery)) ||
                              s.items.some(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      });
    },
    [searchQuery]
  );

  const totalSalesAmount = sales?.reduce((sum, s) => sum + s.finalAmount, 0) || 0;
  const totalSalesCount = sales?.length || 0;

  const handleReprint = (sale: Sale) => {
    onOpenReceipt({
      type: 'phone_sale',
      title: 'Risiti ya Mauzo (Sales Receipt)',
      branchName: 'Duka la Simu & Vifaa',
      branchPhone: '+255 712 345 678',
      branchLocation: 'Mwenge / Mlimani City Branch',
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

  return (
    <div className="space-y-3 pb-24">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/40 p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-[10px] text-blue-300 font-bold uppercase">Jumla ya Mauzo Leo</div>
          <div className="text-lg font-black text-white">{formatCurrency(totalSalesAmount)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Miamala</div>
          <div className="text-base font-extrabold text-blue-400">{totalSalesCount} risiti</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tafuta namba ya risiti au mteja..."
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
            className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2 hover:border-slate-600 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-blue-400 font-mono">{sale.saleNumber}</span>
                  <span className="text-[10px] text-slate-400">{formatDate(sale.createdAt)}</span>
                </div>
                {sale.customerName && (
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    Mteja: {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-slate-100">{formatCurrency(sale.finalAmount)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">
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
            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                sale.isSynced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {sale.isSynced ? 'Synced mtandaoni' : 'Inasubiri sync ya jioni'}
              </span>

              <button
                onClick={() => handleReprint(sale)}
                className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Toa Risiti</span>
              </button>
            </div>
          </div>
        ))}

        {sales && sales.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            Hakuna mauzo yaliyorekodiwa bado.
          </div>
        )}
      </div>
    </div>
  );
};
