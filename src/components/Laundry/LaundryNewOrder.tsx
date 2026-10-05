import React, { useState } from 'react';
import { 
  Shirt, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  Calendar, 
  Check, 
  Sparkles, 
  Tag,
  Clock,
  Percent,
  Layers,
  MapPin
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { LaundryOrder, LaundryItem } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import confetti from 'canvas-confetti';

interface LaundryNewOrderProps {
  onOrderComplete: (order: LaundryOrder) => void;
}

// Exact pricing list from GGS Laundry Service poster
const GGS_PRESET_CLOTHES = [
  { type: 'Suluwali (Trousers/Jeans)', basePrice: 500, icon: '👖' },
  { type: 'Tishert (T-Shirt)', basePrice: 500, icon: '👕' },
  { type: 'Shat (Shirt)', basePrice: 500, icon: '👔' },
  { type: 'Duvet', basePrice: 4000, icon: '🛏️' },
  { type: 'Blanket', basePrice: 4000, icon: '🛌' },
  { type: 'Viatu (Shoes / Sneakers)', basePrice: 1000, icon: '👟' },
  { type: 'Koti (Jacket / Coat)', basePrice: 1000, icon: '🧥' },
  { type: 'Sweta (Sweater)', basePrice: 1000, icon: '🧶' },
  { type: 'Shuka (Bed Sheet)', basePrice: 1000, icon: '🛏️' },
  { type: 'Sut (Full Suit)', basePrice: 3000, icon: '🤵' },
  { type: 'Beg (Bag / Backpack)', basePrice: 1000, icon: '🎒' },
  { type: 'Zurich (Heavy Carpet / Rug)', basePrice: 8000, icon: '🧶' },
  { type: 'Shera (Wedding / Bridal Gown)', basePrice: 20000, icon: '👰' },
];

export const LaundryNewOrder: React.FC<LaundryNewOrderProps> = ({ onOrderComplete }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [promisedDate, setPromisedDate] = useState('Kesho saa 10 jioni');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LaundryItem[]>([]);
  const [discount, setDiscount] = useState<number | ''>('');
  const [deposit, setDeposit] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = (cloth: typeof GGS_PRESET_CLOTHES[0], service: 'wash_iron' | 'wash_only' | 'iron_only' | 'dry_clean' = 'wash_iron') => {
    // Single item standard price as on the flyer
    const unitPrice = cloth.basePrice;

    setItems(prev => {
      const existing = prev.find(i => i.itemType === cloth.type && i.service === service);
      if (existing) {
        return prev.map(i =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.pricePerItem }
            : i
        );
      } else {
        return [
          ...prev,
          {
            id: generateUniqueId('item'),
            itemType: cloth.type,
            service,
            quantity: 1,
            pricePerItem: unitPrice,
            totalPrice: unitPrice
          }
        ];
      }
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev =>
      prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0
              ? { ...i, quantity: newQty, totalPrice: newQty * i.pricePerItem }
              : null;
          }
          return i;
        })
        .filter(Boolean) as LaundryItem[]
    );
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalPieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const discountNum = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountNum);
  const depositNum = Number(deposit) || 0;
  const balanceDue = Math.max(0, totalAmount - depositNum);

  const applyPresetDiscount = (amountVal: number) => {
    setDiscount(amountVal);
  };

  const applyPercentDiscount = (percent: number) => {
    const calculated = Math.round((subtotal * percent) / 100 / 100) * 100;
    setDiscount(calculated);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Tafadhali jaza jina la mteja na namba ya simu.');
      return;
    }
    if (items.length === 0) {
      alert('Tafadhali chagua nguo zilizopokelewa kutoka kwenye orodha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = generateUniqueId('lnd');
      const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;
      const tagNumber = `LN-${Math.floor(100 + Math.random() * 900)}`;

      const newOrder: LaundryOrder = {
        id: orderId,
        branchId: 'branch_laundry',
        orderNumber,
        tagNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items,
        subtotal,
        discount: discountNum,
        totalAmount,
        deposit: depositNum,
        balanceDue,
        paymentStatus: balanceDue === 0 ? 'paid' : depositNum > 0 ? 'partial' : 'pending',
        stage: 'received',
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        promisedDate: promisedDate.trim() || 'Kesho',
        isSynced: false
      };

      await db.laundryOrders.put(newOrder);
      await queueSync('laundryOrders', orderId, 'create', newOrder);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setItems([]);
      setDiscount('');
      setDeposit('');
      onOrderComplete(newOrder);
    } catch (err) {
      console.error('Error saving laundry order:', err);
      alert('Imeshindwa kuhifadhi agizo la nguo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      
      {/* GGS Laundry Banner */}
      <div className="p-3 bg-gradient-to-r from-purple-900/60 via-teal-900/40 to-slate-900 border border-teal-500/30 rounded-2xl flex items-center justify-between text-xs">
        <div>
          <div className="font-black text-sm text-teal-300">GGS LAUNDRY SERVICE</div>
          <div className="text-[10px] text-slate-400">Mahinakati Mwanza • Simu: 0685947264 • 8AM - 6PM</div>
        </div>
        <span className="text-[10px] font-extrabold bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/40">
          Nguo Safi, Maisha Rahisi!
        </span>
      </div>

      {/* Customer Info Card */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl space-y-3 shadow-sm">
        <div className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-teal-400" />
          <span>1. Taarifa za Mteja & Ahadi ya Kuchukua</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">Jina la Mteja *:</label>
            <input
              type="text"
              required
              placeholder="mfano: Mama Ashura"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">Simu ya Mteja *:</label>
            <input
              type="tel"
              required
              placeholder="0685 947 264"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">Ahadi ya Kuchukua:</label>
            <input
              type="text"
              placeholder="Kesho saa 10 jioni"
              value={promisedDate}
              onChange={e => setPromisedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">Notes / Maelezo (Hiari):</label>
            <input
              type="text"
              placeholder="mfano: Doa la chai kwenye shati..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Fast Clothing Selection Grid - Official Flyer Prices */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Shirt className="w-4 h-4 text-teal-400" />
            2. Bei Halisi za Kufua (Moja Moja)
          </span>
          <span className="text-[11px] text-teal-400 font-semibold">{totalPieces} pcs zimechaguliwa</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GGS_PRESET_CLOTHES.map((cloth, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => addItem(cloth, 'wash_iron')}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-teal-500/50 rounded-2xl text-left transition-all active:scale-95 shadow-sm group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{cloth.icon}</span>
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-1.5">
                <div className="font-semibold text-xs text-slate-100 truncate">{cloth.type}</div>
                <div className="text-[10px] text-teal-400 font-extrabold">{formatCurrency(cloth.basePrice)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Items List */}
      {items.length > 0 && (
        <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3 shadow-md">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>Orodha ya Nguo Zilizopokelewa</span>
            <span className="text-teal-400 font-extrabold">{totalPieces} Jumla ya Nguo</span>
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div 
                key={item.id}
                className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-slate-200 truncate">{item.itemType}</div>
                  <div className="text-[10px] text-teal-400 font-medium">
                    {formatCurrency(item.pricePerItem)} x {item.quantity} = <b>{formatCurrency(item.totalPrice)}</b>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-slate-100">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bulk Discount Section */}
          <div className="p-3 bg-gradient-to-br from-teal-950/40 to-slate-900 border border-teal-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-300 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-teal-400" />
                Punguzo la Nguo Nyingi (Discount):
              </span>
              {totalPieces >= 5 && (
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full">
                  Nguo nyingi ({totalPieces} pcs)
                </span>
              )}
            </div>

            {/* Quick preset discount pills */}
            <div className="flex flex-wrap gap-1.5">
              {[500, 1000, 2000, 3000, 5000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => applyPresetDiscount(amt)}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                    discount === amt
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  -{formatCurrency(amt)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyPercentDiscount(10)}
                className="py-1 px-2 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-700 text-amber-300 hover:bg-slate-800"
              >
                -10%
              </button>
              {discountNum > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscount('')}
                  className="py-1 px-2 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30"
                >
                  Futa Punguzo
                </button>
              )}
            </div>

            {/* Direct custom discount field */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Kiasi cha Punguzo (TZS):</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-500">TZS</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  placeholder="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-right text-teal-300 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Payment & Deposit Calculation */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Gharama ya Awali (Subtotal):</span>
              <span className="font-semibold text-slate-200">{formatCurrency(subtotal)}</span>
            </div>

            {discountNum > 0 && (
              <div className="flex justify-between text-teal-400 font-bold">
                <span>Punguzo (Discount):</span>
                <span>-{formatCurrency(discountNum)}</span>
              </div>
            )}

            <div className="flex justify-between text-white font-extrabold text-sm pt-1 border-t border-slate-800">
              <span>Jumla Kuu ya Kulipa:</span>
              <span className="text-teal-300">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-300">Malipo ya Awali (Deposit):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">TZS</span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  placeholder="0"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-right font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="font-extrabold text-slate-300">Baki Inayodaiwa:</span>
              <span className={`font-extrabold text-sm ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {balanceDue > 0 ? formatCurrency(balanceDue) : 'Imelipwa Yote (PAID)'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-teal-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Inarekodi...' : `Pokea Nguo & Toa Tag ya Risiti (${formatCurrency(totalAmount)})`}</span>
          </button>
        </div>
      )}
    </div>
  );
};

