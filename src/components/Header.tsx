import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Smartphone, 
  Shirt, 
  Wallet, 
  TrendingUp, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ShieldCheck,
  Menu,
  X,
  Store,
  ChevronDown,
  Lock,
  LogOut,
  KeyRound
} from 'lucide-react';
import type { Branch, BranchType } from '../types';
import { getPendingSyncCount } from '../services/syncService';

interface HeaderProps {
  currentBranchType: BranchType;
  onSelectBranchType: (type: BranchType) => void;
  branches: Branch[];
  onOpenSyncModal: () => void;
  onLockScreen?: () => void;
  onOpenLicenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBranchType,
  onSelectBranchType,
  branches,
  onOpenSyncModal,
  onLockScreen,
  onOpenLicenseModal
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getBranchInfo = () => {
    switch (currentBranchType) {
      case 'phone':
        return { name: 'Duka la Simu & Vifaa', icon: Smartphone, color: 'from-blue-600 to-indigo-700', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'laundry':
        return { name: 'GGS Laundry Service', icon: Shirt, color: 'from-cyan-600 to-teal-700', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'wakala':
        return { name: 'M-Pesa & Wakala Kiosk', icon: Wallet, color: 'from-emerald-600 to-green-700', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'boss':
        return { name: 'Boss Central Dashboard', icon: TrendingUp, color: 'from-amber-600 to-orange-700', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
  };

  const currentInfo = getBranchInfo();
  const IconComponent = currentInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Branch Selector Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-left group active:scale-95"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentInfo.color} flex items-center justify-center shadow-md text-white`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ofisi ya Sasa</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1">
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentInfo.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </button>

          {/* Branch Picker Dropdown */}
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Chagua Ofisi au Dashboard
                </div>
                
                <div className="space-y-1">
                  <button
                    onClick={() => { onSelectBranchType('phone'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      currentBranchType === 'phone' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">1. Duka la Simu & Vifaa</div>
                      <div className="text-[11px] text-slate-400">Stoo, IMEI, Mauzo, Repairs</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { onSelectBranchType('laundry'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      currentBranchType === 'laundry' ? 'bg-teal-600/20 border border-teal-500/40 text-teal-200' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                      <Shirt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">2. GGS Laundry Service</div>
                      <div className="text-[11px] text-slate-400">Mahinakati Mwanza (0685947264)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { onSelectBranchType('wakala'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      currentBranchType === 'wakala' ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-200' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">3. M-Pesa & Wakala Kiosk</div>
                      <div className="text-[11px] text-slate-400">Cash in/out, Lipa Namba, Float</div>
                    </div>
                  </button>

                  <div className="h-px bg-slate-800 my-1"></div>

                  <button
                    onClick={() => { onSelectBranchType('boss'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      currentBranchType === 'boss' ? 'bg-amber-600/20 border border-amber-500/40 text-amber-200' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        Boss Central Dashboard
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-[11px] text-slate-400">Ripoti za ofisi zote tatu</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Controls: License, Lock Screen, Online/Offline Badge & Evening Cloud Sync */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* License / Subscription Button */}
          {onOpenLicenseModal && (
            <button
              onClick={onOpenLicenseModal}
              className="flex items-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/30 transition-all active:scale-95"
              title="Hali ya Leseni ya Mwezi (Subscription)"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline text-xs font-semibold">Leseni</span>
            </button>
          )}

          {/* Quick Lock / Logout Button */}
          {onLockScreen && (
            <button
              onClick={onLockScreen}
              className="flex items-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all active:scale-95"
              title="Funga Skrini / Badilisha PIN (Lock Screen)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-xs font-semibold">Funga</span>
            </button>
          )}

          {/* Offline / Online Badge */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={isOnline ? 'Umeunganishwa na Intaneti' : 'Huna Bando / Offline Mode (Data inahifadhiwa ndani ya simu)'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Offline</span>
              </>
            )}
          </div>

          {/* Evening Cloud Sync Button */}
          <button
            onClick={onOpenSyncModal}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-md ${
              pendingCount > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white animate-soft-pulse ring-2 ring-blue-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span className="hidden xs:inline font-bold">Sync</span>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
