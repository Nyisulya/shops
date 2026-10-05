import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  Wrench, 
  History, 
  PlusCircle, 
  Kanban, 
  Users, 
  ArrowDownUp, 
  Scale, 
  ListOrdered,
  LayoutDashboard,
  BarChart3,
  Database
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
          { id: 'repairs', label: 'Matengenezo', icon: Wrench },
          { id: 'history', label: 'Historia', icon: History },
        ];
      case 'laundry':
        return [
          { id: 'new_order', label: 'Pokea Nguo', icon: PlusCircle },
          { id: 'pipeline', label: 'Hatua (Kanban)', icon: Kanban, badge: readyLaundryCount > 0 ? readyLaundryCount : undefined },
          { id: 'orders_list', label: 'Orodha ya Wateja', icon: Users },
        ];
      case 'wakala':
        return [
          { id: 'quick_log', label: 'Kutoa / Kuweka', icon: ArrowDownUp },
          { id: 'day_balance', label: 'Usuluhishi (Float)', icon: Scale },
          { id: 'tx_history', label: 'Miamala ya Leo', icon: ListOrdered },
        ];
      case 'boss':
        return [
          { id: 'overview', label: 'Matawi Yote', icon: LayoutDashboard },
          { id: 'comparison', label: 'Uchambuzi', icon: BarChart3 },
          { id: 'data_backup', label: 'Backup & Cloud', icon: Database },
        ];
    }
  };

  const navItems = renderNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-8 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 rounded-full animate-in fade-in zoom-in" />
              )}
              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600/25 text-blue-400 scale-110 shadow-lg shadow-blue-500/10' 
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
