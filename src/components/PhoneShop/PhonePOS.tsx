import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Smartphone, 
  Headphones, 
  Wrench, 
  Check, 
  CreditCard, 
  Banknote, 
  Tag, 
  ArrowRight,
  ShieldAlert,
  User,
  Phone
} from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { Product, CartItem, Sale, SaleItem } from '../../types';
import { formatCurrency } from '../../services/receiptService';
import confetti from 'canvas-confetti';

interface PhonePOSProps {
  onSaleComplete: (sale: Sale) => void;
}

export const PhonePOS: React.FC<PhonePOSProps> = ({ onSaleComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'airtel' | 'tigo' | 'bank'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live query products from Dexie IndexedDB
  const products = useLiveQuery(
    async () => {
      let collection = db.products.where('branchId').equals('branch_phone');
      const all = await collection.toArray();
      return all.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.imei && p.imei.includes(searchQuery)) ||
                              (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      });
    },
    [searchQuery, selectedCategory]
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Bidhaa hii imeisha kwenye stoo!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Kuna bidhaa ${product.stock} tu kwenye stoo!`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1, selectedImei: product.imei }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              alert(`Kuna ${item.product.stock} tu kwenye stoo!`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const cartFinalTotal = Math.max(0, cartSubtotal - discount);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const saleId = generateUniqueId('sale');
      const saleNumber = `PH-${Date.now().toString().slice(-5)}`;

      const saleItems: SaleItem[] = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        category: item.product.category,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        totalPrice: item.product.sellingPrice * item.quantity,
        imei: item.selectedImei
      }));

      const newSale: Sale = {
        id: saleId,
        branchId: 'branch_phone',
        saleNumber,
        items: saleItems,
        totalAmount: cartSubtotal,
        discount,
        finalAmount: cartFinalTotal,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        cashierName: 'Juma Ramadhani',
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      // Atomic transaction: save sale and reduce inventory in Dexie Local DB
      await db.transaction('rw', [db.sales, db.products], async () => {
        await db.sales.put(newSale);
        for (const item of cart) {
          const currentProd = await db.products.get(item.product.id);
          if (currentProd) {
            const newStock = Math.max(0, currentProd.stock - item.quantity);
            await db.products.update(item.product.id, {
              stock: newStock,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });

      // Queue for evening sync
      await queueSync('sales', saleId, 'create', newSale);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Reset cart and open receipt
      setCart([]);
      setIsCheckoutOpen(false);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      onSaleComplete(newSale);
    } catch (err) {
      console.error('Sale error:', err);
      alert('Imeshindwa kukamilisha mauzo. Tafadhali jaribu tena.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pb-24">
      
      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta simu, vifaa au namba ya IMEI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Futa
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Zote' },
            { id: 'phone', label: 'Simu Pekee', icon: Smartphone },
            { id: 'accessory', label: 'Vifaa (Accessories)', icon: Headphones },
            { id: 'spare', label: 'Spea & Matengenezo', icon: Wrench },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {products?.map(prod => {
          const inCart = cart.find(c => c.product.id === prod.id);
          const isLowStock = prod.stock <= prod.minStock && prod.stock > 0;
          const isOutOfStock = prod.stock === 0;

          return (
            <div
              key={prod.id}
              onClick={() => !isOutOfStock && addToCart(prod)}
              className={`p-3 rounded-2xl border transition-all relative flex flex-col justify-between select-none ${
                isOutOfStock
                  ? 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/70 hover:border-blue-500/50 cursor-pointer active:scale-95 shadow-sm'
              }`}
            >
              {/* Product Badge */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  prod.category === 'phone' 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : prod.category === 'accessory' 
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {prod.category === 'phone' ? 'Simu' : prod.category === 'accessory' ? 'Kifaa' : 'Spea'}
                </span>

                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                  isOutOfStock 
                    ? 'bg-rose-500/20 text-rose-400' 
                    : isLowStock 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'text-slate-400'
                }`}>
                  {isOutOfStock ? 'Imeisha' : `${prod.stock} zipo`}
                </span>
              </div>

              {/* Product Details */}
              <div className="space-y-0.5 mb-2">
                <h3 className="font-semibold text-xs text-slate-100 line-clamp-2 leading-tight">
                  {prod.name}
                </h3>
                {prod.imei && (
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    IMEI: {prod.imei}
                  </p>
                )}
                {prod.warrantyMonths && (
                  <p className="text-[10px] text-emerald-400">
                    Warranty miezi {prod.warrantyMonths}
                  </p>
                )}
              </div>

              {/* Price & Add Indicator */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                <span className="font-extrabold text-xs text-blue-400">
                  {formatCurrency(prod.sellingPrice)}
                </span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  inCart 
                    ? 'bg-blue-600 text-white font-bold text-xs' 
                    : 'bg-slate-700/80 text-slate-300 hover:bg-blue-600 hover:text-white'
                }`}>
                  {inCart ? inCart.quantity : <Plus className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products && products.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-xs">
          Hakuna bidhaa iliyopatikana kwa utafutaji huu.
        </div>
      )}

      {/* Floating Cart Bar (Sticky Bottom above nav) */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-3 right-3 z-20 max-w-md mx-auto animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3.5 rounded-2xl shadow-2xl shadow-blue-900/50 flex items-center justify-between border border-blue-400/30 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-xs">
                {totalItemsCount}
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Kikapu cha Mauzo</div>
                <div className="text-sm font-extrabold">{formatCurrency(cartFinalTotal)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-xs bg-white text-blue-900 px-3 py-1.5 rounded-xl shadow-sm">
              <span>Lipa Sasa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Top */}
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-100">Kukamilisha Mauzo ({totalItemsCount} bidhaa)</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-700 rounded-lg"
              >
                Funga
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="space-y-2">
                {cart.map(item => (
                  <div 
                    key={item.product.id}
                    className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-200 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-blue-400">{formatCurrency(item.product.sellingPrice)} kila moja</div>
                      {item.selectedImei && (
                        <div className="text-[9px] text-slate-400 font-mono">IMEI: {item.selectedImei}</div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center active:scale-95"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-100">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Info (Optional) */}
              <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-slate-300">Taarifa za Mteja (Sio Lazima):</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Jina la mteja"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="Namba ya simu"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">Njia ya Malipo:</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'mpesa', label: 'M-Pesa / Wakala', icon: CreditCard },
                    { id: 'bank', label: 'Benki', icon: CreditCard },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === method.id
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <method.icon className="w-3.5 h-3.5" />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount / Punguzo */}
              <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <span className="text-xs text-slate-300 font-medium">Punguzo (Discount):</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">TZS</span>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-right font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Jumla Ndogo:</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Punguzo:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-100 pt-1.5 border-t border-slate-800">
                  <span>JUMLA YA KULIPA:</span>
                  <span className="text-blue-400">{formatCurrency(cartFinalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Complete Sale Button */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Inarekodi...' : `Kamilisha Mauzo (${formatCurrency(cartFinalTotal)})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
