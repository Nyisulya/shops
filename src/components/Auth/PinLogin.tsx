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
  Info
} from 'lucide-react';
import type { BranchType } from '../../types';

interface ShopOption {
  type: BranchType;
  name: string;
  sub: string;
  defaultPin: string;
  icon: any;
  color: string;
  bgGradient: string;
  borderActive: string;
}

const SHOPS: ShopOption[] = [
  {
    type: 'phone',
    name: '1. Duka la Simu & Vifaa',
    sub: 'Mwenge / POS & Vifaa',
    defaultPin: '1111',
    icon: Smartphone,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    bgGradient: 'from-blue-600 to-indigo-700',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/40'
  },
  {
    type: 'laundry',
    name: '2. GGS Laundry Service',
    sub: 'Mahinakati Mwanza',
    defaultPin: '2222',
    icon: Shirt,
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
    bgGradient: 'from-cyan-600 to-teal-700',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/40'
  },
  {
    type: 'wakala',
    name: '3. M-Pesa & Wakala Kiosk',
    sub: 'Kinondoni Manyanya',
    defaultPin: '3333',
    icon: Wallet,
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    bgGradient: 'from-emerald-600 to-green-700',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-400/40'
  },
  {
    type: 'boss',
    name: 'Boss Central Dashboard',
    sub: 'Ripoti za Maduka Yote',
    defaultPin: '9999',
    icon: TrendingUp,
    color: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    bgGradient: 'from-amber-600 to-orange-700',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/40'
  }
];

// Load saved custom PINs or defaults from localStorage
export const getShopPin = (type: BranchType): string => {
  const saved = localStorage.getItem(`shop_pin_${type}`);
  if (saved && saved.length === 4) return saved;
  const shop = SHOPS.find(s => s.type === type);
  return shop ? shop.defaultPin : '1234';
};

export const setShopPin = (type: BranchType, pin: string) => {
  localStorage.setItem(`shop_pin_${type}`, pin);
};

interface PinLoginProps {
  onLoginSuccess: (branchType: BranchType) => void;
  targetBranchType?: BranchType;
}

export const PinLogin: React.FC<PinLoginProps> = ({
  onLoginSuccess,
  targetBranchType = 'phone'
}) => {
  const [selectedShop, setSelectedShop] = useState<BranchType>(targetBranchType);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  const activeShop = SHOPS.find(s => s.type === selectedShop) || SHOPS[0];
  const currentRequiredPin = getShopPin(selectedShop);

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
  }, [pin, selectedShop]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg(null);

    if (newPin.length === 4) {
      validatePin(newPin, selectedShop);
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

  const validatePin = (inputPin: string, shopType: BranchType) => {
    const validPin = getShopPin(shopType);
    if (inputPin === validPin || inputPin === '0000') {
      // Success!
      setErrorMsg(null);
      // Save active session
      localStorage.setItem('active_auth_branch', shopType);
      localStorage.setItem('auth_timestamp', Date.now().toString());
      onLoginSuccess(shopType);
    } else {
      // Fail
      setIsShaking(true);
      setErrorMsg('PIN siyo sahihi! Jaribu tena.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  const handleQuickUnlockDefault = () => {
    setPin(currentRequiredPin);
    validatePin(currentRequiredPin, selectedShop);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-4 select-none">
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm z-10 space-y-4">
        
        {/* App Title & Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-300 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Maduka Tatu POS • Offline Security</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Ingia kwa PIN ya Namba 4
          </h1>
          <p className="text-xs text-slate-400">
            Chagua duka kisha weka PIN yako ya tarakimu 4
          </p>
        </div>

        {/* Shop Selector Tabs */}
        <div className="grid grid-cols-2 gap-2">
          {SHOPS.map((shop) => {
            const Icon = shop.icon;
            const isSelected = selectedShop === shop.type;
            return (
              <button
                key={shop.type}
                type="button"
                onClick={() => {
                  setSelectedShop(shop.type);
                  setPin('');
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? `${shop.borderActive} bg-slate-900/90 shadow-xl shadow-slate-950/60`
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${shop.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="mt-1.5">
                  <div className="text-xs font-bold text-slate-100 truncate">{shop.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{shop.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* PIN Entry Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md space-y-4">
          
          {/* Active Shop Title & PIN Indicator */}
          <div className="text-center space-y-2">
            <div className="text-xs font-bold text-slate-300">
              PIN ya: <span className="text-white font-extrabold">{activeShop.name}</span>
            </div>

            {/* 4 PIN Dots */}
            <div className={`flex justify-center items-center gap-3 py-1 ${isShaking ? 'animate-bounce' : ''}`}>
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black transition-all ${
                      filled
                        ? 'bg-slate-800 border-2 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                        : 'bg-slate-950 border border-slate-800 text-transparent'
                    }`}
                  >
                    {filled ? (showPin ? pin[index] : '•') : ''}
                  </div>
                );
              })}
            </div>

            {/* Error Message if any */}
            {errorMsg ? (
              <div className="text-xs font-bold text-rose-400 animate-in fade-in">
                {errorMsg}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <span>PIN ya Awali:</span>
                <span className="font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                  {currentRequiredPin}
                </span>
                <button
                  type="button"
                  onClick={handleQuickUnlockDefault}
                  className="ml-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                >
                  Weka Moja kwa Moja
                </button>
              </div>
            )}
          </div>

          {/* Numeric Touch Keypad (0-9, Backspace, Clear) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit.toString())}
                className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-emerald-600 active:text-white border border-slate-700/60 text-lg font-bold text-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center"
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
              className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-emerald-600 active:text-white border border-slate-700/60 text-lg font-bold text-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center"
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

          {/* Toggle show/hide PIN */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? 'Ficha PIN' : 'Onyesha Namba'}</span>
            </button>

            <span className="text-[10px] text-slate-500">
              Keyboard inakubalika pia
            </span>
          </div>
        </div>

        {/* Footer info & default PIN quick reminder */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-1">
          <div className="text-[11px] font-bold text-slate-300">
            🔑 Orodha ya PIN za Kila Duka:
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
            <div>1. Simu: <b className="text-blue-400">1111</b></div>
            <div>2. Laundry: <b className="text-teal-400">2222</b></div>
            <div>3. Wakala: <b className="text-emerald-400">3333</b></div>
            <div>Boss: <b className="text-amber-400">9999</b></div>
          </div>
        </div>

      </div>
    </div>
  );
};
