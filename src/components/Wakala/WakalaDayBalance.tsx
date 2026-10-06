import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Scale, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Banknote, 
  Smartphone, 
  Save
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { WakalaDayLog } from '../../types';
import { formatCurrency } from '../../services/receiptService';

export const WakalaDayBalance: React.FC = () => {
  const todayDate = new Date().toISOString().split('T')[0];

  const currentDayLog = useLiveQuery(
    async () => {
      return await db.wakalaDayLogs.where('date').equals(todayDate).first();
    },
    [todayDate]
  );

  const transactions = useLiveQuery(
    async () => {
      const all = await db.wakalaTransactions.toArray();
      return all.filter(tx => tx.createdAt.startsWith(todayDate));
    },
    [todayDate]
  );

  // States for Opening Float Setup (4 Agent + 4 Lipa)
  const [openingCash, setOpeningCash] = useState<number | ''>(500000);
  
  // 4 Agent Lines
  const [openingFloatMpesaAgent, setOpeningFloatMpesaAgent] = useState<number | ''>(800000);
  const [openingFloatTigoAgent, setOpeningFloatTigoAgent] = useState<number | ''>(500000);
  const [openingFloatAirtelAgent, setOpeningFloatAirtelAgent] = useState<number | ''>(300000);
  const [openingFloatHalopesaAgent, setOpeningFloatHalopesaAgent] = useState<number | ''>(200000);

  // 4 Lipa Lines
  const [openingFloatMpesaLipa, setOpeningFloatMpesaLipa] = useState<number | ''>(700000);
  const [openingFloatTigoLipa, setOpeningFloatTigoLipa] = useState<number | ''>(300000);
  const [openingFloatAirtelLipa, setOpeningFloatAirtelLipa] = useState<number | ''>(300000);
  const [openingFloatHalopesaLipa, setOpeningFloatHalopesaLipa] = useState<number | ''>(100000);

  // Calculate actual movement today across all 8 lines
  let netCashChange = 0;
  let netMpesaAgentChange = 0;
  let netTigoAgentChange = 0;
  let netAirtelAgentChange = 0;
  let netHalopesaAgentChange = 0;

  let netMpesaLipaChange = 0;
  let netTigoLipaChange = 0;
  let netAirtelLipaChange = 0;
  let netHalopesaLipaChange = 0;
  let totalLipaFeeProfit = 0;

  transactions?.forEach(tx => {
    const amount = tx.amount;
    const isLipa = tx.type === 'withdrawal' && tx.withdrawalMethod === 'lipa_namba';
    const fee = tx.wakalaFee || 0;

    if (isLipa) {
      netCashChange -= amount;
      totalLipaFeeProfit += fee;
      const lipaReceived = amount + fee;
      if (tx.provider === 'mpesa') netMpesaLipaChange += lipaReceived;
      else if (tx.provider === 'tigo') netTigoLipaChange += lipaReceived;
      else if (tx.provider === 'airtel') netAirtelLipaChange += lipaReceived;
      else if (tx.provider === 'halopesa') netHalopesaLipaChange += lipaReceived;
    } else if (tx.type === 'withdrawal') {
      netCashChange -= amount;
      if (tx.provider === 'mpesa') netMpesaAgentChange += amount;
      else if (tx.provider === 'tigo') netTigoAgentChange += amount;
      else if (tx.provider === 'airtel') netAirtelAgentChange += amount;
      else if (tx.provider === 'halopesa') netHalopesaAgentChange += amount;
    } else if (tx.type === 'deposit') {
      netCashChange += amount;
      if (tx.provider === 'mpesa') netMpesaAgentChange -= amount;
      else if (tx.provider === 'tigo') netTigoAgentChange -= amount;
      else if (tx.provider === 'airtel') netAirtelAgentChange -= amount;
      else if (tx.provider === 'halopesa') netHalopesaAgentChange -= amount;
    }
  });

  const baseOpeningCash = currentDayLog ? currentDayLog.openingCash : (Number(openingCash) || 0);

  // Agent bases
  const baseMpesaAgent = currentDayLog 
    ? (currentDayLog.openingFloatMpesaAgent ?? currentDayLog.openingFloatMpesa ?? 800000) 
    : (Number(openingFloatMpesaAgent) || 0);
  const baseTigoAgent = currentDayLog 
    ? (currentDayLog.openingFloatTigoAgent ?? currentDayLog.openingFloatTigo ?? 500000) 
    : (Number(openingFloatTigoAgent) || 0);
  const baseAirtelAgent = currentDayLog 
    ? (currentDayLog.openingFloatAirtelAgent ?? currentDayLog.openingFloatAirtel ?? 300000) 
    : (Number(openingFloatAirtelAgent) || 0);
  const baseHalopesaAgent = currentDayLog 
    ? (currentDayLog.openingFloatHalopesaAgent ?? currentDayLog.openingFloatHalopesa ?? 200000) 
    : (Number(openingFloatHalopesaAgent) || 0);

  // Lipa bases
  const baseMpesaLipa = currentDayLog 
    ? (currentDayLog.openingFloatMpesaLipa ?? 700000) 
    : (Number(openingFloatMpesaLipa) || 0);
  const baseTigoLipa = currentDayLog 
    ? (currentDayLog.openingFloatTigoLipa ?? 300000) 
    : (Number(openingFloatTigoLipa) || 0);
  const baseAirtelLipa = currentDayLog 
    ? (currentDayLog.openingFloatAirtelLipa ?? 300000) 
    : (Number(openingFloatAirtelLipa) || 0);
  const baseHalopesaLipa = currentDayLog 
    ? (currentDayLog.openingFloatHalopesaLipa ?? 100000) 
    : (Number(openingFloatHalopesaLipa) || 0);

  // Live values
  const expectedCashInDrawer = baseOpeningCash + netCashChange;

  const expectedMpesaAgent = baseMpesaAgent + netMpesaAgentChange;
  const expectedTigoAgent = baseTigoAgent + netTigoAgentChange;
  const expectedAirtelAgent = baseAirtelAgent + netAirtelAgentChange;
  const expectedHalopesaAgent = baseHalopesaAgent + netHalopesaAgentChange;
  const totalExpectedAgentFloat = expectedMpesaAgent + expectedTigoAgent + expectedAirtelAgent + expectedHalopesaAgent;

  const expectedMpesaLipa = baseMpesaLipa + netMpesaLipaChange;
  const expectedTigoLipa = baseTigoLipa + netTigoLipaChange;
  const expectedAirtelLipa = baseAirtelLipa + netAirtelLipaChange;
  const expectedHalopesaLipa = baseHalopesaLipa + netHalopesaLipaChange;
  const totalExpectedLipaFloat = expectedMpesaLipa + expectedTigoLipa + expectedAirtelLipa + expectedHalopesaLipa;

  const totalExpectedFloat = totalExpectedAgentFloat + totalExpectedLipaFloat;
  const totalExpectedCapital = expectedCashInDrawer + totalExpectedFloat;

  const handleSaveOpeningFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLogId = currentDayLog ? currentDayLog.id : generateUniqueId('wlog');
      const cashVal = Number(openingCash) || 0;
      
      const mAgent = Number(openingFloatMpesaAgent) || 0;
      const tAgent = Number(openingFloatTigoAgent) || 0;
      const aAgent = Number(openingFloatAirtelAgent) || 0;
      const hAgent = Number(openingFloatHalopesaAgent) || 0;

      const mLipa = Number(openingFloatMpesaLipa) || 0;
      const tLipa = Number(openingFloatTigoLipa) || 0;
      const aLipa = Number(openingFloatAirtelLipa) || 0;
      const hLipa = Number(openingFloatHalopesaLipa) || 0;

      const newLog: WakalaDayLog = {
        id: newLogId,
        branchId: 'branch_wakala_1',
        date: todayDate,
        openingCash: cashVal,
        openingFloatMpesaAgent: mAgent,
        openingFloatTigoAgent: tAgent,
        openingFloatAirtelAgent: aAgent,
        openingFloatHalopesaAgent: hAgent,
        openingFloatMpesaLipa: mLipa,
        openingFloatTigoLipa: tLipa,
        openingFloatAirtelLipa: aLipa,
        openingFloatHalopesaLipa: hLipa,
        // Compatibility
        openingFloatMpesa: mAgent + mLipa,
        openingFloatTigo: tAgent + tLipa,
        openingFloatAirtel: aAgent + aLipa,
        openingFloatHalopesa: hAgent + hLipa,
        openingFloatBank: 0,
        calculatedCash: expectedCashInDrawer,
        calculatedFloats: {
          mpesaAgent: expectedMpesaAgent,
          tigoAgent: expectedTigoAgent,
          airtelAgent: expectedAirtelAgent,
          halopesaAgent: expectedHalopesaAgent,
          mpesaLipa: expectedMpesaLipa,
          tigoLipa: expectedTigoLipa,
          airtelLipa: expectedAirtelLipa,
          halopesaLipa: expectedHalopesaLipa,
          mpesa: expectedMpesaAgent + expectedMpesaLipa,
          tigo: expectedTigoAgent + expectedTigoLipa,
          airtel: expectedAirtelAgent + expectedAirtelLipa,
          halopesa: expectedHalopesaAgent + expectedHalopesaLipa,
          bank: 0
        },
        status: 'open',
        createdAt: currentDayLog ? currentDayLog.createdAt : new Date().toISOString(),
        isSynced: false
      };

      await db.wakalaDayLogs.put(newLog);
      await queueSync('wakalaDayLogs', newLogId, 'update', newLog);
      alert('Salio la kuanzia asubuhi (Laini Zote 8) limehifadhiwa vizuri!');
    } catch (err) {
      console.error('Error saving opening float:', err);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      
      {/* Capital Overview Card */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 p-4 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Mtaji Wote wa Leo (Capital)</div>
            <div className="text-xl font-black text-white">{formatCurrency(totalExpectedCapital)}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* Expected Live Balances breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-emerald-500/30">
            <div className="text-slate-400 text-[10px]">Cash Drooni:</div>
            <div className="font-extrabold text-sm text-emerald-300">{formatCurrency(expectedCashInDrawer)}</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-blue-500/30">
            <div className="text-slate-400 text-[10px]">Float Wakala (Laini 4):</div>
            <div className="font-extrabold text-sm text-blue-400">{formatCurrency(totalExpectedAgentFloat)}</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-500/30">
            <div className="text-slate-400 text-[10px]">Float Lipa (Laini 4):</div>
            <div className="font-extrabold text-sm text-indigo-400">{formatCurrency(totalExpectedLipaFloat)}</div>
          </div>
        </div>
      </div>

      {/* 4 Agent Lines Breakdown */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm">
        <div className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center justify-between">
          <span>📱 Laini 4 za Wakala Kawaida (Kumuwekea Mteja)</span>
          <span className="text-[10px] text-slate-400 font-normal">Jumla: {formatCurrency(totalExpectedAgentFloat)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-red-500/30">
            <span className="font-semibold text-red-400">Voda Wakala:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedMpesaAgent)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-blue-500/30">
            <span className="font-semibold text-blue-400">Tigo Wakala:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedTigoAgent)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-rose-500/30">
            <span className="font-semibold text-rose-400">Airtel Wakala:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedAirtelAgent)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-amber-500/30">
            <span className="font-semibold text-amber-400">Halotel Wakala:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedHalopesaAgent)}</span>
          </div>
        </div>
      </div>

      {/* 4 Lipa Lines Breakdown */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm">
        <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
          <span>🏷️ Laini 4 za Lipa Namba (Kupokea Mteja Anayetoa Lipa)</span>
          <span className="text-[10px] text-slate-400 font-normal">Jumla: {formatCurrency(totalExpectedLipaFloat)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-red-500/30">
            <span className="font-semibold text-red-400">Voda Lipa:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedMpesaLipa)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-blue-500/30">
            <span className="font-semibold text-blue-400">Tigo Lipa:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedTigoLipa)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-rose-500/30">
            <span className="font-semibold text-rose-400">Airtel Lipa:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedAirtelLipa)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/70 rounded-xl border border-amber-500/30">
            <span className="font-semibold text-amber-400">Halotel Lipa:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedHalopesaLipa)}</span>
          </div>
        </div>
      </div>

      {/* Morning Opening Float Setup Section */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Kurekodi Salio la Kuanzia Asubuhi (Laini Zote 8)
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{todayDate}</span>
        </div>

        <form onSubmit={handleSaveOpeningFloat} className="space-y-3">
          {/* Cash */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-emerald-500/30">
            <label className="block text-[10px] font-bold text-emerald-400 mb-1">💵 Cash Mkononi / Drooni Asubuhi:</label>
            <input
              type="number"
              value={openingCash}
              onChange={e => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 4 Agent Lines */}
          <div className="p-2.5 bg-blue-950/20 rounded-xl border border-blue-500/30 space-y-2">
            <div className="text-[11px] font-bold text-blue-300">📱 Laini 4 za Wakala Kawaida:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-red-400 mb-0.5">Vodacom Wakala:</label>
                <input
                  type="number"
                  value={openingFloatMpesaAgent}
                  onChange={e => setOpeningFloatMpesaAgent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 mb-0.5">Tigo Pesa Wakala:</label>
                <input
                  type="number"
                  value={openingFloatTigoAgent}
                  onChange={e => setOpeningFloatTigoAgent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-rose-400 mb-0.5">Airtel Money Wakala:</label>
                <input
                  type="number"
                  value={openingFloatAirtelAgent}
                  onChange={e => setOpeningFloatAirtelAgent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-400 mb-0.5">HaloPesa Wakala:</label>
                <input
                  type="number"
                  value={openingFloatHalopesaAgent}
                  onChange={e => setOpeningFloatHalopesaAgent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 4 Lipa Lines */}
          <div className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="text-[11px] font-bold text-emerald-300">🏷️ Laini 4 za Lipa Namba:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-red-400 mb-0.5">Vodacom Lipa:</label>
                <input
                  type="number"
                  value={openingFloatMpesaLipa}
                  onChange={e => setOpeningFloatMpesaLipa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 mb-0.5">Tigo Lipa:</label>
                <input
                  type="number"
                  value={openingFloatTigoLipa}
                  onChange={e => setOpeningFloatTigoLipa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-rose-400 mb-0.5">Airtel Lipa:</label>
                <input
                  type="number"
                  value={openingFloatAirtelLipa}
                  onChange={e => setOpeningFloatAirtelLipa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-400 mb-0.5">Halotel Lipa:</label>
                <input
                  type="number"
                  value={openingFloatHalopesaLipa}
                  onChange={e => setOpeningFloatHalopesaLipa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sasisha Salio la Laini Zote 8</span>
          </button>
        </form>
      </div>
    </div>
  );
};
