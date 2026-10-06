import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Check, 
  Smartphone, 
  Shirt, 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { SHOPS, getShopPin, setShopPin, type ShopOption } from '../Auth/PinLogin';

export const BossSecurity: React.FC = () => {
  const [pins, setPins] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    SHOPS.forEach(s => {
      map[s.id] = getShopPin(s.id);
    });
    return map;
  });

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);

  const handleUpdatePin = (shop: ShopOption) => {
    const pin = pins[shop.id] || '';
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      alert('PIN lazima iwe namba 4 kamili (mfano: 1234)');
      return;
    }
    setShopPin(shop.id, pin);
    setSavedSuccess(`PIN ya ${shop.name} imebadilishwa kuwa (${pin}) na kuhifadhiwa kikamilifu!`);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  const handlePinChange = (shopId: string, value: string) => {
    if (value.length <= 4 && (/^\d*$/.test(value) || value === '')) {
      setPins(prev => ({ ...prev, [shopId]: value }));
    }
  };

  const phoneShops = SHOPS.filter(s => s.type === 'phone');
  const laundryShops = SHOPS.filter(s => s.type === 'laundry');
  const wakalaShops = SHOPS.filter(s => s.type === 'wakala');
  const bossShop = SHOPS.find(s => s.type === 'boss')!;
  const adminShop = SHOPS.find(s => s.type === 'admin') || SHOPS.find(s => s.id === 'admin');

  return (
    <div className="space-y-4 pb-28">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Usalama wa PIN & Vizuizi vya Mfumo (Super Admin)</h2>
              <div className="text-[10px] text-slate-400">Dhibiti nani anafungua kila tawi, badilisha PIN ya Boss na ya Admin</div>
            </div>
          </div>

          <button
            onClick={() => setShowPins(!showPins)}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Ficha PIN' : 'Onyesha PIN'}</span>
          </button>
        </div>

        {/* Status Notification */}
        {savedSuccess && (
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Role & Permissions Enforced Rules Box */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-md">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>Vizuizi Vilivyowekwa kwa Wauzaji Wote (Active Staff Restrictions)</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-100">Kuzuia Kuongeza Bidhaa Mpya Stoo:</div>
              <div className="text-[11px] text-slate-400">Muuzaji katika maduka yote 3 ya simu hawezi kuingiza bidhaa mpya stoo wala kubadilisha bei za kununua/kuuza bila PIN ya Boss (9999).</div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-100">Kuzuia Kufuta Risiti au Historia:</div>
              <div className="text-[11px] text-slate-400">Miamala yote ya mauzo, maagizo ya laundry (matawi yote 4), na miamala ya Wakala imefungwa (immutable); hakuna muuzaji anayeweza kufuta rekodi.</div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-100">Upatikanaji wa Ripoti za Faida:</div>
              <div className="text-[11px] text-slate-400">Ripoti za faida safi na hesabu za mtaji zinaonekana tu kwenye akaunti hii ya Boss Central Dashboard.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Phone Shops PINs */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          <span>PIN za Maduka ya Simu (3 Branches)</span>
        </div>

        {phoneShops.map(shop => (
          <div key={shop.id} className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">{shop.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{shop.sub}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={pins[shop.id] || ''}
                onChange={e => handlePinChange(shop.id, e.target.value)}
                className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-sm font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleUpdatePin(shop)}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                Hifadhi
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Laundry Shops PINs */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shirt className="w-3.5 h-3.5" />
          <span>PIN za GGS Laundry Service (4 Branches Mwanza)</span>
        </div>

        {laundryShops.map(shop => (
          <div key={shop.id} className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">{shop.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{shop.sub}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={pins[shop.id] || ''}
                onChange={e => handlePinChange(shop.id, e.target.value)}
                className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-sm font-mono font-bold text-teal-400 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={() => handleUpdatePin(shop)}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                Hifadhi
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Wakala Shop PIN */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>PIN ya Wakala Kiosk</span>
        </div>

        {wakalaShops.map(shop => (
          <div key={shop.id} className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">{shop.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{shop.sub}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={pins[shop.id] || ''}
                onChange={e => handlePinChange(shop.id, e.target.value)}
                className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleUpdatePin(shop)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                Hifadhi
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Boss Dashboard PIN */}
      <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-850 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 mt-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400">Boss Central Dashboard PIN</div>
            <div className="text-[10px] text-slate-400">Akaunti ya Mmiliki (Matawi, Faida, Stoo)</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type={showPins ? "text" : "password"}
            maxLength={4}
            value={pins[bossShop.id] || ''}
            onChange={e => handlePinChange(bossShop.id, e.target.value)}
            className="w-16 px-2 py-1.5 bg-slate-900 border border-amber-500/50 rounded-xl text-center text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleUpdatePin(bossShop)}
            className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black active:scale-95 transition-all"
          >
            Hifadhi
          </button>
        </div>
      </div>

      {/* 5. Super Admin (Wewe) PIN */}
      {adminShop && (
        <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-slate-800 to-slate-850 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 mt-2 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 font-black">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-400">Super Admin PIN (Wewe)</div>
              <div className="text-[10px] text-slate-400">Usimamizi Mkuu, PIN & Backup (0000)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type={showPins ? "text" : "password"}
              maxLength={4}
              value={pins[adminShop.id] || ''}
              onChange={e => handlePinChange(adminShop.id, e.target.value)}
              className="w-16 px-2 py-1.5 bg-slate-900 border border-purple-500/50 rounded-xl text-center text-sm font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={() => handleUpdatePin(adminShop)}
              className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black active:scale-95 transition-all"
            >
              Hifadhi
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
