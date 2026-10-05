import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  User, 
  MessageSquare, 
  Printer, 
  X, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { RepairOrder, RepairStatus } from '../../types';
import { formatCurrency, formatDate, generateWhatsAppLink } from '../../services/receiptService';

interface PhoneRepairsProps {
  onOpenReceipt: (data: any) => void;
}

export const PhoneRepairs: React.FC<PhoneRepairsProps> = ({ onOpenReceipt }) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [sparePartsCost, setSparePartsCost] = useState<number | ''>(0);
  const [laborCost, setLaborCost] = useState<number | ''>(15000);
  const [deposit, setDeposit] = useState<number | ''>(0);
  const [technician, setTechnician] = useState('Fundi Salum');
  const [notes, setNotes] = useState('');

  const repairs = useLiveQuery(
    async () => {
      const all = await db.repairs.where('branchId').equals('branch_phone').reverse().sortBy('createdAt');
      return all.filter(r => {
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        const matchesSearch = r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.customerPhone.includes(searchQuery) ||
                              r.phoneModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.repairNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });
    },
    [searchQuery, statusFilter]
  );

  const totalCalculated = (Number(sparePartsCost) || 0) + (Number(laborCost) || 0);
  const balanceDueCalculated = Math.max(0, totalCalculated - (Number(deposit) || 0));

  const handleSaveRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !phoneModel.trim() || !issueDescription.trim()) {
      alert('Tafadhali jaza jina la mteja, namba ya simu, aina ya simu na tatizo.');
      return;
    }

    try {
      const newId = generateUniqueId('rep');
      const repairNumber = `REP-${Date.now().toString().slice(-4)}`;

      const newRepair: RepairOrder = {
        id: newId,
        branchId: 'branch_phone',
        repairNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        phoneModel: phoneModel.trim(),
        imeiOrSerial: imeiOrSerial.trim() || undefined,
        issueDescription: issueDescription.trim(),
        sparePartsCost: Number(sparePartsCost) || 0,
        laborCost: Number(laborCost) || 0,
        totalCost: totalCalculated,
        deposit: Number(deposit) || 0,
        balanceDue: balanceDueCalculated,
        status: 'received',
        technician: technician.trim() || 'Fundi',
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      await db.repairs.put(newRepair);
      await queueSync('repairs', newId, 'create', newRepair);

      setIsNewModalOpen(false);

      // Open receipt for the repair job
      onOpenReceipt({
        type: 'phone_repair',
        title: 'Kazi ya Matengenezo (Phone Repair Ticket)',
        branchName: 'Duka la Simu & Vifaa',
        branchPhone: '+255 712 345 678',
        branchLocation: 'Mwenge / Mlimani City Branch',
        receiptNumber: newRepair.repairNumber,
        createdAt: newRepair.createdAt,
        customerName: newRepair.customerName,
        customerPhone: newRepair.customerPhone,
        items: [
          { name: `Matengenezo: ${newRepair.phoneModel} (${newRepair.issueDescription})`, qty: 1, price: newRepair.totalCost, total: newRepair.totalCost }
        ],
        totalAmount: newRepair.totalCost,
        paidAmount: newRepair.deposit,
        balanceDue: newRepair.balanceDue,
        notes: `Fundi: ${newRepair.technician}`
      });

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setPhoneModel('');
      setImeiOrSerial('');
      setIssueDescription('');
      setSparePartsCost(0);
      setLaborCost(15000);
      setDeposit(0);
      setNotes('');
    } catch (err) {
      console.error('Error saving repair:', err);
      alert('Imeshindwa kuhifadhi taarifa ya matengenezo.');
    }
  };

  const handleUpdateStatus = async (repair: RepairOrder, newStatus: RepairStatus) => {
    try {
      const updates: Partial<RepairOrder> = {
        status: newStatus,
        isSynced: false
      };

      if (newStatus === 'ready') {
        updates.readyAt = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.deliveredAt = new Date().toISOString();
        updates.deposit = repair.totalCost; // Paid in full
        updates.balanceDue = 0;
      }

      await db.repairs.update(repair.id, updates);
      await queueSync('repairs', repair.id, 'update', updates);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSendReadyWhatsApp = (repair: RepairOrder) => {
    const msg = `Habari ${repair.customerName},\n\nSimu yako ya *${repair.phoneModel}* (Namba: *${repair.repairNumber}*) imekamilika kufanyiwa matengenezo na ipo *TAYARI* kuchukuliwa!\n\nBaki ya kulipa: *${formatCurrency(repair.balanceDue)}*.\n\nKaribu ofisini Duka la Simu!`;
    const url = generateWhatsAppLink(repair.customerPhone, msg);
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'received':
        return { label: 'Imepokelewa', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'in_progress':
        return { label: 'Inatengenezwa', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'ready':
        return { label: 'Tayari Kuchukuliwa', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'delivered':
        return { label: 'Imekabidhiwa', color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div className="space-y-3 pb-24">
      
      {/* Header & Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta mteja, namba ya simu au repair ticket..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 shrink-0 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Pokea Simu</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Zote' },
          { id: 'received', label: 'Zilizopokelewa' },
          { id: 'in_progress', label: 'Zinazotengenezwa' },
          { id: 'ready', label: 'Tayari Kuchukua' },
          { id: 'delivered', label: 'Zilizokabidhiwa' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Repairs List */}
      <div className="space-y-2.5">
        {repairs?.map(item => {
          const badge = getStatusBadge(item.status);
          return (
            <div 
              key={item.id}
              className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-blue-400 font-mono">{item.repairNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 mt-1">{item.phoneModel}</h3>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-100">{formatCurrency(item.totalCost)}</div>
                  {item.balanceDue > 0 ? (
                    <div className="text-[10px] text-rose-400 font-bold">Baki: {formatCurrency(item.balanceDue)}</div>
                  ) : (
                    <div className="text-[10px] text-emerald-400 font-bold">Imelipwa Yote</div>
                  )}
                </div>
              </div>

              {/* Issue Description */}
              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400 font-medium">Tatizo: </span>
                {item.issueDescription}
              </div>

              {/* Customer & Technician info */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.customerName} ({item.customerPhone})</span>
                </div>
                <div>Fundi: <b className="text-slate-300">{item.technician}</b></div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
                
                {/* Status Stepper Button */}
                <div className="flex items-center gap-1">
                  {item.status === 'received' && (
                    <button
                      onClick={() => handleUpdateStatus(item, 'in_progress')}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <span>Anza Kazi</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {item.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(item, 'ready')}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Weka "Tayari"</span>
                    </button>
                  )}
                  {item.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(item, 'delivered')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Kabidhi Mteja & Malizia</span>
                    </button>
                  )}
                </div>

                {/* WhatsApp & Print Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendReadyWhatsApp(item)}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Tuma SMS/WhatsApp kwa mteja"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => onOpenReceipt({
                      type: 'phone_repair',
                      title: 'Kazi ya Matengenezo (Ticket)',
                      branchName: 'Duka la Simu & Vifaa',
                      branchPhone: '+255 712 345 678',
                      branchLocation: 'Mwenge / Mlimani City Branch',
                      receiptNumber: item.repairNumber,
                      createdAt: item.createdAt,
                      customerName: item.customerName,
                      customerPhone: item.customerPhone,
                      items: [{ name: `Matengenezo: ${item.phoneModel}`, qty: 1, price: item.totalCost, total: item.totalCost }],
                      totalAmount: item.totalCost,
                      paidAmount: item.deposit,
                      balanceDue: item.balanceDue,
                      notes: `Tatizo: ${item.issueDescription}`
                    })}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
                    title="Chapa Risiti"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Repair Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-400" />
                Pokea Simu ya Matengenezo (New Job)
              </span>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRepair} className="p-4 space-y-3 overflow-y-auto flex-1">
              
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Jina la Mteja *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Mteja"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Simu ya Mteja *:</label>
                  <input
                    type="tel"
                    required
                    placeholder="0712..."
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Phone Model & IMEI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Aina ya Simu *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Samsung A12 / iPhone 11"
                    value={phoneModel}
                    onChange={e => setPhoneModel(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">IMEI / Namba (Hiari):</label>
                  <input
                    type="text"
                    placeholder="IMEI"
                    value={imeiOrSerial}
                    onChange={e => setImeiOrSerial(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Issue description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Maelezo ya Tatizo *:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Kioo kimepasuka, haichaji, maji yaliingia, n.k."
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Costs Breakdown */}
              <div className="p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Gharama ya Spea (TZS):</label>
                    <input
                      type="number"
                      min="0"
                      value={sparePartsCost}
                      onChange={e => setSparePartsCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Ufundi / Labor (TZS):</label>
                    <input
                      type="number"
                      min="0"
                      value={laborCost}
                      onChange={e => setLaborCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Malipo ya Awali (Deposit):</label>
                    <input
                      type="number"
                      min="0"
                      value={deposit}
                      onChange={e => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Jina la Fundi:</label>
                    <input
                      type="text"
                      value={technician}
                      onChange={e => setTechnician(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Jumla: <b className="text-slate-100">{formatCurrency(totalCalculated)}</b></span>
                  <span className="text-rose-400 font-bold">Baki: {formatCurrency(balanceDueCalculated)}</span>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hifadhi & Toa Risiti ya Kupokelea</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
