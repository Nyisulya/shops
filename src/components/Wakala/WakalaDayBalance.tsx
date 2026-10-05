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
      return await db.wakalaTransactions.where('branchId').equals('branch_wakala').toArray();
    },
    []
  );

  // States for Opening Float Setup
  const [openingCash, setOpeningCash] = useState<number | ''>(500000);
  const [openingFloatMpesa, setOpeningFloatMpesa] = useState<number | ''>(1500000);
  const [openingFloatTigo, setOpeningFloatTigo] = useState<number | ''>(800000);
  const [openingFloatAirtel, setOpeningFloatAirtel] = useState<number | ''>(600000);
  const [openingFloatHalopesa, setOpeningFloatHalopesa] = useState<number | ''>(300000);
  const [openingFloatBank, setOpeningFloatBank] = useState<number | ''>(1000000);

  // Calculate actual movement today
  let netCashChange = 0;
  let netMpesaChange = 0;
  let netTigoChange = 0;
  let netAirtelChange = 0;
  let netHalopesaChange = 0;
  let netBankChange = 0;

  transactions?.forEach(tx => {
    const isWithdrawal = tx.type === 'withdrawal';
    const amount = tx.amount;

    if (isWithdrawal) {
      netCashChange -= amount;
      if (tx.provider === 'mpesa') netMpesaChange += amount;
      else if (tx.provider === 'tigo') netTigoChange += amount;
      else if (tx.provider === 'airtel') netAirtelChange += amount;
      else if (tx.provider === 'halopesa') netHalopesaChange += amount;
      else if (tx.provider === 'crdb' || tx.provider === 'nmb') netBankChange += amount;
    } else if (tx.type === 'deposit') {
      netCashChange += amount;
      if (tx.provider === 'mpesa') netMpesaChange -= amount;
      else if (tx.provider === 'tigo') netTigoChange -= amount;
      else if (tx.provider === 'airtel') netAirtelChange -= amount;
      else if (tx.provider === 'halopesa') netHalopesaChange -= amount;
      else if (tx.provider === 'crdb' || tx.provider === 'nmb') netBankChange -= amount;
    }
  });

  const baseOpeningCash = currentDayLog ? currentDayLog.openingCash : Number(openingCash) || 0;
  const baseOpeningMpesa = currentDayLog ? currentDayLog.openingFloatMpesa : Number(openingFloatMpesa) || 0;
  const baseOpeningTigo = currentDayLog ? currentDayLog.openingFloatTigo : Number(openingFloatTigo) || 0;
  const baseOpeningAirtel = currentDayLog ? currentDayLog.openingFloatAirtel : Number(openingFloatAirtel) || 0;
  const baseOpeningHalopesa = currentDayLog ? currentDayLog.openingFloatHalopesa : Number(openingFloatHalopesa) || 0;
  const baseOpeningBank = currentDayLog ? currentDayLog.openingFloatBank : Number(openingFloatBank) || 0;

  const expectedCashInDrawer = baseOpeningCash + netCashChange;
  const expectedFloatMpesa = baseOpeningMpesa + netMpesaChange;
  const expectedFloatTigo = baseOpeningTigo + netTigoChange;
  const expectedFloatAirtel = baseOpeningAirtel + netAirtelChange;
  const expectedFloatHalopesa = baseOpeningHalopesa + netHalopesaChange;
  const expectedFloatBank = baseOpeningBank + netBankChange;

  const totalExpectedCapital = expectedCashInDrawer + expectedFloatMpesa + expectedFloatTigo + expectedFloatAirtel + expectedFloatHalopesa + expectedFloatBank;

  const handleSaveOpeningFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLogId = currentDayLog ? currentDayLog.id : generateUniqueId('wlog');
      const newLog: WakalaDayLog = {
        id: newLogId,
        branchId: 'branch_wakala',
        date: todayDate,
        openingCash: Number(openingCash) || 0,
        openingFloatMpesa: Number(openingFloatMpesa) || 0,
        openingFloatTigo: Number(openingFloatTigo) || 0,
        openingFloatAirtel: Number(openingFloatAirtel) || 0,
        openingFloatHalopesa: Number(openingFloatHalopesa) || 0,
        openingFloatBank: Number(openingFloatBank) || 0,
        calculatedCash: expectedCashInDrawer,
        calculatedFloats: {
          mpesa: expectedFloatMpesa,
          tigo: expectedFloatTigo,
          airtel: expectedFloatAirtel,
          halopesa: expectedFloatHalopesa,
          bank: expectedFloatBank
        },
        status: 'open',
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      await db.wakalaDayLogs.put(newLog);
      await queueSync('wakalaDayLogs', newLogId, 'update', newLog);
      alert('Salio la kuanzia asubuhi limehifadhiwa vizuri!');
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
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Cash Inayopaswa Kuwepo Drooni:</div>
            <div className="font-extrabold text-sm text-emerald-300">{formatCurrency(expectedCashInDrawer)}</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Jumla ya Salio Kwenye Line (Float):</div>
            <div className="font-extrabold text-sm text-blue-400">
              {formatCurrency(expectedFloatMpesa + expectedFloatTigo + expectedFloatAirtel + expectedFloatHalopesa + expectedFloatBank)}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Detailed Balances by Network */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Mchanganuo wa Salio Lililopo kwa Kila Mtandao
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="font-semibold text-red-400">M-Pesa Float:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedFloatMpesa)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="font-semibold text-blue-400">Tigo Pesa Float:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedFloatTigo)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="font-semibold text-rose-400">Airtel Money Float:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedFloatAirtel)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="font-semibold text-amber-400">HaloPesa Float:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedFloatHalopesa)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="font-semibold text-emerald-400">CRDB & NMB Bank Float:</span>
            <span className="font-bold text-slate-100">{formatCurrency(expectedFloatBank)}</span>
          </div>
        </div>
      </div>

      {/* Morning Opening Float Setup Section */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
            Kurekodi Salio la Kuanzia Asubuhi (Opening)
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{todayDate}</span>
        </div>

        <form onSubmit={handleSaveOpeningFloat} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Cash Mkononi Asubuhi:</label>
              <input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">M-Pesa Float Asubuhi:</label>
              <input
                type="number"
                value={openingFloatMpesa}
                onChange={e => setOpeningFloatMpesa(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Tigo Pesa Asubuhi:</label>
              <input
                type="number"
                value={openingFloatTigo}
                onChange={e => setOpeningFloatTigo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Airtel Money Asubuhi:</label>
              <input
                type="number"
                value={openingFloatAirtel}
                onChange={e => setOpeningFloatAirtel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sasisha Salio la Kuanzia Asubuhi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
