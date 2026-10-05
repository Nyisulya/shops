import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Check, 
  Phone, 
  Receipt, 
  Sparkles,
  Banknote,
  DollarSign,
  QrCode,
  Table as TableIcon,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { WakalaProvider, WakalaTxType, WakalaTransaction, WakalaWithdrawalMethod } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import { findLipaTariff } from '../../services/lipaTariffService';
import { LipaTariffModal } from './LipaTariffModal';
import confetti from 'canvas-confetti';

interface WakalaQuickLogProps {
  onTxComplete: (tx: WakalaTransaction) => void;
}

const PROVIDERS: { id: WakalaProvider; name: string; color: string; badge: string; iconBg: string }[] = [
  { id: 'mpesa', name: 'M-Pesa (Vodacom)', color: 'border-red-500/40 bg-red-500/10 text-red-400', badge: 'bg-red-600', iconBg: 'bg-red-600' },
  { id: 'tigo', name: 'Tigo Pesa', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400', badge: 'bg-blue-600', iconBg: 'bg-blue-600' },
  { id: 'airtel', name: 'Airtel Money', color: 'border-rose-500/40 bg-rose-500/10 text-rose-400', badge: 'bg-rose-600', iconBg: 'bg-rose-600' },
  { id: 'halopesa', name: 'HaloPesa', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', badge: 'bg-amber-600', iconBg: 'bg-amber-600' },
  { id: 'crdb', name: 'CRDB Wakala', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', badge: 'bg-emerald-600', iconBg: 'bg-emerald-600' },
  { id: 'nmb', name: 'NMB Wakala', color: 'border-blue-700/40 bg-blue-700/10 text-blue-300', badge: 'bg-blue-800', iconBg: 'bg-blue-800' },
];

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000, 200000];

export const WakalaQuickLog: React.FC<WakalaQuickLogProps> = ({ onTxComplete }) => {
  const [provider, setProvider] = useState<WakalaProvider>('mpesa');
  const [txType, setTxType] = useState<WakalaTxType>('withdrawal');
  const [withdrawalMethod, setWithdrawalMethod] = useState<WakalaWithdrawalMethod>('lipa_namba');
  const [amount, setAmount] = useState<number | ''>('');
  const [customWakalaFee, setCustomWakalaFee] = useState<number | ''>('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const currentAmountNum = Number(amount) || 0;
  
  // Lipa Tariff Lookup
  const lipaTariff = currentAmountNum > 0 ? findLipaTariff(currentAmountNum) : null;
  const standardWakalaFee = lipaTariff ? lipaTariff.wakalaTakes : 0;
  const actualWakalaFee = customWakalaFee !== '' ? Number(customWakalaFee) : standardWakalaFee;

  // Calculate commission / earnings
  const calculateCommission = (amt: number, type: WakalaTxType, method: WakalaWithdrawalMethod): number => {
    if (!amt || amt <= 0) return 0;
    if (type === 'withdrawal') {
      if (method === 'lipa_namba') {
        // In Lipa Namba, Wakala keeps the fee directly as profit
        return actualWakalaFee;
      }
      // Traditional agent withdrawal commission
      if (amt <= 10000) return 250;
      if (amt <= 50000) return 650;
      if (amt <= 100000) return 1200;
      if (amt <= 300000) return 2200;
      return 3500;
    } else if (type === 'deposit') {
      if (amt <= 10000) return 150;
      if (amt <= 50000) return 400;
      if (amt <= 100000) return 700;
      if (amt <= 300000) return 1300;
      return 2000;
    }
    return 300;
  };

  const calculatedCommission = calculateCommission(currentAmountNum, txType, withdrawalMethod);
  const totalToPayByCustomer = txType === 'withdrawal' && withdrawalMethod === 'lipa_namba'
    ? currentAmountNum + actualWakalaFee
    : currentAmountNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAmountNum || currentAmountNum <= 0) {
      alert('Tafadhali weka kiasi cha muamala.');
      return;
    }

    setIsSubmitting(true);

    try {
      const txId = generateUniqueId('wtx');
      const transactionNumber = `TX-${Date.now().toString().slice(-5)}`;

      const newTx: WakalaTransaction = {
        id: txId,
        branchId: 'branch_wakala',
        transactionNumber,
        provider,
        type: txType,
        withdrawalMethod: txType === 'withdrawal' ? withdrawalMethod : undefined,
        amount: currentAmountNum,
        fee: txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' ? (lipaTariff?.lipaCharge || 0) : 0,
        wakalaFee: txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' ? actualWakalaFee : undefined,
        lipaCharge: txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' ? (lipaTariff?.lipaCharge || 0) : undefined,
        totalCollectedFromCustomer: totalToPayByCustomer,
        commission: calculatedCommission,
        customerPhone: customerPhone.trim() || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        cashierName: 'Rashid Bakari',
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      await db.wakalaTransactions.put(newTx);
      await queueSync('wakalaTransactions', txId, 'create', newTx);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });

      // Reset
      setAmount('');
      setCustomWakalaFee('');
      setCustomerPhone('');
      setReceiptNumber('');
      onTxComplete(newTx);
    } catch (err) {
      console.error('Error recording wakala tx:', err);
      alert('Imeshindwa kurekodi muamala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-24">
      
      {/* Transaction Type Tabs: Kutoa vs Kuweka */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTxType('withdrawal')}
          className={`py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 shadow-md ${
            txType === 'withdrawal'
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-400 text-white shadow-emerald-950/40'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-white" />
          <span>KUTOA PESA (Cash Out)</span>
        </button>

        <button
          type="button"
          onClick={() => setTxType('deposit')}
          className={`py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 shadow-md ${
            txType === 'deposit'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-blue-950/40'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-white" />
          <span>KUWEKA PESA (Cash In)</span>
        </button>
      </div>

      {/* When Withdrawal: Sub-Mode Toggle (Lipa Namba vs Wakala Kawaida) */}
      {txType === 'withdrawal' && (
        <div className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-300 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Njia ya Kutoa Pesa:
            </span>
            <button
              type="button"
              onClick={() => setIsTariffModalOpen(true)}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30"
            >
              <TableIcon className="w-3 h-3" />
              <span>Jedwali la Makato</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWithdrawalMethod('lipa_namba')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                withdrawalMethod === 'lipa_namba'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Kutoa kwa Lipa Namba</span>
            </button>

            <button
              type="button"
              onClick={() => setWithdrawalMethod('agent_kawaida')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                withdrawalMethod === 'agent_kawaida'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Kutoa Kawaida (Wakala)</span>
            </button>
          </div>

          {withdrawalMethod === 'lipa_namba' && (
            <div className="text-[10px] text-emerald-200/90 bg-emerald-900/30 p-2 rounded-xl border border-emerald-500/20">
              💡 Mteja anatuma pesa kwenye <b>Lipa Namba ya Wakala</b>, na mfumo unakokotoa ada ya <b>"Wakala Anachukua"</b> na makato ya mtandao kiotomatiki.
            </div>
          )}
        </div>
      )}

      {/* Provider Selector */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Chagua Mtandao / Benki:</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                provider === p.id
                  ? `${p.color} ring-2 ring-emerald-400/40 font-bold`
                  : 'bg-slate-800/70 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full mb-2 shrink-0 bg-current" />
              <div className="text-[11px] font-bold leading-tight">{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input & Preset Buttons */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="p-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-3 shadow-md">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba'
                ? 'Kiasi Anachotaka Mteja Mkononi (TZS) *:'
                : 'Kiasi cha Muamala (TZS) *:'
              }
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">TZS</span>
              <input
                type="number"
                required
                min="500"
                step="500"
                placeholder="0"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value === '' ? '' : Number(e.target.value));
                  setCustomWakalaFee(''); // reset custom fee when amount changes
                }}
                className="w-full pl-14 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-lg font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quick Preset Amount Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_AMOUNTS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setCustomWakalaFee('');
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  amount === preset
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {formatCurrency(preset)}
              </button>
            ))}
          </div>

          {/* Lipa Breakdown Details Card */}
          {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && currentAmountNum > 0 && (
            <div className="p-3.5 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-2.5">
              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                <span>Mchanganuo Halisi wa Lipa Namba:</span>
                <span className="text-[10px] text-slate-400">Kiwango: {lipaTariff?.rangeLabel || '500+'}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Kiasi cha kumpa mteja:</span>
                  <span className="font-bold text-slate-100">{formatCurrency(currentAmountNum)}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <span>Wakala Anachukua (Ada yako):</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">TZS</span>
                    <input
                      type="number"
                      placeholder={standardWakalaFee.toString()}
                      value={customWakalaFee !== '' ? customWakalaFee : standardWakalaFee}
                      onChange={e => setCustomWakalaFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 px-2 py-0.5 bg-slate-900 border border-emerald-500/50 rounded-lg text-xs font-black text-right text-emerald-300 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {lipaTariff && (
                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                    <span>Makato ya Lipa (Mtandao):</span>
                    <span className="font-mono text-amber-400">{formatCurrency(lipaTariff.lipaCharge)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                  <span className="font-extrabold text-white">Mteja Anatuma Lipa Jumla:</span>
                  <span className="font-black text-base text-emerald-400">
                    {formatCurrency(totalToPayByCustomer)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Customer Phone & Telco Reference */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/50">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Simu ya Mteja (Hiari):</label>
              <input
                type="tel"
                placeholder="0712 345 678"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Ref / Namba ya SMS:</label>
              <input
                type="text"
                placeholder="mfano: 9B284..."
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Estimated Earnings / Commission Banner */}
          {currentAmountNum > 0 && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-medium">
                {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba'
                  ? 'Faida ya Wakala (Ada Uliyochukua):'
                  : 'Tume Inayokadiriwa:'}
              </span>
              <span className="font-extrabold text-emerald-400 text-sm">+{formatCurrency(calculatedCommission)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting || !currentAmountNum}
          className={`w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 ${
            txType === 'withdrawal'
              ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 shadow-emerald-950/50'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-blue-950/50'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>
            {isSubmitting 
              ? 'Inarekodi...' 
              : txType === 'withdrawal' && withdrawalMethod === 'lipa_namba'
              ? `Rekodi KUTOA LIPA (${formatCurrency(totalToPayByCustomer)})`
              : txType === 'withdrawal'
              ? `Rekodi KUTOA PESA (${formatCurrency(currentAmountNum)})`
              : `Rekodi KUWEKA PESA (${formatCurrency(currentAmountNum)})`
            }
          </span>
        </button>
      </form>

      {/* Modal for viewing all 26 tiers */}
      <LipaTariffModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
        onSelectAmount={(selectedAmt) => {
          setAmount(selectedAmt);
          setCustomWakalaFee('');
        }}
      />
    </div>
  );
};

