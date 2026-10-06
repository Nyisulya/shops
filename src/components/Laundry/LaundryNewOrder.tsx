import React, { useState } from 'react';
import { 
  Shirt, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  Check, 
  Sparkles, 
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  Flame,
  Droplets,
  Layers
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { LaundryOrder, LaundryItem, LaundryServiceType } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import confetti from 'canvas-confetti';
import { LaundryExpenseModal } from './LaundryExpenseModal';

interface LaundryNewOrderProps {
  onOrderComplete: (order: LaundryOrder) => void;
  branchId?: string;
}

export const LAUNDRY_SERVICES: { id: LaundryServiceType; label: string; icon: string; badge: string; defaultPrice: number }[] = [
  { id: 'wash_iron', label: 'Kufua & Kupasi', icon: '👔', badge: 'Kamili', defaultPrice: 1000 },
  { id: 'iron_only', label: 'Kupasi Tu', icon: '♨️', badge: 'Pasi Pekee', defaultPrice: 500 },
  { id: 'wash_only', label: 'Kufua Tu', icon: '🧼', badge: 'Kufua Pekee', defaultPrice: 700 },
  { id: 'dry_clean', label: 'Dry Clean', icon: '🤵', badge: 'Nguo Maalum', defaultPrice: 3000 },
];

// Preset popular clothes
const PRESET_CLOTHES = [
  { name: 'Shati / T-Shirt / Blauzi', ironPrice: 500, washIronPrice: 1000, washPrice: 500, dryCleanPrice: 2000, icon: '👕' },
  { name: 'Suruali / Jinzi / Sketi', ironPrice: 500, washIronPrice: 1000, washPrice: 500, dryCleanPrice: 2000, icon: '👖' },
  { name: 'Koti / Sweta / Jacket', ironPrice: 1000, washIronPrice: 2000, washPrice: 1000, dryCleanPrice: 3000, icon: '🧥' },
  { name: 'Shuka / Mashuka / Mapazia', ironPrice: 1000, washIronPrice: 2000, washPrice: 1500, dryCleanPrice: 3000, icon: '🛏️' },
  { name: 'Suti (Full Suit 2/3 pcs)', ironPrice: 2000, washIronPrice: 4000, washPrice: 2500, dryCleanPrice: 5000, icon: '🤵' },
  { name: 'Viatu (Sneakers / Canvas)', ironPrice: 0, washIronPrice: 2000, washPrice: 1500, dryCleanPrice: 2500, icon: '👟' },
  { name: 'Blanket Kubwa / Duvet', ironPrice: 2000, washIronPrice: 5000, washPrice: 4000, dryCleanPrice: 6000, icon: '🛌' },
];

export const LaundryNewOrder: React.FC<LaundryNewOrderProps> = ({ 
  onOrderComplete,
  branchId = 'branch_laundry_1'
}) => {
  const [selectedService, setSelectedService] = useState<LaundryServiceType>('wash_iron');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customClothCount, setCustomClothCount] = useState<number | ''>(1);
  const [customPrice, setCustomPrice] = useState<number | ''>(1000);
  const [discount, setDiscount] = useState<number | ''>('');
  const [paidAmount, setPaidAmount] = useState<number | ''>(1000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'airtel' | 'tigo' | 'bank'>('cash');
  const [itemsList, setItemsList] = useState<{ id: string; name: string; qty: number; price: number; service: LaundryServiceType }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine preset price depending on active service
  const getPresetPrice = (preset: typeof PRESET_CLOTHES[0], service: LaundryServiceType) => {
    switch (service) {
      case 'iron_only': return preset.ironPrice || 500;
      case 'wash_only': return preset.washPrice;
      case 'dry_clean': return preset.dryCleanPrice;
      case 'wash_iron':
      default:
        return preset.washIronPrice;
    }
  };

  // Switch service mode and adjust default manual price if items empty
  const handleServiceChange = (service: LaundryServiceType) => {
    setSelectedService(service);
    const serviceCfg = LAUNDRY_SERVICES.find(s => s.id === service);
    const defaultP = serviceCfg?.defaultPrice || 1000;
    setCustomPrice(defaultP);
    if (itemsList.length === 0 && customClothCount !== '') {
      const sub = Number(customClothCount) * defaultP;
      const net = Math.max(0, sub - (Number(discount) || 0));
      setPaidAmount(net);
    }
  };

  // Quick Preset Add
  const handleAddPreset = (preset: typeof PRESET_CLOTHES[0]) => {
    const unitPrice = getPresetPrice(preset, selectedService);
    const serviceLabel = LAUNDRY_SERVICES.find(s => s.id === selectedService)?.label || '';
    const itemName = `${preset.name} (${serviceLabel})`;

    setItemsList(prev => {
      const exist = prev.find(i => i.name === itemName && i.service === selectedService);
      let nextList;
      if (exist) {
        nextList = prev.map(i => (i.name === itemName && i.service === selectedService) ? { ...i, qty: i.qty + 1 } : i);
      } else {
        nextList = [...prev, { 
          id: generateUniqueId('item'), 
          name: itemName, 
          qty: 1, 
          price: unitPrice,
          service: selectedService
        }];
      }
      const newItemsTotal = nextList.reduce((sum, i) => sum + (i.price * i.qty), 0);
      const newFinal = Math.max(0, newItemsTotal - (Number(discount) || 0));
      setPaidAmount(newFinal);
      return nextList;
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setItemsList(prev => {
      const nextList = prev.map(i => {
        if (i.id === id) {
          const newQty = i.qty + delta;
          return newQty > 0 ? { ...i, qty: newQty } : null;
        }
        return i;
      }).filter(Boolean) as any;

      const newItemsTotal = nextList.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0);
      const newFinal = Math.max(0, newItemsTotal - (Number(discount) || 0));
      setPaidAmount(newFinal);
      return nextList;
    });
  };

  // Total Calculation with Discount
  const hasItems = itemsList.length > 0;
  const itemsTotal = itemsList.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const manualTotal = (Number(customClothCount) || 0) * (Number(customPrice) || 0);
  const subTotalAmount = hasItems ? itemsTotal : manualTotal;
  const numDiscount = Number(discount) || 0;
  const finalTotalAmount = Math.max(0, subTotalAmount - numDiscount);

  const actualPaid = paidAmount === '' ? finalTotalAmount : Number(paidAmount);
  const balanceDue = Math.max(0, finalTotalAmount - actualPaid);

  const handleApplyDiscount = (discVal: number | '') => {
    setDiscount(discVal);
    const discNum = Number(discVal) || 0;
    const newNet = Math.max(0, subTotalAmount - discNum);
    setPaidAmount(newNet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalTotalAmount <= 0 && subTotalAmount <= 0) {
      alert('Tafadhali weka kiasi cha mapato ya kufulia.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = generateUniqueId('lnd');
      const orderNumber = `GGS-${Date.now().toString().slice(-4)}`;
      const activeServiceLabel = LAUNDRY_SERVICES.find(s => s.id === selectedService)?.label || 'Huduma ya Kufua';

      const finalItems: LaundryItem[] = hasItems 
        ? itemsList.map(i => ({
            id: i.id,
            itemType: i.name,
            service: i.service,
            quantity: i.qty,
            pricePerItem: i.price,
            totalPrice: i.price * i.qty
          }))
        : [{
            id: generateUniqueId('item'),
            itemType: `${activeServiceLabel} (${customClothCount} pcs)`,
            service: selectedService,
            quantity: Number(customClothCount) || 1,
            pricePerItem: Number(customPrice) || 1000,
            totalPrice: subTotalAmount
          }];

      const newOrder: LaundryOrder = {
        id: newId,
        branchId: localStorage.getItem('active_branch_id') || branchId,
        orderNumber,
        tagNumber: `#${Date.now().toString().slice(-4)}`,
        customerName: customerName.trim() || 'Mteja wa Kawaida',
        customerPhone: customerPhone.trim() || '-',
        items: finalItems,
        subtotal: subTotalAmount,
        discount: numDiscount,
        totalAmount: finalTotalAmount,
        deposit: actualPaid,
        balanceDue: balanceDue,
        paymentStatus: balanceDue === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'pending'),
        stage: 'delivered',
        promisedDate: 'Leo',
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      await db.laundryOrders.put(newOrder);
      await queueSync('laundryOrders', newId, 'create', newOrder);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      } catch (e) {}

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setItemsList([]);
      setCustomClothCount(1);
      setCustomPrice(1000);
      setDiscount('');
      setPaidAmount(1000);

      onOrderComplete(newOrder);
    } catch (err) {
      console.error('Error saving laundry order:', err);
      alert('Imeshindwa kurekodi mapato ya kufua.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-28">
      
      {/* Top Banner with Quick Matumizi Button */}
      <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-slate-900 border border-teal-500/40 p-3.5 rounded-3xl space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">GGS Laundry & Ironing</h2>
              <div className="text-[10px] text-teal-300">Rekodi Mapato ya Kufua & Kupasi</div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <DollarSign className="w-3.5 h-3.5 text-rose-400" />
            <span>Rekodi Matumizi</span>
          </button>
        </div>

        {/* 4 Service Type Switcher (Kufua & Kupasi, Kupasi Tu, Kufua Tu, Dry Clean) */}
        <div className="pt-2 border-t border-teal-500/20">
          <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider mb-1.5">
            Chagua Huduma:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {LAUNDRY_SERVICES.map(s => {
              const isSelected = selectedService === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleServiceChange(s.id)}
                  className={`p-2 rounded-xl border text-left transition-all active:scale-95 flex items-center justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-extrabold ring-2 ring-teal-400/40'
                      : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">{s.icon}</span>
                    <div className="truncate">
                      <div className="text-xs truncate font-bold">{s.label}</div>
                      <div className={`text-[9px] ${isSelected ? 'text-teal-950 font-semibold' : 'text-teal-400'}`}>
                        {s.badge}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* Customer Information Card (Optional) */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-2.5 shadow-md">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>Taarifa za Mteja (Hiari)</span>
            </div>
            <span className="text-[10px] text-slate-400 lowercase font-normal">si lazima kuweka</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Jina la Mteja:</label>
              <input
                type="text"
                placeholder="mfano: Mama Ashura au Juma"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Namba ya Simu:</label>
              <input
                type="tel"
                placeholder="0712 345 678"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Laundry Items Selector */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-2.5 shadow-md">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Chagua Nguo za Kufuliwa:</span>
            <span className="text-[10px] text-teal-400">Bonyeza kuongeza</span>
          </div>

          {/* Quick preset pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {PRESET_CLOTHES.map((cloth, idx) => {
              const currentPrice = getPresetPrice(cloth, selectedService);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(cloth)}
                  className="p-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-left transition-all active:scale-95 flex items-center justify-between gap-1"
                >
                  <div className="truncate">
                    <div className="text-xs text-slate-200 truncate">{cloth.icon} {cloth.name}</div>
                    <div className="text-[10px] font-bold text-teal-400">{formatCurrency(currentPrice)}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Selected Items List if any */}
          {itemsList.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-300">Orodha ya Nguo Zilizochaguliwa:</div>
              {itemsList.map(item => {
                const serviceInfo = LAUNDRY_SERVICES.find(s => s.id === item.service);
                return (
                  <div key={item.id} className="p-2 bg-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="truncate max-w-[170px]">
                      <span className="text-slate-200 font-medium truncate">{item.name}</span>
                      <div className="text-[9px] text-teal-400 font-semibold">{serviceInfo?.icon} {serviceInfo?.label}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-black"
                      >
                        -
                      </button>
                      <span className="font-bold text-slate-100 min-w-[20px] text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-black"
                      >
                        +
                      </button>
                      <span className="font-extrabold text-teal-400 ml-1">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback Direct Input if no presets used */}
          {itemsList.length === 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400">Au weka idadi ya nguo na bei moja kwa moja:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Idadi ya Nguo (Pcs):</label>
                  <input
                    type="number"
                    min="1"
                    value={customClothCount}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setCustomClothCount(val);
                      if (val !== '' && customPrice !== '') {
                        setPaidAmount(Number(val) * Number(customPrice));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Bei kwa Kila Nguo (TZS):</label>
                  <input
                    type="number"
                    min="0"
                    value={customPrice}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setCustomPrice(val);
                      if (val !== '' && customClothCount !== '') {
                        setPaidAmount(Number(val) * Number(customClothCount));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment, Discount & Total Amount Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
          
          {/* Subtotal & Discount Row */}
          <div className="space-y-2 pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Jumla ya Nguo (Subtotal):</span>
              <span className="font-bold text-slate-200">{formatCurrency(subTotalAmount)}</span>
            </div>

            {/* Discount Section */}
            <div className="p-2.5 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-teal-300 flex items-center gap-1">
                  <span>🏷️</span>
                  <span>Punguzo (Discount kwa Nguo Nyingi):</span>
                </span>
                {numDiscount > 0 ? (
                  <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    -{formatCurrency(numDiscount)}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Bila Punguzo</span>
                )}
              </div>

              {/* Quick preset discount pills */}
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {[
                  { label: '0', val: 0 },
                  { label: '-500', val: 500 },
                  { label: '-1,000', val: 1000 },
                  { label: '-2,000', val: 2000 },
                  { label: '-5,000', val: 5000 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyDiscount(p.val === 0 ? '' : p.val)}
                    className={`py-1 rounded-lg border font-bold transition-all ${
                      (p.val === 0 && !discount) || (discount === p.val)
                        ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom discount input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 shrink-0">Au weka kiasi maalum cha punguzo:</span>
                <input
                  type="number"
                  min="0"
                  max={subTotalAmount}
                  placeholder="mfano: 3000"
                  value={discount}
                  onChange={e => handleApplyDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Net Total to Pay */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase">Kiasi cha Kulipa:</span>
                {numDiscount > 0 && (
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    (Umeokoa {formatCurrency(numDiscount)})
                  </div>
                )}
              </div>
              <span className="text-xl font-black text-white">{formatCurrency(finalTotalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Pesa Aliyotoa Sasa (TZS) *:</label>
              <input
                type="number"
                min="0"
                required
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-extrabold text-teal-400 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Baki ya Kulipa:</label>
              <div className={`px-3 py-2 rounded-xl text-sm font-black flex items-center justify-between ${
                balanceDue > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                <span>{formatCurrency(balanceDue)}</span>
                <span className="text-[10px]">{balanceDue === 0 ? 'Imelipwa Yote' : 'Inadaiwa'}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Njia ya Malipo:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'mpesa', label: 'M-Pesa' },
                { id: 'airtel', label: 'Airtel' },
                { id: 'tigo', label: 'Tigo' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                    paymentMethod === m.id
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
          >
            <Receipt className="w-5 h-5 text-slate-950" />
            <span>Rekodi Mapato & Kata Risiti</span>
          </button>
        </div>

      </form>

      {/* Laundry Expense Recording Modal */}
      {showExpenseModal && (
        <LaundryExpenseModal
          branchId={localStorage.getItem('active_branch_id') || branchId}
          branchName="GGS Laundry"
          onClose={() => setShowExpenseModal(false)}
        />
      )}
    </div>
  );
};
