import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Users, 
  Search, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { LaundryOrder } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';

interface LaundryHistoryProps {
  onOpenReceipt: (data: any) => void;
}

export const LaundryHistory: React.FC<LaundryHistoryProps> = ({ onOpenReceipt }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBalance, setFilterBalance] = useState<boolean>(false);

  const orders = useLiveQuery(
    async () => {
      const all = await db.laundryOrders.where('branchId').equals('branch_laundry').reverse().sortBy('createdAt');
      return all.filter(o => {
        const matchesBalance = !filterBalance || o.balanceDue > 0;
        const matchesSearch = o.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.customerPhone.includes(searchQuery);
        return matchesBalance && matchesSearch;
      });
    },
    [searchQuery, filterBalance]
  );

  const totalCollected = orders?.reduce((s, o) => s + o.deposit, 0) || 0;
  const totalOutstandingBalance = orders?.reduce((s, o) => s + o.balanceDue, 0) || 0;

  return (
    <div className="space-y-3 pb-24">
      
      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl">
          <div className="text-[10px] text-teal-400 font-bold uppercase">Pesa Zilizopokelewa</div>
          <div className="text-sm font-extrabold text-slate-100">{formatCurrency(totalCollected)}</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl">
          <div className="text-[10px] text-rose-400 font-bold uppercase">Madeni Yanayodaiwa</div>
          <div className="text-sm font-extrabold text-rose-400">{formatCurrency(totalOutstandingBalance)}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta mteja au namba ya tag..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={() => setFilterBalance(!filterBalance)}
          className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all whitespace-nowrap ${
            filterBalance
              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {filterBalance ? 'Wanaodaiwa Tu' : 'Wote'}
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        {orders?.map(order => (
          <div 
            key={order.id}
            className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-1.5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-teal-300 bg-teal-950/80 px-1.5 py-0.2 rounded border border-teal-500/30">
                    {order.tagNumber}
                  </span>
                  <span className="font-semibold text-xs text-slate-200">{order.customerName}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Simu: {order.customerPhone} • {formatDate(order.createdAt)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">{formatCurrency(order.totalAmount)}</div>
                {order.balanceDue > 0 ? (
                  <div className="text-[10px] text-rose-400 font-bold">Inadaiwa: {formatCurrency(order.balanceDue)}</div>
                ) : (
                  <div className="text-[10px] text-emerald-400 font-bold">Imelipwa Yote</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px]">
              <span className="text-slate-400">
                {order.items.reduce((s, i) => s + i.quantity, 0)} nguo ({order.stage})
              </span>

              <button
                onClick={() => onOpenReceipt({
                  type: 'laundry_order',
                  title: 'Risiti ya Nguo (Laundry Tag)',
                  branchName: 'GGS Laundry Service',
                  branchPhone: '0685947264',
                  branchLocation: 'Mahinakati Mwanza',
                  receiptNumber: order.orderNumber,
                  tagNumber: order.tagNumber,
                  createdAt: order.createdAt,
                  customerName: order.customerName,
                  customerPhone: order.customerPhone,
                  items: order.items.map(i => ({ name: i.itemType, qty: i.quantity, price: i.pricePerItem, total: i.totalPrice })),
                  totalAmount: order.totalAmount,
                  paidAmount: order.deposit,
                  balanceDue: order.balanceDue,
                  promisedDate: order.promisedDate,
                  notes: order.notes
                })}
                className="py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 text-[10px] font-bold"
              >
                <Printer className="w-3 h-3 text-teal-400" />
                <span>Toa Risiti</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
