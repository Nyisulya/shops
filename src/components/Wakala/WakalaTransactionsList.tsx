import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ListOrdered, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Printer, 
  DollarSign, 
  TrendingUp,
  Filter,
  QrCode,
  Table as TableIcon
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { WakalaTransaction, WakalaProvider } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';
import { LipaTariffModal } from './LipaTariffModal';

interface WakalaTransactionsListProps {
  onOpenReceipt: (data: any) => void;
}

export const WakalaTransactionsList: React.FC<WakalaTransactionsListProps> = ({ onOpenReceipt }) => {
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const transactions = useLiveQuery(
    async () => {
      const all = await db.wakalaTransactions.where('branchId').equals('branch_wakala').reverse().sortBy('createdAt');
      return all.filter(tx => {
        const matchesProvider = providerFilter === 'all' || tx.provider === providerFilter;
        const matchesSearch = tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (tx.customerPhone && tx.customerPhone.includes(searchQuery)) ||
                              (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesProvider && matchesSearch;
      });
    },
    [providerFilter, searchQuery]
  );

  const totalCommissions = transactions?.reduce((s, tx) => s + tx.commission, 0) || 0;
  const totalVolume = transactions?.reduce((s, tx) => s + tx.amount, 0) || 0;
  const totalWithdrawals = transactions?.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0) || 0;
  const totalDeposits = transactions?.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0) || 0;

  return (
    <div className="space-y-3 pb-24">
      
      {/* Top Banner: Commissions & Volume */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
        <div>
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Tume / Faida ya Leo</div>
          <div className="text-lg font-black text-emerald-300">+{formatCurrency(totalCommissions)}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Mzunguko (Volume)</div>
            <div className="text-xs font-bold text-slate-200">{formatCurrency(totalVolume)}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsTariffModalOpen(true)}
            className="text-[10px] font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1"
          >
            <TableIcon className="w-2.5 h-2.5" />
            <span>Jedwali la Lipa</span>
          </button>
        </div>
      </div>

      {/* Withdrawals vs Deposits quick pill counters */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Kutoa Pesa:</span>
          </div>
          <span className="font-extrabold text-slate-100">{formatCurrency(totalWithdrawals)}</span>
        </div>
        <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>Kuweka Pesa:</span>
          </div>
          <span className="font-extrabold text-slate-100">{formatCurrency(totalDeposits)}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta namba ya muamala au simu ya mteja..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Provider filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'mpesa', 'tigo', 'airtel', 'halopesa'].map(p => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase whitespace-nowrap transition-all ${
                providerFilter === p
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {p === 'all' ? 'Mitandao Yote' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions?.map(tx => (
          <div 
            key={tx.id}
            className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-1.5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs mt-0.5 ${
                  tx.type === 'withdrawal'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {tx.type === 'withdrawal' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs text-slate-100 uppercase font-mono">{tx.provider}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      tx.type === 'withdrawal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {tx.type === 'withdrawal' ? 'KUTOA' : 'KUWEKA'}
                    </span>
                    {tx.withdrawalMethod === 'lipa_namba' && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                        <QrCode className="w-2.5 h-2.5" />
                        Lipa Namba
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {tx.customerPhone ? `Simu: ${tx.customerPhone} • ` : ''}{formatDate(tx.createdAt)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-slate-100">{formatCurrency(tx.amount)}</div>
                {tx.withdrawalMethod === 'lipa_namba' && (tx.wakalaFee || tx.commission) ? (
                  <div className="text-[10px] text-emerald-400 font-bold">
                    Ada: +{formatCurrency(tx.wakalaFee || tx.commission)}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px]">
              <span className="text-slate-400 font-mono">
                {tx.receiptNumber ? `Ref: ${tx.receiptNumber}` : tx.transactionNumber}
              </span>

              <button
                onClick={() => onOpenReceipt({
                  type: 'wakala_tx',
                  title: 'Stakabadhi ya Wakala (Transaction Slip)',
                  branchName: 'Wakala Kiosk (M-Pesa & Banks)',
                  branchPhone: '+255 784 567 890',
                  branchLocation: 'Kinondoni Manyanya Branch',
                  receiptNumber: tx.transactionNumber,
                  createdAt: tx.createdAt,
                  customerPhone: tx.customerPhone,
                  items: [
                    { 
                      name: `Muamala: ${tx.type === 'withdrawal' ? (tx.withdrawalMethod === 'lipa_namba' ? 'Kutoa kwa Lipa Namba' : 'Kutoa Pesa') : 'Kuweka Pesa'} (${tx.provider.toUpperCase()})`, 
                      qty: 1, 
                      price: tx.amount, 
                      total: tx.amount 
                    },
                    ...(tx.wakalaFee ? [{
                      name: 'Ada ya Wakala (Wakala Anachukua)',
                      qty: 1,
                      price: tx.wakalaFee,
                      total: tx.wakalaFee
                    }] : [])
                  ],
                  totalAmount: tx.totalCollectedFromCustomer || tx.amount,
                  paidAmount: tx.totalCollectedFromCustomer || tx.amount,
                  paymentMethod: tx.withdrawalMethod === 'lipa_namba' ? `${tx.provider.toUpperCase()} LIPA` : tx.provider.toUpperCase(),
                  cashierName: tx.cashierName,
                  notes: tx.receiptNumber ? `Ref SMS: ${tx.receiptNumber}` : undefined
                })}
                className="py-1 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 font-semibold"
              >
                <Printer className="w-3 h-3 text-emerald-400" />
                <span>Toa Risiti</span>
              </button>
            </div>
          </div>
        ))}

        {transactions && transactions.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            Hakuna miamala iliyorekodiwa bado.
          </div>
        )}
      </div>

      {/* Tariff Modal */}
      <LipaTariffModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
      />
    </div>
  );
};

