import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Shirt, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  MessageSquare, 
  Printer, 
  AlertCircle,
  Tag,
  Phone,
  User,
  Search
} from 'lucide-react';
import { db, queueSync } from '../../db/dexie';
import type { LaundryOrder, LaundryStage } from '../../types';
import { formatCurrency, formatDate, generateWhatsAppLink, generateLaundryNotificationMessage } from '../../services/receiptService';

interface LaundryPipelineProps {
  onOpenReceipt: (data: any) => void;
}

const STAGES: { id: LaundryStage; label: string; icon: string; color: string }[] = [
  { id: 'received', label: 'Imepokelewa', icon: '📥', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
  { id: 'washing', label: 'Inaosha', icon: '🧼', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
  { id: 'ironing', label: 'Pasi', icon: '💨', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  { id: 'ready', label: 'Tayari Kuchukua', icon: '✨', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  { id: 'delivered', label: 'Imekabidhiwa', icon: '🤝', color: 'border-slate-600 bg-slate-800 text-slate-400' },
];

export const LaundryPipeline: React.FC<LaundryPipelineProps> = ({ onOpenReceipt }) => {
  const [activeStage, setActiveStage] = useState<LaundryStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orders = useLiveQuery(
    async () => {
      const all = await db.laundryOrders.where('branchId').equals('branch_laundry').reverse().sortBy('createdAt');
      return all.filter(o => {
        const matchesStage = activeStage === 'all' || o.stage === activeStage;
        const matchesSearch = o.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.customerPhone.includes(searchQuery) ||
                              o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStage && matchesSearch;
      });
    },
    [activeStage, searchQuery]
  );

  const handleNextStage = async (order: LaundryOrder) => {
    let nextStage: LaundryStage = 'received';
    if (order.stage === 'received') nextStage = 'washing';
    else if (order.stage === 'washing') nextStage = 'ironing';
    else if (order.stage === 'ironing') nextStage = 'ready';
    else if (order.stage === 'ready') nextStage = 'delivered';

    const updates: Partial<LaundryOrder> = {
      stage: nextStage,
      isSynced: false
    };

    if (nextStage === 'ready') {
      // Auto open WhatsApp prompt option if ready
    } else if (nextStage === 'delivered') {
      updates.deliveredAt = new Date().toISOString();
      updates.deposit = order.totalAmount; // Collected full balance on delivery
      updates.balanceDue = 0;
      updates.paymentStatus = 'paid';
    }

    await db.laundryOrders.update(order.id, updates);
    await queueSync('laundryOrders', order.id, 'update', updates);
  };

  const handleSendReadyWhatsApp = (order: LaundryOrder) => {
    const message = generateLaundryNotificationMessage(order, 'GGS Laundry Service');
    const url = generateWhatsAppLink(order.customerPhone, message);
    window.open(url, '_blank');
  };

  const getStageCounts = () => {
    return {
      received: orders?.filter(o => o.stage === 'received').length || 0,
      washing: orders?.filter(o => o.stage === 'washing').length || 0,
      ironing: orders?.filter(o => o.stage === 'ironing').length || 0,
      ready: orders?.filter(o => o.stage === 'ready').length || 0,
    };
  };

  return (
    <div className="space-y-3 pb-24">
      
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tafuta tag (mfano: LN-101), jina au simu..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Pipeline Stage Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveStage('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeStage === 'all'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
          }`}
        >
          Hatua Zote
        </button>

        {STAGES.map(st => (
          <button
            key={st.id}
            onClick={() => setActiveStage(st.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeStage === st.id
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
            }`}
          >
            <span>{st.icon}</span>
            <span>{st.label}</span>
          </button>
        ))}
      </div>

      {/* Orders List Cards */}
      <div className="space-y-2.5">
        {orders?.map(order => {
          const currentStageObj = STAGES.find(s => s.id === order.stage) || STAGES[0];
          const totalPcs = order.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <div 
              key={order.id}
              className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-2.5 shadow-sm hover:border-slate-600 transition-all"
            >
              {/* Card Header: Tag & Customer */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-500/30">
                      TAG: {order.tagNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStageObj.color}`}>
                      {currentStageObj.icon} {currentStageObj.label}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-100 mt-1">
                    {order.customerName} <span className="text-slate-400 font-normal">({order.customerPhone})</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-100">{formatCurrency(order.totalAmount)}</div>
                  {order.balanceDue > 0 ? (
                    <div className="text-[10px] text-rose-400 font-extrabold">Baki: {formatCurrency(order.balanceDue)}</div>
                  ) : (
                    <div className="text-[10px] text-emerald-400 font-bold">Imelipwa Yote</div>
                  )}
                </div>
              </div>

              {/* Items Summary */}
              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-400 pb-0.5 border-b border-slate-800">
                  <span>{totalPcs} nguo zilizopokelewa:</span>
                  <span>Ahadi: {order.promisedDate}</span>
                </div>
                <div className="pt-0.5 text-[11px] text-slate-300">
                  {order.items.map(i => `${i.quantity}x ${i.itemType}`).join(', ')}
                </div>
                {order.notes && (
                  <div className="text-[10px] text-amber-300/90 pt-0.5 italic">
                    Note: {order.notes}
                  </div>
                )}
              </div>

              {/* Actions: Progress Stepper & WhatsApp Notification */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
                
                {/* Advance Stage Button */}
                {order.stage !== 'delivered' ? (
                  <button
                    onClick={() => handleNextStage(order)}
                    className="py-1.5 px-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-950/30 active:scale-95 transition-all"
                  >
                    <span>
                      {order.stage === 'received' && 'Anza Kuosha 🧼'}
                      {order.stage === 'washing' && 'Peleka Pasi 💨'}
                      {order.stage === 'ironing' && 'Weka "Tayari" ✨'}
                      {order.stage === 'ready' && 'Kabidhi Mteja 🤝'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tayari imekabidhiwa</span>
                  </span>
                )}

                {/* WhatsApp & Print */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendReadyWhatsApp(order)}
                    className="py-1.5 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                    title="Tuma ujumbe wa WhatsApp kwa mteja"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => onOpenReceipt({
                      type: 'laundry_order',
                      title: 'Tag ya Nguo (Laundry Slip)',
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
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl"
                    title="Chapa Risiti ya Tag"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {orders && orders.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            Hakuna nguo zilizopatikana kwenye hatua hii.
          </div>
        )}
      </div>
    </div>
  );
};
