import React, { useState } from 'react';
import { X, Search, DollarSign, ArrowRight, ShieldCheck, Zap, Smartphone, Banknote } from 'lucide-react';
import { LIPA_TARIFF_TABLE, findLipaTariff, calculateLipaFromPhoneBalance } from '../../services/lipaTariffService';
import { formatCurrency } from '../../services/receiptService';

interface LipaTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAmount?: (amount: number) => void;
}

export const LipaTariffModal: React.FC<LipaTariffModalProps> = ({
  isOpen,
  onClose,
  onSelectAmount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [calcMode, setCalcMode] = useState<'balance' | 'cash'>('balance');
  const [testAmount, setTestAmount] = useState<number | ''>('');

  if (!isOpen) return null;

  const testNum = Number(testAmount) || 0;
  const balanceResult = (calcMode === 'balance' && testNum > 0) ? calculateLipaFromPhoneBalance(testNum) : null;
  const testTariff = (calcMode === 'cash' && testNum > 0) ? findLipaTariff(testNum) : null;

  const filteredTiers = LIPA_TARIFF_TABLE.filter(tier => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().replace(/,/g, '');
    return (
      tier.rangeLabel.toLowerCase().includes(term) ||
      tier.minAmount.toString().includes(term) ||
      tier.maxAmount.toString().includes(term) ||
      tier.wakalaTakes.toString().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                Jedwali Halisi la Makato ya Lipa Namba
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  2026/Official
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Voda, Airtel, Tigo & Halotel Lipa Namba vs Kutoa kwa Wakala
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Instant Calculator */}
        <div className="p-3.5 bg-slate-800/60 border-b border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kikokotoo cha Haraka:</span>
            </div>

            {/* Toggle Modes */}
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setCalcMode('balance')}
                className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                  calcMode === 'balance' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Salio Simuni (5,000)</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('cash')}
                className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                  calcMode === 'cash' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3 h-3" />
                <span>Cash Kamili</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">TZS</span>
              <input
                type="number"
                placeholder={calcMode === 'balance' ? 'Weka salio la simuni (mfano: 5000)...' : 'Weka cash ya mkononi (mfano: 5000)...'}
                value={testAmount}
                onChange={e => setTestAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-12 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-extrabold text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {testNum > 0 && onSelectAmount && (
              <button
                type="button"
                onClick={() => {
                  onSelectAmount(testNum);
                  onClose();
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 active:scale-95"
              >
                Tumia Kwenye POS
              </button>
            )}
          </div>

          {/* Balance Mode Results */}
          {calcMode === 'balance' && balanceResult && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs animate-in zoom-in-95">
              <div className="bg-slate-900/80 p-2 rounded-xl border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">1. Mwambie Atume</div>
                <div className="text-sm font-black text-emerald-300">{formatCurrency(balanceResult.amountToSend)}</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-amber-500/30">
                <div className="text-[10px] text-amber-400 font-bold uppercase">2. Mpe Cash</div>
                <div className="text-sm font-black text-amber-300">{formatCurrency(balanceResult.cashToCustomer)}</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Ada Yako / Makato</div>
                <div className="text-xs font-extrabold text-slate-200">
                  +{formatCurrency(balanceResult.wakalaTakes)} <span className="text-[9px] text-amber-400 font-normal">({formatCurrency(balanceResult.lipaCharge)})</span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Mode Results */}
          {calcMode === 'cash' && testTariff && (
            <div className="p-3 bg-blue-950/50 border border-blue-500/40 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs animate-in zoom-in-95">
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Wakala Anachukua</div>
                <div className="text-sm font-black text-emerald-400">+{formatCurrency(testTariff.wakalaTakes)}</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Makato ya Lipa</div>
                <div className="text-sm font-bold text-amber-400">{formatCurrency(testTariff.lipaCharge)}</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Mteja Analipa Jumla</div>
                <div className="text-sm font-black text-white">{formatCurrency(testNum + testTariff.wakalaTakes)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Search input for table */}
        <div className="px-3.5 pt-3 pb-1 flex items-center justify-between">
          <input
            type="text"
            placeholder="Tafuta kiwango chochote kwenye jedwali..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>

        {/* Scrollable Table of 26 Tiers */}
        <div className="overflow-y-auto flex-1 p-3.5">
          <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                  <th className="p-2.5">Kuanzia (TZS)</th>
                  <th className="p-2.5 text-center text-amber-300">Makato ya Lipa</th>
                  <th className="p-2.5 text-center text-slate-400 hidden xs:table-cell">Makato Kutoa</th>
                  <th className="p-2.5 text-right text-emerald-400 font-black">Wakala Anachukua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTiers.map((tier, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-800/60 transition-colors ${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'}`}
                  >
                    <td className="p-2.5 font-semibold text-slate-200">{tier.rangeLabel}</td>
                    <td className="p-2.5 text-center text-amber-400 font-mono font-medium">
                      {formatCurrency(tier.lipaCharge)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono hidden xs:table-cell">
                      {tier.agentWithdrawCharge ? formatCurrency(tier.agentWithdrawCharge) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-black text-emerald-400 font-mono text-xs">
                      {formatCurrency(tier.wakalaTakes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-400 flex items-center justify-between">
          <span>Jedwali hili linatumika moja kwa moja kwenye miamala ya Lipa Namba</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Funga
          </button>
        </div>
      </div>
    </div>
  );
};
