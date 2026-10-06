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
  Lock, 
  KeyRound
} from 'lucide-react';
import type { Branch, BranchType } from '../types';
import { getPendingSyncCount } from '../services/syncService';
import { SHOPS } from './Auth/PinLogin';

interface HeaderProps {
  currentBranchType: BranchType;
  currentBranchId?: string;
  onSelectBranch?: (type: BranchType, branchId?: string) => void;
  branches: Branch[];
  onOpenSyncModal: () => void;
  onLockScreen?: () => void;
  onOpenLicenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBranchType,
  currentBranchId,
  onOpenSyncModal,
  onLockScreen,
  onOpenLicenseModal
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

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

  const getCurrentShopInfo = () => {
    if (currentBranchType === 'admin') {
      return { 
        id: 'admin',
        type: 'admin' as BranchType,
        name: 'Super Admin (Msimamizi Mkuu)', 
        sub: 'Usimamizi Mkuu, PIN & Backup', 
        defaultPin: '0000',
        icon: ShieldCheck, 
        color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
        bgGradient: 'from-purple-600 to-indigo-700',
        borderActive: 'border-purple-500 ring-2 ring-purple-500/40'
      };
    }
    if (currentBranchType === 'boss') {
      return { 
        id: 'boss',
        type: 'boss' as BranchType,
        name: 'Boss Central Dashboard', 
        sub: 'Ofisi Kuu ya Mmiliki', 
        defaultPin: '9999',
        icon: TrendingUp, 
        color: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
        bgGradient: 'from-amber-600 to-orange-700',
        borderActive: 'border-amber-500 ring-2 ring-amber-500/40'
      };
    }
    const found = SHOPS.find(s => s.id === currentBranchId) || SHOPS.find(s => s.type === currentBranchType) || SHOPS[0];
    return found;
  };

  const currentInfo = getCurrentShopInfo();
  const IconComponent = currentInfo.icon;
  const isBoss = currentBranchType === 'boss';
  const isAdmin = currentBranchType === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Active Shop Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-sm">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentInfo.bgGradient || (isAdmin ? 'from-purple-600 to-indigo-700' : isBoss ? 'from-amber-600 to-orange-700' : 'from-blue-600 to-indigo-700')} flex items-center justify-center shadow-md text-white shrink-0`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className={`text-[10px] uppercase font-extrabold tracking-wider ${isAdmin ? 'text-purple-400' : isBoss ? 'text-amber-400' : 'text-slate-400'}`}>
              {isAdmin ? '⚡ SUPER ADMIN' : isBoss ? '👑 Ofisi ya Boss' : 'Duka Lako'}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[150px] sm:max-w-[240px]">
              {currentInfo.name}
            </div>
          </div>
        </div>

        {/* Right Controls: License, Lock Screen, Online/Offline Badge & Evening Cloud Sync */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* License / Subscription Button (Boss & Admin) */}
          {onOpenLicenseModal && (isBoss || isAdmin) && (
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
              title="Funga Skrini / Ondoka (Lock Screen)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold">Funga</span>
            </button>
          )}

          {/* Offline / Online Badge */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={isOnline ? 'Umeunganishwa na Intaneti' : 'Huna Bando / Offline Mode'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="hidden sm:inline font-bold">Online</span>
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
