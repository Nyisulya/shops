import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  History, 
  PlusCircle, 
  Kanban, 
  Users, 
  ArrowDownUp, 
  Scale, 
  ListOrdered,
  LayoutDashboard,
  BarChart3,
  Database,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import type { BranchType } from '../types';

interface BottomNavProps {
  branchType: BranchType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartCount?: number;
  readyLaundryCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  branchType,
  activeTab,
  onTabChange,
  cartCount = 0,
  readyLaundryCount = 0
}) => {
  const renderNavItems = () => {
    switch (branchType) {
      case 'phone':
        return [
          { id: 'pos', label: 'Mauzo (POS)', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
          { id: 'inventory', label: 'Stoo & Vifaa', icon: Package },
          { id: 'history', label: 'Historia', icon: History },
        ];
      case 'laundry':
        return [
          { id: 'new_order', label: 'Rekodi Mapato', icon: PlusCircle },
          { id: 'orders_list', label: 'Historia ya Mapato', icon: ListOrdered },
        ];
      case 'wakala':
        return [
          { id: 'quick_log', label: 'Kutoa / Kuweka', icon: ArrowDownUp },
          { id: 'day_balance', label: 'Usuluhishi (Float)', icon: Scale },
          { id: 'tx_history', label: 'Miamala ya Leo', icon: ListOrdered },
        ];
      case 'boss':
        return [
          { id: 'overview', label: 'Matawi', icon: LayoutDashboard },
          { id: 'reports', label: 'Ripoti & Faida', icon: BarChart3 },
          { id: 'inventory', label: 'Stoo & Bei', icon: Package },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'Matawi', icon: LayoutDashboard },
          { id: 'reports', label: 'Ripoti & Faida', icon: BarChart3 },
          { id: 'inventory', label: 'Stoo & Bei', icon: Package },
          { id: 'security', label: 'PIN & Usalama', icon: ShieldCheck },
          { id: 'data_backup', label: 'Backup & Mfumo', icon: Database },
        ];
    }
  };

  const navItems = renderNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {isActive && (
                <span className={`absolute -top-1.5 w-8 h-1 rounded-full animate-in fade-in zoom-in ${
                  branchType === 'admin' 
                    ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500'
                    : 'bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-500'
                }`} />
              )}
              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? branchType === 'admin'
                      ? 'bg-purple-600/25 text-purple-400 scale-110 shadow-lg shadow-purple-500/10'
                      : branchType === 'boss' 
                        ? 'bg-amber-500/25 text-amber-400 scale-110 shadow-lg shadow-amber-500/10' 
                        : 'bg-blue-600/25 text-blue-400 scale-110 shadow-lg shadow-blue-500/10' 
                    : ''
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm animate-bounce">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight line-clamp-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
