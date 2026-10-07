import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  TrendingUp,
  Sun,
  Scale,
  Edit3,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Smartphone
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { WakalaProvider, WakalaTxType, WakalaTransaction, WakalaWithdrawalMethod, WakalaDayLog } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import { findLipaTariff, calculateLipaFromPhoneBalance } from '../../services/lipaTariffService';
import { LipaTariffModal } from './LipaTariffModal';
import confetti from 'canvas-confetti';

interface WakalaQuickLogProps {
  onTxComplete: (tx: WakalaTransaction) => void;
  branchId?: string;
}

const PROVIDERS: { id: WakalaProvider; name: string; color: string; badge: string; iconBg: string }[] = [
  { id: 'mpesa', name: 'M-Pesa (Vodacom)', color: 'border-red-500/40 bg-red-500/10 text-red-400', badge: 'bg-red-600', iconBg: 'bg-red-600' },
  { id: 'tigo', name: 'Tigo Pesa', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400', badge: 'bg-blue-600', iconBg: 'bg-blue-600' },
  { id: 'airtel', name: 'Airtel Money', color: 'border-rose-500/40 bg-rose-500/10 text-rose-400', badge: 'bg-rose-600', iconBg: 'bg-rose-600' },
  { id: 'halopesa', name: 'HaloPesa', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', badge: 'bg-amber-600', iconBg: 'bg-amber-600' },
];

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000, 200000];

export const WakalaQuickLog: React.FC<WakalaQuickLogProps> = ({ onTxComplete, branchId = 'branch_wakala_1' }) => {
  const todayDate = new Date().toISOString().split('T')[0];

  // Live queries for Morning Opening Balance and Today's Transactions
  const currentDayLog = useLiveQuery(
    async () => {
      return await db.wakalaDayLogs.where('date').equals(todayDate).first();
    },
    [todayDate]
  );

  const todayTransactions = useLiveQuery(
    async () => {
      const all = await db.wakalaTransactions.toArray();
      return all.filter(tx => tx.createdAt.startsWith(todayDate));
    },
    [todayDate]
  );

  // Opening Float Setup States - Cash + 4 Agent Lines + 4 Lipa Lines
  const [openingCashInput, setOpeningCashInput] = useState<number | ''>(500000);
  
  // 4 Laini za Wakala Kawaida (kumuwekea mteja)
  const [openingMpesaAgentInput, setOpeningMpesaAgentInput] = useState<number | ''>(800000);
  const [openingTigoAgentInput, setOpeningTigoAgentInput] = useState<number | ''>(500000);
  const [openingAirtelAgentInput, setOpeningAirtelAgentInput] = useState<number | ''>(300000);
  const [openingHalopesaAgentInput, setOpeningHalopesaAgentInput] = useState<number | ''>(200000);

  // 4 Laini za Lipa Namba (kupokelea mteja anayetoa kwa lipa)
  const [openingMpesaLipaInput, setOpeningMpesaLipaInput] = useState<number | ''>(700000);
  const [openingTigoLipaInput, setOpeningTigoLipaInput] = useState<number | ''>(300000);
  const [openingAirtelLipaInput, setOpeningAirtelLipaInput] = useState<number | ''>(300000);
  const [openingHalopesaLipaInput, setOpeningHalopesaLipaInput] = useState<number | ''>(100000);

  const [floatViewMode, setFloatViewMode] = useState<'all' | 'agent' | 'lipa'>('all');
  const [isLinesBreakdownOpen, setIsLinesBreakdownOpen] = useState(false);
  const [isEditingMorningBalance, setIsEditingMorningBalance] = useState(false);
  const [morningSavedSuccess, setMorningSavedSuccess] = useState(false);

  // Sync inputs with DB log when loaded
  useEffect(() => {
    if (currentDayLog) {
      setOpeningCashInput(currentDayLog.openingCash);
      
      setOpeningMpesaAgentInput(currentDayLog.openingFloatMpesaAgent ?? currentDayLog.openingFloatMpesa ?? 800000);
      setOpeningTigoAgentInput(currentDayLog.openingFloatTigoAgent ?? currentDayLog.openingFloatTigo ?? 500000);
      setOpeningAirtelAgentInput(currentDayLog.openingFloatAirtelAgent ?? currentDayLog.openingFloatAirtel ?? 300000);
      setOpeningHalopesaAgentInput(currentDayLog.openingFloatHalopesaAgent ?? currentDayLog.openingFloatHalopesa ?? 200000);

      setOpeningMpesaLipaInput(currentDayLog.openingFloatMpesaLipa ?? 700000);
      setOpeningTigoLipaInput(currentDayLog.openingFloatTigoLipa ?? 300000);
      setOpeningAirtelLipaInput(currentDayLog.openingFloatAirtelLipa ?? 300000);
      setOpeningHalopesaLipaInput(currentDayLog.openingFloatHalopesaLipa ?? 100000);
    }
  }, [currentDayLog]);

  // Live Balance calculations for all 8 lines throughout the day
  const liveBalances = useMemo(() => {
    const baseCash = currentDayLog ? currentDayLog.openingCash : (Number(openingCashInput) || 0);

    // 4 Agent Lines
    const baseMpesaAgent = currentDayLog 
      ? (currentDayLog.openingFloatMpesaAgent ?? currentDayLog.openingFloatMpesa ?? 800000) 
      : (Number(openingMpesaAgentInput) || 0);
    const baseTigoAgent = currentDayLog 
      ? (currentDayLog.openingFloatTigoAgent ?? currentDayLog.openingFloatTigo ?? 500000) 
      : (Number(openingTigoAgentInput) || 0);
    const baseAirtelAgent = currentDayLog 
      ? (currentDayLog.openingFloatAirtelAgent ?? currentDayLog.openingFloatAirtel ?? 300000) 
      : (Number(openingAirtelAgentInput) || 0);
    const baseHalopesaAgent = currentDayLog 
      ? (currentDayLog.openingFloatHalopesaAgent ?? currentDayLog.openingFloatHalopesa ?? 200000) 
      : (Number(openingHalopesaAgentInput) || 0);

    // 4 Lipa Lines
    const baseMpesaLipa = currentDayLog 
      ? (currentDayLog.openingFloatMpesaLipa ?? 700000) 
      : (Number(openingMpesaLipaInput) || 0);
    const baseTigoLipa = currentDayLog 
      ? (currentDayLog.openingFloatTigoLipa ?? 300000) 
      : (Number(openingTigoLipaInput) || 0);
    const baseAirtelLipa = currentDayLog 
      ? (currentDayLog.openingFloatAirtelLipa ?? 300000) 
      : (Number(openingAirtelLipaInput) || 0);
    const baseHalopesaLipa = currentDayLog 
      ? (currentDayLog.openingFloatHalopesaLipa ?? 100000) 
      : (Number(openingHalopesaLipaInput) || 0);

    let netCashChange = 0;
    let netMpesaAgentChange = 0;
    let netTigoAgentChange = 0;
    let netAirtelAgentChange = 0;
    let netHalopesaAgentChange = 0;

    let netMpesaLipaChange = 0;
    let netTigoLipaChange = 0;
    let netAirtelLipaChange = 0;
    let netHalopesaLipaChange = 0;

    let totalLipaProfitToday = 0;

    (todayTransactions || []).forEach(tx => {
      const amt = tx.amount;
      const isLipa = tx.type === 'withdrawal' && tx.withdrawalMethod === 'lipa_namba';
      const fee = tx.wakalaFee || 0;

      if (isLipa) {
        // Customer sends to Lipa Namba till (+amt or +amt+fee) and takes cash out from drawer
        totalLipaProfitToday += fee;
        netCashChange -= amt;

        const lipaReceived = amt + fee;
        if (tx.provider === 'mpesa') netMpesaLipaChange += lipaReceived;
        else if (tx.provider === 'tigo') netTigoLipaChange += lipaReceived;
        else if (tx.provider === 'airtel') netAirtelLipaChange += lipaReceived;
        else if (tx.provider === 'halopesa') netHalopesaLipaChange += lipaReceived;
      } else if (tx.type === 'withdrawal') {
        // Kutoa Kawaida via Wakala Agent Line: float comes to Agent line, cash leaves drawer
        netCashChange -= amt;
        if (tx.provider === 'mpesa') netMpesaAgentChange += amt;
        else if (tx.provider === 'tigo') netTigoAgentChange += amt;
        else if (tx.provider === 'airtel') netAirtelAgentChange += amt;
        else if (tx.provider === 'halopesa') netHalopesaAgentChange += amt;
      } else if (tx.type === 'deposit') {
        // Kuweka Pesa: customer gives cash into drawer (+amt), float leaves Agent line (-amt)
        netCashChange += amt;
        if (tx.provider === 'mpesa') netMpesaAgentChange -= amt;
        else if (tx.provider === 'tigo') netTigoAgentChange -= amt;
        else if (tx.provider === 'airtel') netAirtelAgentChange -= amt;
        else if (tx.provider === 'halopesa') netHalopesaAgentChange -= amt;
      }
    });

    const currentCash = baseCash + netCashChange;

    const currentMpesaAgent = baseMpesaAgent + netMpesaAgentChange;
    const currentTigoAgent = baseTigoAgent + netTigoAgentChange;
    const currentAirtelAgent = baseAirtelAgent + netAirtelAgentChange;
    const currentHalopesaAgent = baseHalopesaAgent + netHalopesaAgentChange;
    const totalAgentFloat = currentMpesaAgent + currentTigoAgent + currentAirtelAgent + currentHalopesaAgent;

    const currentMpesaLipa = baseMpesaLipa + netMpesaLipaChange;
    const currentTigoLipa = baseTigoLipa + netTigoLipaChange;
    const currentAirtelLipa = baseAirtelLipa + netAirtelLipaChange;
    const currentHalopesaLipa = baseHalopesaLipa + netHalopesaLipaChange;
    const totalLipaFloat = currentMpesaLipa + currentTigoLipa + currentAirtelLipa + currentHalopesaLipa;

    const currentTotalFloat = totalAgentFloat + totalLipaFloat;
    const currentTotalCapital = currentCash + currentTotalFloat;

    return {
      currentCash,
      // 4 Agent lines
      currentMpesaAgent,
      currentTigoAgent,
      currentAirtelAgent,
      currentHalopesaAgent,
      totalAgentFloat,
      // 4 Lipa lines
      currentMpesaLipa,
      currentTigoLipa,
      currentAirtelLipa,
      currentHalopesaLipa,
      totalLipaFloat,
      // Aggregates
      currentTotalFloat,
      currentTotalCapital,
      totalLipaProfitToday,
      hasRecordedMorning: !!currentDayLog
    };
  }, [
    currentDayLog, 
    openingCashInput, 
    openingMpesaAgentInput, 
    openingTigoAgentInput, 
    openingAirtelAgentInput, 
    openingHalopesaAgentInput,
    openingMpesaLipaInput,
    openingTigoLipaInput,
    openingAirtelLipaInput,
    openingHalopesaLipaInput,
    todayTransactions
  ]);

  const handleSaveMorningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const logId = currentDayLog ? currentDayLog.id : generateUniqueId('wlog');
      const cashVal = Number(openingCashInput) || 0;
      
      const mpesaAgentVal = Number(openingMpesaAgentInput) || 0;
      const tigoAgentVal = Number(openingTigoAgentInput) || 0;
      const airtelAgentVal = Number(openingAirtelAgentInput) || 0;
      const halopesaAgentVal = Number(openingHalopesaAgentInput) || 0;

      const mpesaLipaVal = Number(openingMpesaLipaInput) || 0;
      const tigoLipaVal = Number(openingTigoLipaInput) || 0;
      const airtelLipaVal = Number(openingAirtelLipaInput) || 0;
      const halopesaLipaVal = Number(openingHalopesaLipaInput) || 0;

      const newLog: WakalaDayLog = {
        id: logId,
        branchId,
        date: todayDate,
        openingCash: cashVal,
        openingFloatMpesaAgent: mpesaAgentVal,
        openingFloatTigoAgent: tigoAgentVal,
        openingFloatAirtelAgent: airtelAgentVal,
        openingFloatHalopesaAgent: halopesaAgentVal,
        openingFloatMpesaLipa: mpesaLipaVal,
        openingFloatTigoLipa: tigoLipaVal,
        openingFloatAirtelLipa: airtelLipaVal,
        openingFloatHalopesaLipa: halopesaLipaVal,
        // Compatibility
        openingFloatMpesa: mpesaAgentVal + mpesaLipaVal,
        openingFloatTigo: tigoAgentVal + tigoLipaVal,
        openingFloatAirtel: airtelAgentVal + airtelLipaVal,
        openingFloatHalopesa: halopesaAgentVal + halopesaLipaVal,
        openingFloatBank: 0,
        calculatedCash: liveBalances.currentCash,
        calculatedFloats: {
          mpesaAgent: liveBalances.currentMpesaAgent,
          tigoAgent: liveBalances.currentTigoAgent,
          airtelAgent: liveBalances.currentAirtelAgent,
          halopesaAgent: liveBalances.currentHalopesaAgent,
          mpesaLipa: liveBalances.currentMpesaLipa,
          tigoLipa: liveBalances.currentTigoLipa,
          airtelLipa: liveBalances.currentAirtelLipa,
          halopesaLipa: liveBalances.currentHalopesaLipa,
          mpesa: liveBalances.currentMpesaAgent + liveBalances.currentMpesaLipa,
          tigo: liveBalances.currentTigoAgent + liveBalances.currentTigoLipa,
          airtel: liveBalances.currentAirtelAgent + liveBalances.currentAirtelLipa,
          halopesa: liveBalances.currentHalopesaAgent + liveBalances.currentHalopesaLipa,
          bank: 0
        },
        status: 'open',
        createdAt: currentDayLog ? currentDayLog.createdAt : new Date().toISOString(),
        isSynced: false
      };

      await db.wakalaDayLogs.put(newLog);
      await queueSync('wakalaDayLogs', logId, currentDayLog ? 'update' : 'create', newLog);
      setIsEditingMorningBalance(false);
      setMorningSavedSuccess(true);
      setTimeout(() => setMorningSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving morning balance:', err);
      alert('Hitilafu katika kuhifadhi salio la asubuhi.');
    }
  };

  const [provider, setProvider] = useState<WakalaProvider>('mpesa');
  const [txType, setTxType] = useState<WakalaTxType>('withdrawal');
  const [withdrawalMethod, setWithdrawalMethod] = useState<WakalaWithdrawalMethod>('lipa_namba');
  // lipaMode: 'balance' = Mteja anatoa salio lililopo simuni (Reverse)
  //           'cash' = Mteja anataka cash kamili mkononi (Forward)
  const [lipaMode, setLipaMode] = useState<'balance' | 'cash'>('balance');
  const [amount, setAmount] = useState<number | ''>('');
  const [customWakalaFee, setCustomWakalaFee] = useState<number | ''>('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const currentAmountNum = Number(amount) || 0;
  const isLipaNamba = txType === 'withdrawal' && withdrawalMethod === 'lipa_namba';

  // 1. Balance Mode Calculation (Reverse - e.g. Mteja ana 5,000 simuni)
  const balanceResult = (isLipaNamba && lipaMode === 'balance' && currentAmountNum > 0)
    ? calculateLipaFromPhoneBalance(currentAmountNum, customWakalaFee !== '' ? Number(customWakalaFee) : undefined)
    : null;

  // 2. Cash Mode Calculation (Forward - e.g. Mteja anataka 5,000 taslimu)
  const lipaTariff = (isLipaNamba && lipaMode === 'cash' && currentAmountNum > 0)
    ? findLipaTariff(currentAmountNum)
    : null;

  // Standard Wakala Fee
  const standardWakalaFee = isLipaNamba
    ? (lipaMode === 'balance' ? (balanceResult?.tier.wakalaTakes || 0) : (lipaTariff?.wakalaTakes || 0))
    : 0;

  const actualWakalaFee = customWakalaFee !== '' ? Number(customWakalaFee) : standardWakalaFee;

  // Figures for Lipa Transaction:
  // - cashGivenToCustomer: kiasi cha cash kinachotoka drooni na kupewa mteja
  // - amountSentViaLipa: kiasi mteja anachotuma kwa Lipa Namba (kinaingia Lipa float)
  // - networkCharge: makato ya mtandao (Vodacom/Tigo nk) kwenye simu ya mteja
  let cashGivenToCustomer = currentAmountNum;
  let amountSentViaLipa = currentAmountNum;
  let networkCharge = 0;

  if (isLipaNamba) {
    if (lipaMode === 'balance') {
      if (balanceResult) {
        amountSentViaLipa = balanceResult.amountToSend;
        cashGivenToCustomer = Math.max(0, balanceResult.amountToSend - actualWakalaFee);
        networkCharge = balanceResult.lipaCharge;
      }
    } else {
      cashGivenToCustomer = currentAmountNum;
      amountSentViaLipa = currentAmountNum + actualWakalaFee;
      networkCharge = lipaTariff?.lipaCharge || 0;
    }
  }

  const calculatedCommission = isLipaNamba ? actualWakalaFee : 0;
  const totalToPayByCustomer = isLipaNamba ? amountSentViaLipa : currentAmountNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAmountNum || currentAmountNum <= 0) {
      alert('Tafadhali weka kiasi cha muamala.');
      return;
    }

    if (isLipaNamba && lipaMode === 'balance' && !balanceResult) {
      alert('Salio lililowekwa ni dogo sana kutoa kwa Lipa Namba (angalau TZS 521).');
      return;
    }

    setIsSubmitting(true);

    try {
      const txId = generateUniqueId('wtx');
      const transactionNumber = `TX-${Date.now().toString().slice(-5)}`;

      const newTx: WakalaTransaction = {
        id: txId,
        branchId,
        transactionNumber,
        provider,
        type: txType,
        withdrawalMethod: txType === 'withdrawal' ? withdrawalMethod : undefined,
        amount: isLipaNamba ? cashGivenToCustomer : currentAmountNum,
        fee: isLipaNamba ? networkCharge : 0,
        wakalaFee: isLipaNamba ? actualWakalaFee : undefined,
        lipaCharge: isLipaNamba ? networkCharge : undefined,
        totalCollectedFromCustomer: isLipaNamba ? amountSentViaLipa : currentAmountNum,
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
      {/* 1. MORNING OPENING FLOAT & LIVE BALANCES SECTION */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-lg">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <span>Salio la Kuanzia Asubuhi (Leo)</span>
                {liveBalances.hasRecordedMorning && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Tayari
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {liveBalances.hasRecordedMorning ? 'Fuatilia cash na float inayobadilika mubashara' : 'Weka cash na float ulizoanza nazo leo'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingMorningBalance(prev => !prev)}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
          >
            <Edit3 className="w-3 h-3 text-amber-400" />
            <span>{isEditingMorningBalance ? 'Funga' : (liveBalances.hasRecordedMorning ? 'Badilisha' : 'Rekodi')}</span>
          </button>
        </div>

        {/* Live Capital Summary Strip (Always shown when not editing) */}
        {!isEditingMorningBalance && (
          <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-800/90 p-2 rounded-xl border border-emerald-500/30">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Cash Drooni Sasa</div>
                <div className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">
                  {formatCurrency(liveBalances.currentCash)}
                </div>
              </div>
              <div className="bg-slate-800/90 p-2 rounded-xl border border-blue-500/30">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Float Wakala (Laini 4)</div>
                <div className="text-xs sm:text-sm font-black text-blue-400 mt-0.5">
                  {formatCurrency(liveBalances.totalAgentFloat)}
                </div>
              </div>
              <div className="bg-slate-800/90 p-2 rounded-xl border border-indigo-500/30">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Float Lipa (Laini 4)</div>
                <div className="text-xs sm:text-sm font-black text-indigo-400 mt-0.5">
                  {formatCurrency(liveBalances.totalLipaFloat)}
                </div>
              </div>
              <div className="bg-slate-800/90 p-2 rounded-xl border border-amber-500/30">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Mtaji Wote (Cash+Float)</div>
                <div className="text-xs sm:text-sm font-black text-amber-300 mt-0.5">
                  {formatCurrency(liveBalances.currentTotalCapital)}
                </div>
              </div>
            </div>

            {/* Dropdown Toggle Bar for Line Details */}
            <div className="pt-1.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsLinesBreakdownOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/70 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all group active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-200 text-[11px] sm:text-xs">
                    Mchanganuo wa Laini Zote 8 (Voda, Tigo, Airtel, Halo)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold hidden xs:inline-block">
                    {isLinesBreakdownOpen ? 'Wazi' : 'Imefungwa'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold group-hover:text-amber-300">
                  <span>{isLinesBreakdownOpen ? 'Funga Mchanganuo' : 'Fungua Laini (8)'}</span>
                  {isLinesBreakdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400 transition-transform" />
                  )}
                </div>
              </button>
            </div>

            {/* Collapsible Line Breakdown Content - Defaults to closed */}
            {isLinesBreakdownOpen && (
              <div className="space-y-2 pt-1 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* View Mode Filter Tabs */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-400">Chuja Laini:</span>
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFloatViewMode('all')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        floatViewMode === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Laini Zote (8)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloatViewMode('agent')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        floatViewMode === 'agent' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📱 Wakala (4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloatViewMode('lipa')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        floatViewMode === 'lipa' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🏷️ Lipa Namba (4)
                    </button>
                  </div>
                </div>

                {/* Individual Network Floats Breakdown - 4 Agent Lines */}
                {(floatViewMode === 'all' || floatViewMode === 'agent') && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-1">
                      <span>📱 Laini 4 za Wakala Kawaida (Kumuwekea Mteja)</span>
                      <span className="text-slate-400 font-normal">| Jumla: {formatCurrency(liveBalances.totalAgentFloat)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-red-500/20 flex justify-between items-center">
                        <span className="text-red-400 font-bold truncate">Voda Wakala:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentMpesaAgent)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-blue-500/20 flex justify-between items-center">
                        <span className="text-blue-400 font-bold truncate">Tigo Wakala:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentTigoAgent)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-rose-500/20 flex justify-between items-center">
                        <span className="text-rose-400 font-bold truncate">Airtel Wakala:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentAirtelAgent)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-amber-500/20 flex justify-between items-center">
                        <span className="text-amber-400 font-bold truncate">Halotel Wakala:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentHalopesaAgent)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Network Floats Breakdown - 4 Lipa Lines */}
                {(floatViewMode === 'all' || floatViewMode === 'lipa') && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[9px] font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                      <span>🏷️ Laini 4 za Lipa Namba (Kupokea Mteja Anayetoa Lipa)</span>
                      <span className="text-slate-400 font-normal">| Jumla: {formatCurrency(liveBalances.totalLipaFloat)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-red-500/20 flex justify-between items-center">
                        <span className="text-red-400 font-bold truncate">Voda Lipa:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentMpesaLipa)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-blue-500/20 flex justify-between items-center">
                        <span className="text-blue-400 font-bold truncate">Tigo Lipa:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentTigoLipa)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-rose-500/20 flex justify-between items-center">
                        <span className="text-rose-400 font-bold truncate">Airtel Lipa:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentAirtelLipa)}</span>
                      </div>
                      <div className="bg-slate-950/70 px-2 py-1.5 rounded-lg border border-amber-500/20 flex justify-between items-center">
                        <span className="text-amber-400 font-bold truncate">Halotel Lipa:</span>
                        <span className="font-extrabold text-slate-200">{formatCurrency(liveBalances.currentHalopesaLipa)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Morning Setup Form (when editing or first time) */}
        {isEditingMorningBalance && (
          <form onSubmit={handleSaveMorningBalance} className="space-y-3.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300">
                Salio la Kuanzia Asubuhi (Laini Zote 8 + Cash Drooni):
              </span>
              <span className="text-[10px] text-slate-400">Weka kiasi kilichopo kila laini</span>
            </div>

            {/* 1. Cash In Drawer */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/30">
              <label className="block text-[11px] font-extrabold text-emerald-400 mb-1">
                💵 Cash Drooni / Mkononi (TZS):
              </label>
              <input
                type="number"
                value={openingCashInput}
                onChange={e => setOpeningCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-emerald-300 font-black focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 2. Laini 4 za Wakala Kawaida */}
            <div className="p-2.5 bg-blue-950/20 rounded-xl border border-blue-500/30 space-y-2">
              <div className="text-[11px] font-extrabold text-blue-300 flex items-center gap-1.5">
                <span>📱 1. Laini 4 za Wakala Kawaida (Kumuwekea Mteja)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-red-400 mb-0.5">Vodacom Wakala:</label>
                  <input
                    type="number"
                    value={openingMpesaAgentInput}
                    onChange={e => setOpeningMpesaAgentInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-400 mb-0.5">Tigo Pesa Wakala:</label>
                  <input
                    type="number"
                    value={openingTigoAgentInput}
                    onChange={e => setOpeningTigoAgentInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-400 mb-0.5">Airtel Money Wakala:</label>
                  <input
                    type="number"
                    value={openingAirtelAgentInput}
                    onChange={e => setOpeningAirtelAgentInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-400 mb-0.5">HaloPesa Wakala:</label>
                  <input
                    type="number"
                    value={openingHalopesaAgentInput}
                    onChange={e => setOpeningHalopesaAgentInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Laini 4 za Lipa Namba */}
            <div className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="text-[11px] font-extrabold text-emerald-300 flex items-center gap-1.5">
                <span>🏷️ 2. Laini 4 za Lipa Namba (Kupokea Mteja Anayetoa Lipa)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-red-400 mb-0.5">Vodacom Lipa Namba:</label>
                  <input
                    type="number"
                    value={openingMpesaLipaInput}
                    onChange={e => setOpeningMpesaLipaInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-400 mb-0.5">Tigo Lipa Namba:</label>
                  <input
                    type="number"
                    value={openingTigoLipaInput}
                    onChange={e => setOpeningTigoLipaInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-400 mb-0.5">Airtel Lipa Namba:</label>
                  <input
                    type="number"
                    value={openingAirtelLipaInput}
                    onChange={e => setOpeningAirtelLipaInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-400 mb-0.5">Halotel Lipa Namba:</label>
                  <input
                    type="number"
                    value={openingHalopesaLipaInput}
                    onChange={e => setOpeningHalopesaLipaInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Hifadhi Salio la Laini Zote 8</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingMorningBalance(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl"
              >
                Ghairi
              </button>
            </div>
          </form>
        )}

        {morningSavedSuccess && (
          <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold text-center animate-bounce">
            ✓ Salio la kuanzia asubuhi limehifadhiwa vizuri!
          </div>
        )}
      </div>

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

        </div>
      )}

      {/* Provider Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-300 uppercase tracking-wider">Chagua Mtandao:</span>
          <span className="text-amber-350 text-[10px] font-semibold">
            {txType === 'deposit' && (
              <span className="text-blue-400">📱 Inatumika Laini ya Wakala Kawaida</span>
            )}
            {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && (
              <span className="text-emerald-400">🏷️ Inatumika Laini ya Lipa Namba</span>
            )}
            {txType === 'withdrawal' && withdrawalMethod === 'agent_kawaida' && (
              <span className="text-blue-400">📱 Inatumika Laini ya Wakala Kawaida</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          {/* Sub-mode selector for Lipa Namba (Reverse vs Forward) */}
          {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && (
            <div className="bg-slate-900/95 p-2 rounded-2xl border border-emerald-500/30 space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase text-slate-400 px-1 flex items-center justify-between">
                <span>Chagua Mtindo wa Kutoa:</span>
                <span className="text-emerald-400 font-bold text-[10px]">
                  {lipaMode === 'balance' ? '📱 Mteja Anatoa Salio la Simuni' : '💵 Mteja Anataka Cash Mkononi'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLipaMode('balance');
                    setCustomWakalaFee('');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                    lipaMode === 'balance'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 border border-emerald-400 ring-2 ring-emerald-400/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Salio la Simuni (Reverse)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLipaMode('cash');
                    setCustomWakalaFee('');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                    lipaMode === 'cash'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50 border border-blue-400 ring-2 ring-blue-400/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Cash Kamili Mkononi</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-200">
                {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba'
                  ? (lipaMode === 'balance' ? 'Salio Lililopo Kwenye Simu ya Mteja (TZS) *:' : 'Kiasi Anachotaka Mteja Mkononi (TZS) *:')
                  : 'Kiasi cha Muamala (TZS) *:'
                }
              </label>
              {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && (
                <span className="text-[10px] text-amber-400 font-semibold">
                  {lipaMode === 'balance' ? 'Mfano: Mteja ana 5,000 simuni' : 'Mfano: Mteja anataka 5,000 taslimu'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">TZS</span>
              <input
                type="number"
                required
                min="500"
                step="500"
                placeholder={txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && lipaMode === 'balance' ? '5000' : '0'}
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

          {/* Lipa Breakdown Details Card - Balance Mode (Reverse) */}
          {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && currentAmountNum > 0 && lipaMode === 'balance' && (
            <div className="p-3.5 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl space-y-3 shadow-xl animate-in zoom-in-95">
              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Mwongozo wa Muamala (Salio: {formatCurrency(currentAmountNum)}):
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  {balanceResult ? `Kiwango: ${balanceResult.tier.rangeLabel}` : 'Chini ya Kiwango'}
                </span>
              </div>

              {balanceResult ? (
                <>
                  {/* Big Action Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/40 shadow-inner">
                      <div className="text-[10px] text-emerald-400 font-extrabold uppercase">1. Mwambie Atume Lipa:</div>
                      <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                        {formatCurrency(balanceResult.amountToSend)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Itaingia float ya Lipa</div>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/40 shadow-inner">
                      <div className="text-[10px] text-amber-400 font-extrabold uppercase">2. Mpe Cash Mkononi:</div>
                      <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                        {formatCurrency(cashGivenToCustomer)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Itatoka cash drooni</div>
                    </div>
                  </div>

                  {/* Calculations Details */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
                    <div className="flex justify-between items-center text-slate-200">
                      <span className="font-semibold text-emerald-400">Faida / Ada Yako (Wakala):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">TZS</span>
                        <input
                          type="number"
                          placeholder={standardWakalaFee.toString()}
                          value={customWakalaFee !== '' ? customWakalaFee : standardWakalaFee}
                          onChange={e => setCustomWakalaFee(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-20 px-2 py-0.5 bg-slate-900 border border-emerald-500/60 rounded-lg text-xs font-black text-right text-emerald-300 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Makato ya Mtandao (Simuni mwake):</span>
                      <span className="font-mono text-amber-400 font-bold">{formatCurrency(networkCharge)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-300">Jumla Inayokatwa Simuni kwa Mteja:</span>
                      <span className="font-black text-white">
                        {formatCurrency(amountSentViaLipa + networkCharge)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-center font-bold">
                  Salio la TZS {formatCurrency(currentAmountNum)} ni dogo mno kutoa Lipa (kiwango cha chini ni TZS 521).
                </div>
              )}
            </div>
          )}

          {/* Lipa Breakdown Details Card - Cash Mode (Forward) */}
          {txType === 'withdrawal' && withdrawalMethod === 'lipa_namba' && currentAmountNum > 0 && lipaMode === 'cash' && (
            <div className="p-3.5 bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 border-2 border-blue-500/50 rounded-2xl space-y-3 shadow-xl animate-in zoom-in-95">
              <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-blue-400" />
                  Mchanganuo wa Cash Mkononi ({formatCurrency(currentAmountNum)}):
                </span>
                <span className="text-[10px] text-slate-400">Kiwango: {lipaTariff?.rangeLabel || '500+'}</span>
              </div>

              {/* Big Action Highlights */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/40 shadow-inner">
                  <div className="text-[10px] text-emerald-400 font-extrabold uppercase">1. Mwambie Atume Lipa:</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                    {formatCurrency(amountSentViaLipa)}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Itaingia float ya Lipa</div>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/40 shadow-inner">
                  <div className="text-[10px] text-blue-400 font-extrabold uppercase">2. Mpe Cash Mkononi:</div>
                  <div className="text-base sm:text-lg font-black text-blue-300 mt-0.5">
                    {formatCurrency(cashGivenToCustomer)}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Itatoka cash drooni</div>
                </div>
              </div>

              {/* Calculations Details */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-semibold text-emerald-400">Faida / Ada Yako (Wakala):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">TZS</span>
                    <input
                      type="number"
                      placeholder={standardWakalaFee.toString()}
                      value={customWakalaFee !== '' ? customWakalaFee : standardWakalaFee}
                      onChange={e => setCustomWakalaFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 px-2 py-0.5 bg-slate-900 border border-blue-500/60 rounded-lg text-xs font-black text-right text-emerald-300 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {lipaTariff && (
                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                    <span>Makato ya Mtandao (Simuni mwake):</span>
                    <span className="font-mono text-amber-400 font-bold">{formatCurrency(networkCharge)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 text-xs">
                  <span className="font-bold text-slate-300">Simuni Anapaswa Kuwa Na Angalau:</span>
                  <span className="font-black text-amber-300">
                    {formatCurrency(amountSentViaLipa + networkCharge)}
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

          {/* Lipa Namba Real Profit Banner - ONLY shown for Lipa Namba since non-lipa commission is unknown */}
          {isLipaNamba && currentAmountNum > 0 && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-medium">
                Faida ya Wakala (Ada ya Lipa Namba):
              </span>
              <span className="font-extrabold text-emerald-400 text-sm">+{formatCurrency(actualWakalaFee)}</span>
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

