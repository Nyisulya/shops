import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Smartphone, 
  Shirt, 
  Wallet, 
  TrendingUp, 
  Delete, 
  ShieldCheck, 
  Check, 
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import type { BranchType } from '../../types';

export interface ShopOption {
  id: string;
  type: BranchType;
  name: string;
  sub: string;
  defaultPin: string;
  icon: any;
  color: string;
  bgGradient: string;
  borderActive: string;
}

export const SHOPS: ShopOption[] = [
  // 3 Phone Shops
  {
    id: 'branch_phone_1',
    type: 'phone',
    name: '1. Duka la Soko Kuu',
    sub: 'Soko Kuu Mwanza',
    defaultPin: '1111',
    icon: Smartphone,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    bgGradient: 'from-blue-600 to-indigo-700',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/40'
  },
  {
    id: 'branch_phone_2',
    type: 'phone',
    name: '2. Duka la Vunja Bei',
    sub: 'Vunja Bei Mwanza',
    defaultPin: '1112',
    icon: Smartphone,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    bgGradient: 'from-blue-600 to-indigo-700',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/40'
  },
  {
    id: 'branch_phone_3',
    type: 'phone',
    name: '3. Duka la Makoroboi',
    sub: 'Makoroboi Mwanza',
    defaultPin: '1113',
    icon: Smartphone,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    bgGradient: 'from-blue-600 to-indigo-700',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/40'
  },

  // 4 Laundry Shops
  {
    id: 'branch_laundry_1',
    type: 'laundry',
    name: '4. GGS Laundry - Machinjioni',
    sub: 'Machinjioni Mwanza',
    defaultPin: '2221',
    icon: Shirt,
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
    bgGradient: 'from-cyan-600 to-teal-700',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/40'
  },
  {
    id: 'branch_laundry_2',
    type: 'laundry',
    name: '5. GGS Laundry - Mahina kati',
    sub: 'Mahina kati Mwanza',
    defaultPin: '2222',
    icon: Shirt,
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
    bgGradient: 'from-cyan-600 to-teal-700',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/40'
  },
  {
    id: 'branch_laundry_3',
    type: 'laundry',
    name: '6. GGS Laundry - Nyasaka',
    sub: 'Nyasaka Mwanza',
    defaultPin: '2223',
    icon: Shirt,
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
    bgGradient: 'from-cyan-600 to-teal-700',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/40'
  },
  {
    id: 'branch_laundry_4',
    type: 'laundry',
    name: '7. GGS Laundry - Sahwa',
    sub: 'Sahwa Mwanza',
    defaultPin: '2224',
    icon: Shirt,
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
    bgGradient: 'from-cyan-600 to-teal-700',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/40'
  },

  // 1 Wakala Shop
  {
    id: 'branch_wakala_1',
    type: 'wakala',
    name: '8. Wakala Kiosk',
    sub: 'Kinondoni Manyanya',
    defaultPin: '3333',
    icon: Wallet,
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    bgGradient: 'from-emerald-600 to-green-700',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-400/40'
  },

  // Boss Central Dashboard
  {
    id: 'boss',
    type: 'boss',
    name: 'Boss Central Dashboard',
    sub: 'Maduka Yote 8 (Matawi, Faida & Stoo)',
    defaultPin: '9999',
    icon: TrendingUp,
    color: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    bgGradient: 'from-amber-600 to-orange-700',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/40'
  },

  // Super Admin (Msimamizi Mkuu wa Mfumo)
  {
    id: 'admin',
    type: 'admin',
    name: 'Super Admin (Msimamizi Mkuu)',
    sub: 'Usimamizi Kamili, PIN & Backup',
    defaultPin: '0000',
    icon: ShieldCheck,
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    bgGradient: 'from-purple-600 to-indigo-700',
    borderActive: 'border-purple-500 ring-2 ring-purple-500/40'
  }
];

// Load saved custom PINs or defaults from localStorage
export const getShopPin = (shopIdOrType: string): string => {
  const saved = localStorage.getItem(`shop_pin_${shopIdOrType}`);
  if (saved && saved.length === 4) return saved;
  const shop = SHOPS.find(s => s.id === shopIdOrType || s.type === shopIdOrType);
  return shop ? shop.defaultPin : (shopIdOrType === 'admin' ? '0000' : '1234');
};

export const setShopPin = (shopIdOrType: string, pin: string) => {
  localStorage.setItem(`shop_pin_${shopIdOrType}`, pin);
};

// Auto-detect which shop or role matches the entered 4-digit PIN
export const findShopByPin = (inputPin: string): ShopOption | null => {
  // 1. Check Super Admin PIN (0000)
  const adminPin = getShopPin('admin');
  if (inputPin === adminPin || inputPin === '0000') {
    return SHOPS.find(s => s.id === 'admin') || null;
  }

  // 2. Check Boss PIN (9999)
  const bossPin = getShopPin('boss');
  if (inputPin === bossPin || inputPin === '9999') {
    return SHOPS.find(s => s.id === 'boss') || null;
  }

  // 3. Check each individual shop PIN
  for (const shop of SHOPS) {
    if (shop.id !== 'boss' && shop.id !== 'admin') {
      const pin = getShopPin(shop.id);
      if (inputPin === pin) {
        return shop;
      }
    }
  }

  return null;
};

interface PinLoginProps {
  onLoginSuccess: (branchType: BranchType, branchId: string) => void;
  targetBranchType?: BranchType;
  targetBranchId?: string;
}

export const PinLogin: React.FC<PinLoginProps> = ({
  onLoginSuccess
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successShop, setSuccessShop] = useState<ShopOption | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Keyboard input listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPin('');
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg(null);

    if (newPin.length === 4) {
      validateEnteredPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const validateEnteredPin = (inputPin: string) => {
    const matchedShop = findShopByPin(inputPin);

    if (matchedShop) {
      setSuccessShop(matchedShop);
      setErrorMsg(null);
      localStorage.setItem('active_auth_branch', matchedShop.type);
      localStorage.setItem('active_branch_id', matchedShop.id);
      localStorage.setItem('auth_timestamp', Date.now().toString());

      // Smooth delay for user feedback
      setTimeout(() => {
        onLoginSuccess(matchedShop.type, matchedShop.id);
      }, 400);
    } else {
      setIsShaking(true);
      setErrorMsg('Password / PIN siyo sahihi! Tafadhali weka PIN ya duka lako.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 select-none">
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm z-10 space-y-4">
        
        {/* App Title & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 shadow-xl shadow-indigo-500/20 text-white mb-1">
            <Lock className="w-7 h-7" />
          </div>
          
          <h1 className="text-2xl font-black tracking-tight text-white">
            Ingiza Password / PIN
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Kila mhudumu ana PIN yake binafsi itakayomfungulia taarifa za duka lake tu moja kwa moja
          </p>
        </div>

        {/* PIN Entry Card */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md space-y-4">
          
          {/* Status or Shop Identified */}
          <div className="text-center space-y-2 min-h-[50px] flex flex-col items-center justify-center">
            {successShop ? (
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in zoom-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Karibu! Inafungua: <span className="text-white underline">{successShop.name}</span></span>
              </div>
            ) : errorMsg ? (
              <div className="text-xs font-bold text-rose-400 animate-in fade-in">
                {errorMsg}
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-medium">
                Weka namba 4 za siri:
              </div>
            )}

            {/* 4 PIN Dots */}
            <div className={`flex justify-center items-center gap-3.5 py-1 ${isShaking ? 'animate-bounce' : ''}`}>
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black transition-all ${
                      filled
                        ? successShop 
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-slate-800 border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-slate-950 border border-slate-800 text-transparent'
                    }`}
                  >
                    {filled ? (showPin ? pin[index] : '•') : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Numeric Touch Keypad (0-9, Backspace, Clear) */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit.toString())}
                className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500 active:text-slate-950 border border-slate-700/60 text-xl font-bold text-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center"
              >
                {digit}
              </button>
            ))}

            {/* Clear button */}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all active:scale-95 flex items-center justify-center"
            >
              Futa
            </button>

            {/* Zero */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500 active:text-slate-950 border border-slate-700/60 text-xl font-bold text-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all active:scale-95 flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle show/hide PIN & Help Guide */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? 'Ficha PIN' : 'Onyesha Namba'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Mwongozo wa PIN</span>
            </button>
          </div>
        </div>

      </div>

      {/* Help Modal with List of Default PINs */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">PIN za Kila Duka (Mwongozo)</h3>
                  <p className="text-[10px] text-slate-400">Kila duka linafunguka tu kwa PIN yake</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                ⚡ Super Admin (Msimamizi Mkuu)
              </div>
              <div 
                onClick={() => { setPin(getShopPin('admin')); validateEnteredPin(getShopPin('admin')); setShowHelpModal(false); }}
                className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-purple-500/20 transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-purple-300">Super Admin (Wewe)</div>
                  <div className="text-[10px] text-slate-400">Usimamizi Kamili, PIN za Wote, Backup & Mfumo</div>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-mono font-black text-xs">
                  {getShopPin('admin')}
                </div>
              </div>

              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider pt-2">
                👑 Ofisi ya Boss (Mmiliki)
              </div>
              <div 
                onClick={() => { setPin(getShopPin('boss')); validateEnteredPin(getShopPin('boss')); setShowHelpModal(false); }}
                className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-amber-300">Boss Central Dashboard</div>
                  <div className="text-[10px] text-slate-400">Matawi, Ripoti & Faida, Stoo (Bila PIN/Backup)</div>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-xs">
                  {getShopPin('boss')}
                </div>
              </div>

              <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider pt-2">
                📱 Maduka ya Simu (3)
              </div>
              {SHOPS.filter(s => s.type === 'phone').map(shop => (
                <div 
                  key={shop.id}
                  onClick={() => { setPin(getShopPin(shop.id)); validateEnteredPin(getShopPin(shop.id)); setShowHelpModal(false); }}
                  className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-750 transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-100">{shop.name}</div>
                    <div className="text-[10px] text-slate-400">{shop.sub}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-mono font-black text-xs">
                    {getShopPin(shop.id)}
                  </div>
                </div>
              ))}

              <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider pt-2">
                🧺 GGS Laundry Service (4)
              </div>
              {SHOPS.filter(s => s.type === 'laundry').map(shop => (
                <div 
                  key={shop.id}
                  onClick={() => { setPin(getShopPin(shop.id)); validateEnteredPin(getShopPin(shop.id)); setShowHelpModal(false); }}
                  className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-750 transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-100">{shop.name}</div>
                    <div className="text-[10px] text-slate-400">{shop.sub}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-300 font-mono font-black text-xs">
                    {getShopPin(shop.id)}
                  </div>
                </div>
              ))}

              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider pt-2">
                💵 M-Pesa & Wakala Kiosk (1)
              </div>
              {SHOPS.filter(s => s.type === 'wakala').map(shop => (
                <div 
                  key={shop.id}
                  onClick={() => { setPin(getShopPin(shop.id)); validateEnteredPin(getShopPin(shop.id)); setShowHelpModal(false); }}
                  className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-750 transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-100">{shop.name}</div>
                    <div className="text-[10px] text-slate-400">{shop.sub}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs">
                    {getShopPin(shop.id)}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            >
              Funga Mwongozo
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
